import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import type {
  Note,
  ActivityEntry,
  NoteStatus,
  SprintColumn,
} from "@/features/notes/types";
import type {
  Dashboard,
  Member,
  MemberRole,
} from "@/features/dashboards/types";
import { onAuthStateChanged } from "firebase/auth";
import {
  getFirebaseAuth,
  getFirebaseFirestore,
  isFirebaseReady,
} from "@/shared/firebase";
import { getBackendMode, makeId, nowIso, CURRENT_USER } from "./config";

/* ------------------------------- contratos ------------------------------- */

/** Novo tipo de entrada para notas (mesmo contrato das views). */
export type NewNoteInput = {
  title: string;
  content?: string;
  status?: NoteStatus;
  tags?: string[];
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  dashboardId?: string;
  /** Sprint do quadro em que a nota nasce (opcional). */
  sprintId?: string;
};

const NOTES = "notes";
const SPRINTS = "sprints";
const DASHBOARDS = "dashboards";
const MEMBERS = "members";
const ACTIVITY = "activity";

/** Campos da nota que podem ser limpos (undefined vira null no banco). */
const CLEARABLE_FIELDS = new Set([
  "assignee",
  "startDate",
  "dueDate",
  "dashboardId",
]);

/** Campo no formato do app → nome do campo no documento do Firestore. */
const FIELD_MAP: Record<string, string> = {
  startDate: "start_date",
  dueDate: "due_date",
  dashboardId: "dashboard_id",
};

/**
 * Converte o patch da view para o contrato do banco: chaves presentes com
 * `undefined` em campos limpáveis viram `null` (semântica de "limpar campo");
 * chaves ausentes são preservadas.
 */
function normalizeNotePatch(patch: Partial<NewNoteInput>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    // Campos com nome diferente no documento (snake_case).
    const field = FIELD_MAP[key] ?? key;
    if (value === undefined && CLEARABLE_FIELDS.has(key)) {
      out[field] = null;
    } else if (value !== undefined) {
      out[field] = value;
    }
  }
  return out;
}

/* -------------------------------- helpers -------------------------------- */

function db() {
  return getFirebaseFirestore();
}

/**
 * Erro de leitura do Firestore: quase sempre é a regra de segurança do
 * projeto negando acesso. Loga uma mensagem acionável e devolve lista vazia.
 */
function reportQueryError(name: string, error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "unknown";
  if (code === "permission-denied") {
    console.error(
      `Firestore negou a leitura de "${name}" (permission-denied). ` +
        "Ajuste as regras do projeto para permitir usuários autenticados.",
    );
    return;
  }
  console.error(`Falha ao ler "${name}" no Firestore:`, error);
}

function firestoreCollection(name: string) {
  const firestore = db();
  if (!firestore) return null;
  return collection(firestore, name);
}

function isoOf(value: unknown, fallback: string): string {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (typeof value === "string" && value.length > 0) return value;
  return fallback;
}

function fromNoteDoc(id: string, data: Record<string, unknown>): Note {
  return {
    id,
    title: String(data.title ?? ""),
    content: String(data.content ?? ""),
    status: (data.status as NoteStatus) ?? "not_started",
    tags: Array.isArray(data.tags) ? (data.tags as string[]) : [],
    assignee: data.assignee != null ? String(data.assignee) : undefined,
    startDate: data.start_date != null ? String(data.start_date) : undefined,
    dueDate: data.due_date != null ? String(data.due_date) : undefined,
    dashboardId:
      data.dashboard_id != null ? String(data.dashboard_id) : undefined,
    createdAt: isoOf(data.created_at, nowIso()),
    updatedAt: isoOf(data.updated_at, nowIso()),
    updatedBy: data.updated_by != null ? String(data.updated_by) : undefined,
    order: data.order != null ? Number(data.order) : undefined,
    sprintId: data.sprint_id != null ? String(data.sprint_id) : undefined,
  };
}

function toNoteDoc(input: NewNoteInput, id: string, actor: string, now: string) {
  return {
    id,
    title: input.title,
    content: input.content ?? "",
    status: input.status ?? "not_started",
    tags: input.tags ?? [],
    assignee: input.assignee ?? null,
    start_date: input.startDate ?? null,
    due_date: input.dueDate ?? null,
    dashboard_id: input.dashboardId ?? null,
    sprint_id: input.sprintId ?? null,
    created_at: now,
    updated_at: now,
    updated_by: actor,
  };
}

async function logActivity(
  noteId: string,
  noteTitle: string,
  action: ActivityEntry["action"],
  actor: string,
) {
  const col = firestoreCollection(ACTIVITY);
  if (!col) return;
  try {
    await setDoc(doc(col, makeId("act")), {
      note_id: noteId,
      note_title: noteTitle,
      action,
      actor,
      at: nowIso(),
    });
  } catch {
    // Atividade é secundária: falhar aqui não deve quebrar a mutation.
  }
}

/* ------------------------------ queries ------------------------------ */

/**
 * UID do usuário autenticado no Firebase (`null` sem sessão).
 *
 * É dependência de todas as assinaturas do Firestore: um listener aberto
 * antes do login é recusado pelas regras (`permission-denied`) e morre. Sem
 * esta dependência, a primeira visita ao site ficava vazia até um refresh,
 * porque as coleções nunca eram reassinadas depois do login.
 */
export function useFirebaseUid(): string | null {
  const isFirebase = getBackendMode() === "firebase";
  const [uid, setUid] = useState<string | null>(
    () => getFirebaseAuth()?.currentUser?.uid ?? null,
  );

  useEffect(() => {
    if (!isFirebase) return;
    const auth = getFirebaseAuth();
    if (!auth) return;
    setUid(auth.currentUser?.uid ?? null);
    return onAuthStateChanged(auth, (user) => setUid(user?.uid ?? null));
  }, [isFirebase]);

  return uid;
}

/** Notas do Firestore, ordenadas por criação (mais recentes primeiro). */
export function useNotesQuery(): Note[] {
  const firestore = db();
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!isFirebase || !firestore || !uid) return;
    const col = firestoreCollection(NOTES);
    if (!col) return;

    const q = query(col, orderBy("created_at", "desc"));
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snapshot) => {
        setNotes(
          snapshot.docs.map((d) =>
            fromNoteDoc(d.id, d.data() as Record<string, unknown>),
          ),
        );
      },
      (error) => {
        reportQueryError(NOTES, error);
        setNotes([]);
      },
    );
    return () => unsub();
  }, [isFirebase, firestore, uid]);

  return notes;
}

/** Carregamento da lista (cache local do Firestore conta como carregando). */
export function useNotesLoading(): boolean {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [loading, setLoading] = useState(isFirebase);

  useEffect(() => {
    if (!isFirebase) {
      setLoading(false);
      return;
    }
    // Sem sessão ainda: segue "carregando" até o login terminar, em vez de
    // assinar a coleção e receber permission-denied.
    if (!uid) {
      setLoading(true);
      return;
    }
    const col = firestoreCollection(NOTES);
    if (!col) {
      setLoading(false);
      return;
    }

    const q = query(col, orderBy("created_at", "desc"));
    let mounted = true;
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (mounted) setLoading(false);
      },
      (error) => {
        reportQueryError(NOTES, error);
        if (mounted) setLoading(false);
      },
    );
    return () => {
      mounted = false;
      unsub();
    };
  }, [isFirebase, uid]);

  return loading;
}

/** Atividade recente (edições colaborativas). */
export function useActivityQuery(): ActivityEntry[] {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    if (!isFirebase || !uid) return;
    const col = firestoreCollection(ACTIVITY);
    if (!col) return;

    const q = query(col, orderBy("at", "desc"));
    const unsub = onSnapshot(
      q,
      {},
      (snapshot) => {
        setActivity(
          snapshot.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              noteId: String(data.note_id ?? ""),
              noteTitle: String(data.note_title ?? ""),
              action: (data.action as ActivityEntry["action"]) ?? "updated",
              actor: String(data.actor ?? CURRENT_USER),
              at: isoOf(data.at, nowIso()),
            };
          }),
        );
      },
      (error) => {
        reportQueryError(ACTIVITY, error);
        setActivity([]);
      },
    );
    return () => unsub();
  }, [isFirebase, uid]);

  return activity;
}

/** Mapa de ordem do Kanban (id → posição), persistido junto da nota. */
export function useNotesOrderQuery(): Record<string, number> {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [order, setOrder] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isFirebase || !uid) return;
    const col = firestoreCollection(NOTES);
    if (!col) return;

    const q = query(col, orderBy("order", "asc"));
    const unsub = onSnapshot(
      q,
      {},
      (snapshot) => {
        const orderMap: Record<string, number> = {};
        for (const d of snapshot.docs) {
          const value = (d.data() as Record<string, unknown>).order;
          if (typeof value === "number") orderMap[d.id] = value;
        }
        setOrder(orderMap);
      },
      (error) => {
        reportQueryError(NOTES, error);
        setOrder({});
      },
    );
    return () => unsub();
  }, [isFirebase, uid]);

  return order;
}

/** Dashboards (projetos) do Firestore. */
export function useDashboardsQuery(): Dashboard[] {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);

  useEffect(() => {
    if (!isFirebase || !uid) return;
    const col = firestoreCollection(DASHBOARDS);
    if (!col) return;

    const q = query(col, orderBy("created_at", "desc"));
    const unsub = onSnapshot(
      q,
      {},
      (snapshot) => {
        setDashboards(
          snapshot.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              name: String(data.name ?? ""),
              description: String(data.description ?? ""),
              createdAt: isoOf(data.created_at, nowIso()),
              updatedAt: isoOf(data.updated_at, nowIso()),
            };
          }),
        );
      },
      (error) => {
        reportQueryError(DASHBOARDS, error);
        setDashboards([]);
      },
    );
    return () => unsub();
  }, [isFirebase, uid]);

  return dashboards;
}

/** Membros convidados por dashboard. */
export function useMembersQuery(): Member[] {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!isFirebase || !uid) return;
    const col = firestoreCollection(MEMBERS);
    if (!col) return;

    const q = query(col, orderBy("invited_at", "desc"));
    const unsub = onSnapshot(
      q,
      {},
      (snapshot) => {
        setMembers(
          snapshot.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return {
              id: d.id,
              name: String(data.name ?? ""),
              email: String(data.email ?? ""),
              role: (data.role as MemberRole) ?? "viewer",
              dashboardId:
                data.dashboard_id != null ? String(data.dashboard_id) : "",
              invitedAt: isoOf(data.invited_at, nowIso()),
            };
          }),
        );
      },
      (error) => {
        reportQueryError(MEMBERS, error);
        setMembers([]);
      },
    );
    return () => unsub();
  }, [isFirebase, uid]);

  return members;
}

/**
 * Sprints do quadro (colunas criadas pelo usuário). Ficam na coleção
 * `sprints`, ordenados pela criação — assim todos os usuários do workspace
 * veem as mesmas colunas.
 */
export function useSprintsQuery(): SprintColumn[] {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [sprints, setSprints] = useState<SprintColumn[]>([]);

  useEffect(() => {
    if (!isFirebase || !uid) return;
    const col = firestoreCollection(SPRINTS);
    if (!col) return;

    const q = query(col, orderBy("created_at", "asc"));
    const unsub = onSnapshot(
      q,
      {},
      (snapshot) => {
        setSprints(
          snapshot.docs.map((d) => {
            const data = d.data() as Record<string, unknown>;
            return { id: d.id, title: String(data.title ?? "") };
          }),
        );
      },
      (error) => {
        reportQueryError(SPRINTS, error);
        setSprints([]);
      },
    );
    return () => unsub();
  }, [isFirebase, uid]);

  return sprints;
}

/* ------------------------------ mutations ------------------------------ */

export function useSprintMutations() {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();

  return useMemo(
    () => ({
      /** Cria a coluna do sprint com o id gerado no cliente. */
      addSprint: async (column: SprintColumn) => {
        if (!isFirebase) return;
        const col = firestoreCollection(SPRINTS);
        if (!col) return;
        await setDoc(doc(col, column.id), {
          id: column.id,
          title: column.title,
          created_at: nowIso(),
        });
      },

      renameSprint: async (id: string, title: string) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        await updateDoc(doc(firestore, SPRINTS, id), { title });
      },

      /**
       * Remove a coluna e desvincula as notas: nenhuma nota é apagada — ela
       * volta para a coluna do seu status, como no modo local.
       */
      removeSprint: async (id: string) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        await deleteDoc(doc(firestore, SPRINTS, id));

        const notesCol = firestoreCollection(NOTES);
        if (!notesCol) return;
        const snap = await getDocs(notesCol);
        await Promise.all(
          snap.docs
            .filter(
              (d) => (d.data() as Record<string, unknown>).sprint_id === id,
            )
            .map((d) => updateDoc(d.ref, { sprint_id: null })),
        );
      },

      /** Vincula (ou desvincula) a nota a um sprint do quadro. */
      setNoteSprint: async (noteId: string, sprintId: string | null) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        await updateDoc(doc(firestore, NOTES, noteId), {
          sprint_id: sprintId,
        });
      },
    }),
    [isFirebase],
  );
}

export function useNoteMutations() {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();

  return useMemo(
    () => ({
      /** Cria a nota com o id gerado no cliente (idempotente). */
      createNote: async (input: NewNoteInput, id: string = makeId("note")) => {
        if (!isFirebase) return;
        const col = firestoreCollection(NOTES);
        if (!col) return;
        const now = nowIso();
        await setDoc(doc(col, id), toNoteDoc(input, id, CURRENT_USER, now));
        await logActivity(id, input.title, "created", CURRENT_USER);
      },

      /** Atualiza campos da nota (undefined em campos limpáveis = null). */
      updateNote: async (id: string, patch: Partial<NewNoteInput>) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        const payload = normalizeNotePatch(patch);
        payload.updated_at = nowIso();
        payload.updated_by = CURRENT_USER;
        await updateDoc(doc(firestore, NOTES, id), payload);
        await logActivity(
          id,
          patch.title ?? "",
          patch.status !== undefined ? "status_changed" : "updated",
          CURRENT_USER,
        );
      },

      /** Move a nota de coluna e grava a posição no Kanban. */
      moveNote: async (id: string, status: NoteStatus, order?: number) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        await updateDoc(doc(firestore, NOTES, id), {
          status,
          order: order ?? null,
          updated_at: nowIso(),
          updated_by: CURRENT_USER,
        });
        await logActivity(id, "", "moved", CURRENT_USER);
      },

      /** Remove a nota (e registra a atividade com o título removido). */
      deleteNote: async (id: string) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        const ref = doc(firestore, NOTES, id);
        let title = "";
        try {
          const snap = await getDoc(ref);
          if (snap.exists()) title = String(snap.data().title ?? "");
        } catch {
          // Sem leitura não há título para a atividade; segue com a remoção.
        }
        await deleteDoc(ref);
        await logActivity(id, title, "deleted", CURRENT_USER);
      },
    }),
    [isFirebase],
  );
}

export function useDashboardMutations() {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();

  return useMemo(
    () => ({
      createDashboard: async (
        input: { name: string; description?: string },
        id: string = makeId("dash"),
      ) => {
        if (!isFirebase) return;
        const col = firestoreCollection(DASHBOARDS);
        if (!col) return;
        const now = nowIso();
        await setDoc(doc(col, id), {
          id,
          name: input.name,
          description: input.description ?? "",
          created_at: now,
          updated_at: now,
        });
      },

      updateDashboard: async (
        id: string,
        patch: { name?: string; description?: string },
      ) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        const payload: Record<string, unknown> = { updated_at: nowIso() };
        if (patch.name !== undefined) payload.name = patch.name;
        if (patch.description !== undefined)
          payload.description = patch.description;
        await updateDoc(doc(firestore, DASHBOARDS, id), payload);
      },

      /** Remove o dashboard, seus membros e desvincula as notas dele. */
      deleteDashboard: async (id: string) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        await deleteDoc(doc(firestore, DASHBOARDS, id));

        const membersCol = firestoreCollection(MEMBERS);
        if (membersCol) {
          const snap = await getDocs(membersCol);
          await Promise.all(
            snap.docs
              .filter(
                (d) => (d.data() as Record<string, unknown>).dashboard_id === id,
              )
              .map((d) => deleteDoc(d.ref)),
          );
        }

        const notesCol = firestoreCollection(NOTES);
        if (notesCol) {
          const snap = await getDocs(notesCol);
          await Promise.all(
            snap.docs
              .filter(
                (d) => (d.data() as Record<string, unknown>).dashboard_id === id,
              )
              .map((d) => updateDoc(d.ref, { dashboard_id: null })),
          );
        }
      },

      addMember: async (
        input: {
          name: string;
          email: string;
          role: MemberRole;
          dashboardId: string;
        },
        id: string = makeId("member"),
      ) => {
        if (!isFirebase) return;
        const col = firestoreCollection(MEMBERS);
        if (!col) return;
        await setDoc(doc(col, id), {
          id,
          name: input.name,
          email: input.email,
          role: input.role,
          dashboard_id: input.dashboardId,
          invited_at: nowIso(),
        });
      },

      updateMemberRole: async (id: string, role: MemberRole) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        await updateDoc(doc(firestore, MEMBERS, id), { role });
      },

      removeMember: async (id: string) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        await deleteDoc(doc(firestore, MEMBERS, id));
      },
    }),
    [isFirebase],
  );
}

/* -------------------------------- seed -------------------------------- */

/**
 * Popula o workspace uma vez, quando o Firestore está vazio. IDs fixos tornam
 * a operação idempotente — rodar duas vezes não duplica documentos.
 */
export function useSeedOnMount(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    if (getBackendMode() !== "firebase") return;
    if (!isFirebaseReady()) return;

    let cancelled = false;
    void seedWorkspace().catch((error) => {
      if (!cancelled) console.error("Seed do Firestore falhou:", error);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);
}

export async function seedWorkspace(): Promise<void> {
  const dashboards = firestoreCollection(DASHBOARDS);
  const notes = firestoreCollection(NOTES);
  const members = firestoreCollection(MEMBERS);
  const activity = firestoreCollection(ACTIVITY);
  if (!dashboards || !notes || !members || !activity) return;

  const existing = await getDocs(dashboards);
  if (!existing.empty) return;

  const now = nowIso();

  const dashboardsSeed: Dashboard[] = [
    {
      id: "dash-seed-1",
      name: "Experimento A — Coleta",
      description: "Rotina de coleta e preparação de amostras.",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "dash-seed-2",
      name: "Análises e Relatórios",
      description: "Resultados, curvas de calibração e relatórios.",
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const item of dashboardsSeed) {
    await setDoc(doc(dashboards, item.id), {
      name: item.name,
      description: item.description,
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    });
  }

  const notesSeed: Array<[string, NewNoteInput, string]> = [
    [
      "note-seed-1",
      {
        title: "Coletar amostras do experimento A",
        content: "Preparar tubos, rotular e registrar temperatura ambiente.",
        status: "in_progress",
        tags: ["laboratório", "coleta"],
        assignee: "Ana Costa",
        startDate: "2026-09-10",
        dueDate: "2026-09-18",
        dashboardId: "dash-seed-1",
      },
      "Bruno Lima",
    ],
    [
      "note-seed-2",
      {
        title: "Revisar resultados da análise B",
        content: "Conferir duplicatas e validar curva de calibração.",
        status: "not_started",
        tags: ["análise"],
        assignee: "Bruno Lima",
        startDate: "2026-09-15",
        dueDate: "2026-09-22",
        dashboardId: "dash-seed-2",
      },
      "Ana Costa",
    ],
    [
      "note-seed-3",
      {
        title: "Pedir reposição de reagentes",
        content: "Buffer PBS e reagente C estão acabando.",
        status: "blocked",
        tags: ["suprimentos"],
        dashboardId: "dash-seed-1",
      },
      "Ana Costa",
    ],
  ];

  for (const [id, input, actor] of notesSeed) {
    await setDoc(doc(notes, id), toNoteDoc(input, id, actor, now));
  }

  const membersSeed: Member[] = [
    {
      id: "member-seed-1",
      name: "Ana Costa",
      email: "ana@lab.local",
      role: "admin",
      dashboardId: "dash-seed-1",
      invitedAt: now,
    },
    {
      id: "member-seed-2",
      name: "Bruno Lima",
      email: "bruno@lab.local",
      role: "editor",
      dashboardId: "dash-seed-1",
      invitedAt: now,
    },
    {
      id: "member-seed-3",
      name: "Carla Dias",
      email: "carla@lab.local",
      role: "viewer",
      dashboardId: "dash-seed-2",
      invitedAt: now,
    },
  ];

  for (const member of membersSeed) {
    await setDoc(doc(members, member.id), {
      name: member.name,
      email: member.email,
      role: member.role,
      dashboard_id: member.dashboardId,
      invited_at: member.invitedAt,
    });
  }

  await setDoc(doc(activity, "act-seed-1"), {
    note_id: "note-seed-1",
    note_title: "Coletar amostras do experimento A",
    action: "created",
    actor: "Ana Costa",
    at: now,
  });
}
