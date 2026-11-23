import { useEffect, useMemo, useState } from "react";
import {
  collection,
  query,
  orderBy,
  where,
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
  SiteUser,
} from "@/features/dashboards/types";
import { normalizeMemberRole } from "@/features/dashboards/types";
import { onAuthStateChanged } from "firebase/auth";
import {
  getFirebaseAuth,
  getFirebaseFirestore,
  isFirebaseReady,
} from "@/shared/firebase";
import { getBackendMode, makeId, nowIso } from "./config";

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
const USERS = "users";
const ADMIN_REQUESTS = "admin_requests";

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

/** UID da sessão atual (`null` sem login). */
function currentUid(): string | null {
  return getFirebaseAuth()?.currentUser?.uid ?? null;
}

/** Nome de exibição usado em `actor`/`updated_by`. */
function actorName(): string {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) return "Sistema";
  return user.displayName || (user.email ?? "Usuário").split("@")[0];
}

function actorEmail(): string {
  return getFirebaseAuth()?.currentUser?.email ?? "";
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
        "Verifique se as regras publicadas já são o modelo por projeto.",
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

function toNoteDoc(
  input: NewNoteInput,
  id: string,
  actor: string,
  now: string,
  ownerUid: string,
  memberUids: string[],
) {
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
    owner_uid: ownerUid,
    member_uids: memberUids,
    created_at: now,
    updated_at: now,
    updated_by: actor,
  };
}

/** Membros do projeto (`member_uids`) usados como lista de acesso da nota. */
async function projectMemberUids(
  dashboardId: string,
  fallbackUid: string,
): Promise<string[]> {
  const firestore = db();
  if (!firestore) return [fallbackUid];
  try {
    const snap = await getDoc(doc(firestore, DASHBOARDS, dashboardId));
    if (snap.exists()) {
      const list = (snap.data() as Record<string, unknown>).member_uids;
      if (Array.isArray(list) && list.length > 0) {
        return Array.from(new Set([...list.map(String), fallbackUid]));
      }
    }
  } catch {
    // Sem leitura do projeto: a nota fica restrita a quem a criou.
  }
  return [fallbackUid];
}

async function logActivity(
  entry: {
    noteId: string;
    noteTitle: string;
    action: ActivityEntry["action"];
    dashboardId?: string | null;
    memberUids?: string[];
  },
) {
  const col = firestoreCollection(ACTIVITY);
  const uid = currentUid();
  if (!col || !uid) return;
  try {
    await setDoc(doc(col, makeId("act")), {
      note_id: entry.noteId,
      note_title: entry.noteTitle,
      action: entry.action,
      actor: actorName(),
      actor_uid: uid,
      dashboard_id: entry.dashboardId ?? null,
      member_uids: entry.memberUids ?? [uid],
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
 * antes do login é recusado pelas regras (`permission-denied`) e morre.
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

/**
 * Notas visíveis ao usuário: as de projetos em que ele figura em
 * `member_uids` (o filtro torna a consulta provável pelas regras).
 *
 * Sem `orderBy` de propósito: `array-contains` + ordenação exigiria índice
 * composto, então a ordenação é feita no cliente.
 */
export function useNotesQuery(): Note[] {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    if (!isFirebase || !uid) return;
    const col = firestoreCollection(NOTES);
    if (!col) return;

    const q = query(col, where("member_uids", "array-contains", uid));
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: false },
      (snapshot) => {
        const next = snapshot.docs.map((d) =>
          fromNoteDoc(d.id, d.data() as Record<string, unknown>),
        );
        next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setNotes(next);
      },
      (error) => {
        reportQueryError(NOTES, error);
        setNotes([]);
      },
    );
    return () => unsub();
  }, [isFirebase, uid]);

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

    const q = query(col, where("member_uids", "array-contains", uid));
    let mounted = true;
    const unsub = onSnapshot(
      q,
      { includeMetadataChanges: true },
      () => {
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

/** Atividade recente visível ao usuário (por projeto). */
export function useActivityQuery(): ActivityEntry[] {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    if (!isFirebase || !uid) return;
    const col = firestoreCollection(ACTIVITY);
    if (!col) return;

    const q = query(col, where("member_uids", "array-contains", uid));
    const unsub = onSnapshot(
      q,
      {},
      (snapshot) => {
        const next = snapshot.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            noteId: String(data.note_id ?? ""),
            noteTitle: String(data.note_title ?? ""),
            action: (data.action as ActivityEntry["action"]) ?? "updated",
            actor: String(data.actor ?? ""),
            at: isoOf(data.at, nowIso()),
            projectId:
              data.dashboard_id != null
                ? String(data.dashboard_id)
                : undefined,
          };
        });
        next.sort((a, b) => b.at.localeCompare(a.at));
        setActivity(next);
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

    const q = query(col, where("member_uids", "array-contains", uid));
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

/** Projetos (dashboards) em que o usuário é membro. */
export function useDashboardsQuery(): Dashboard[] {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);

  useEffect(() => {
    if (!isFirebase || !uid) return;
    const col = firestoreCollection(DASHBOARDS);
    if (!col) return;

    const q = query(col, where("member_uids", "array-contains", uid));
    const unsub = onSnapshot(
      q,
      {},
      (snapshot) => {
        const next = snapshot.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            name: String(data.name ?? ""),
            description: String(data.description ?? ""),
            ownerUid: data.owner_uid != null ? String(data.owner_uid) : undefined,
            createdAt: isoOf(data.created_at, nowIso()),
            updatedAt: isoOf(data.updated_at, nowIso()),
          };
        });
        next.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        setDashboards(next);
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

/** Membros (papéis por projeto) — diretório legível por qualquer conta. */
export function useMembersQuery(): Member[] {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!isFirebase || !uid) return;
    const col = firestoreCollection(MEMBERS);
    if (!col) return;

    const unsub = onSnapshot(
      col,
      {},
      (snapshot) => {
        const next = snapshot.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            uid: data.uid != null ? String(data.uid) : undefined,
            name: String(data.name ?? ""),
            email: String(data.email ?? ""),
            // Papel inválido no documento vira null; a UI trata como leitor,
            // mas `server_admin` gravado por engano continua sendo admin.
            role: normalizeMemberRole(data.role) ?? "viewer",
            dashboardId:
              data.dashboard_id != null ? String(data.dashboard_id) : "",
            invitedAt: isoOf(data.invited_at, nowIso()),
          };
        });
        next.sort((a, b) => b.invitedAt.localeCompare(a.invitedAt));
        setMembers(next);
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

/** Diretório de contas do site (nome/e-mail) para convidar por e-mail. */
export function useSiteUsersQuery(): SiteUser[] {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [users, setUsers] = useState<SiteUser[]>([]);

  useEffect(() => {
    if (!isFirebase || !uid) return;
    const col = firestoreCollection(USERS);
    if (!col) return;

    const unsub = onSnapshot(
      col,
      {},
      (snapshot) => {
        const next = snapshot.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            uid: d.id,
            name: String(data.name ?? ""),
            email: String(data.email ?? ""),
            banned: data.banned === true,
          };
        });
        next.sort((a, b) => a.name.localeCompare(b.name));
        setUsers(next);
      },
      (error) => {
        reportQueryError(USERS, error);
        setUsers([]);
      },
    );
    return () => unsub();
  }, [isFirebase, uid]);

  return users;
}

/**
 * Sprints do quadro (colunas criadas pelo usuário). Ficam na coleção
 * `sprints`, ordenados pela criação — estrutura compartilhada do workspace.
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

/**
 * Garante que o perfil (`users/{uid}`) existe antes de uma escrita.
 *
 * Com o app entrando direto (sem esperar o perfil), uma conta recém-criada
 * pode clicar em "Novo projeto" antes do documento existir — as regras negam
 * porque `isRegistered()` ainda é falso. Esta chamada é idempotente.
 */
async function ensureProfileReady(): Promise<void> {
  try {
    await ensureUserProfile();
  } catch (error) {
    // Token antigo (sem `email_verified`) é a causa mais comum: atualiza e
    // tenta de novo antes de desistir.
    try {
      await getFirebaseAuth()?.currentUser?.getIdToken(true);
      await ensureUserProfile();
    } catch (retryError) {
      console.error("Provisionamento do perfil falhou:", retryError, error);
    }
  }
}

/** Erro de permissão do Firestore (regra negou a operação). */
function isPermissionDenied(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code) === "permission-denied";
  }
  return false;
}

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

        const uid = currentUid();
        const notesCol = firestoreCollection(NOTES);
        if (!notesCol || !uid) return;
        const snap = await getDocs(
          query(notesCol, where("member_uids", "array-contains", uid)),
        );
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
        const uid = currentUid();
        if (!col || !uid) return;
        const now = nowIso();
        const memberUids = input.dashboardId
          ? await projectMemberUids(input.dashboardId, uid)
          : [uid];
        await setDoc(
          doc(col, id),
          toNoteDoc(input, id, actorName(), now, uid, memberUids),
        );
        await logActivity({
          noteId: id,
          noteTitle: input.title,
          action: "created",
          dashboardId: input.dashboardId ?? null,
          memberUids,
        });
      },

      /** Atualiza campos da nota (undefined em campos limpáveis = null). */
      updateNote: async (id: string, patch: Partial<NewNoteInput>) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        const uid = currentUid();
        const ref = doc(firestore, NOTES, id);

        // Estado atual: define o dono da nota e a atividade registrada.
        let current: Record<string, unknown> = {};
        try {
          const snap = await getDoc(ref);
          if (snap.exists()) current = snap.data() as Record<string, unknown>;
        } catch {
          // Sem leitura, a nota é tratada como pessoal do usuário atual.
        }

        const payload = normalizeNotePatch(patch);
        payload.updated_at = nowIso();
        payload.updated_by = actorName();

        // Mudou de projeto (ou deixou de ter um): a lista de acesso acompanha
        // — entra nos membros do projeto, ou volta a ser pessoal do criador.
        if (patch.dashboardId !== undefined) {
          if (patch.dashboardId && uid) {
            payload.member_uids = await projectMemberUids(patch.dashboardId, uid);
          } else {
            const owner =
              current.owner_uid != null ? String(current.owner_uid) : uid;
            payload.member_uids = owner ? [owner] : [];
          }
        }

        const dashboardId =
          patch.dashboardId !== undefined
            ? (patch.dashboardId ?? null)
            : current.dashboard_id != null
              ? String(current.dashboard_id)
              : null;

        await updateDoc(ref, payload);
        await logActivity({
          noteId: id,
          noteTitle: patch.title ?? "",
          action: patch.status !== undefined ? "status_changed" : "updated",
          dashboardId,
        });
      },

      /** Move a nota de coluna e grava a posição no Kanban. */
      moveNote: async (id: string, status: NoteStatus, order?: number) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        const ref = doc(firestore, NOTES, id);
        let dashboardId: string | null = null;
        try {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data() as Record<string, unknown>;
            dashboardId = data.dashboard_id != null ? String(data.dashboard_id) : null;
          }
        } catch {
          // Sem leitura, a atividade fica sem projeto.
        }
        await updateDoc(ref, {
          status,
          order: order ?? null,
          updated_at: nowIso(),
          updated_by: actorName(),
        });
        await logActivity({
          noteId: id,
          noteTitle: "",
          action: "moved",
          dashboardId,
        });
      },

      /** Remove a nota (e registra a atividade com o título removido). */
      deleteNote: async (id: string) => {
        if (!isFirebase) return;
        const firestore = db();
        if (!firestore) return;
        const ref = doc(firestore, NOTES, id);
        let title = "";
        let dashboardId: string | null = null;
        let memberUids: string[] | undefined;
        try {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data() as Record<string, unknown>;
            title = String(data.title ?? "");
            dashboardId = data.dashboard_id != null ? String(data.dashboard_id) : null;
            if (Array.isArray(data.member_uids)) {
              memberUids = data.member_uids.map(String);
            }
          }
        } catch {
          // Sem leitura não há título para a atividade; segue com a remoção.
        }
        await deleteDoc(ref);
        await logActivity({
          noteId: id,
          noteTitle: title,
          action: "deleted",
          dashboardId,
          memberUids,
        });
      },
    }),
    [isFirebase],
  );
}

/**
 * Atualiza a lista de acesso (`member_uids`) do projeto, das notas e da
 * atividade — é ela que as regras e as consultas usam.
 */
async function syncProjectMemberUids(
  projectId: string,
  memberUids: string[],
): Promise<void> {
  const firestore = db();
  const uid = currentUid();
  if (!firestore || !uid) return;
  const unique = Array.from(new Set([...memberUids, uid]));

  await updateDoc(doc(firestore, DASHBOARDS, projectId), {
    member_uids: unique,
    updated_at: nowIso(),
  });

  const notesCol = firestoreCollection(NOTES);
  if (notesCol) {
    const snap = await getDocs(
      query(notesCol, where("member_uids", "array-contains", uid)),
    );
    await Promise.all(
      snap.docs
        .filter(
          (d) =>
            (d.data() as Record<string, unknown>).dashboard_id === projectId,
        )
        .map((d) => updateDoc(d.ref, { member_uids: unique })),
    );
  }

  const activityCol = firestoreCollection(ACTIVITY);
  if (activityCol) {
    const snap = await getDocs(
      query(activityCol, where("member_uids", "array-contains", uid)),
    );
    await Promise.all(
      snap.docs
        .filter(
          (d) =>
            (d.data() as Record<string, unknown>).dashboard_id === projectId,
        )
        .map((d) => updateDoc(d.ref, { member_uids: unique })),
    );
  }
}

export function useDashboardMutations() {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();

  return useMemo(
    () => ({
      /**
       * Cria o projeto e registra o criador como admin dele na mesma ação
       * (o documento de membro tem id determinístico `{projeto}_{uid}`).
       */
      createDashboard: async (
        input: { name: string; description?: string },
        id: string = makeId("dash"),
      ) => {
        if (!isFirebase) return;
        const col = firestoreCollection(DASHBOARDS);
        const uid = currentUid();
        if (!col || !uid) return;
        const now = nowIso();
        const membersCol = firestoreCollection(MEMBERS);

        const write = async () => {
          await setDoc(doc(col, id), {
            id,
            name: input.name,
            description: input.description ?? "",
            owner_uid: uid,
            member_uids: [uid],
            created_at: now,
            updated_at: now,
          });

          if (!membersCol) return;
          await setDoc(doc(membersCol, `${id}_${uid}`), {
            uid,
            name: actorName(),
            email: actorEmail(),
            role: "admin",
            dashboard_id: id,
            invited_at: now,
          });
        };

        // Perfil primeiro: as regras só aceitam escrita de conta registrada.
        await ensureProfileReady();
        try {
          await write();
        } catch (error) {
          if (!isPermissionDenied(error)) throw error;
          // Perfil criado agora há pouco pelo outro dispositivo/aba: tenta
          // mais uma vez depois de garantir o documento.
          await ensureProfileReady();
          await write();
        }
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

      /** Remove o projeto, seus vínculos e devolve as notas ao criador. */
      deleteDashboard: async (id: string) => {
        if (!isFirebase) return;
        const firestore = db();
        const uid = currentUid();
        if (!firestore || !uid) return;

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
          const snap = await getDocs(
            query(notesCol, where("member_uids", "array-contains", uid)),
          );
          await Promise.all(
            snap.docs
              .filter(
                (d) => (d.data() as Record<string, unknown>).dashboard_id === id,
              )
              .map((d) => {
                const data = d.data() as Record<string, unknown>;
                const owner =
                  data.owner_uid != null ? String(data.owner_uid) : uid;
                return updateDoc(d.ref, {
                  dashboard_id: null,
                  member_uids: [owner],
                });
              }),
          );
        }

        await deleteDoc(doc(firestore, DASHBOARDS, id));
      },

      /** Convida (ou atualiza) um usuário do site em um projeto. */
      addMember: async (input: {
        uid: string;
        name: string;
        email: string;
        role: MemberRole;
        dashboardId: string;
      }) => {
        if (!isFirebase) return;
        const firestore = db();
        const actorUid = currentUid();
        if (!firestore || !actorUid) return;

        const memberId = `${input.dashboardId}_${input.uid}`;
        await setDoc(doc(firestore, MEMBERS, memberId), {
          uid: input.uid,
          name: input.name,
          email: input.email,
          role: input.role,
          dashboard_id: input.dashboardId,
          invited_at: nowIso(),
        });

        const dashRef = doc(firestore, DASHBOARDS, input.dashboardId);
        const snap = await getDoc(dashRef);
        const current = snap.exists()
          ? ((snap.data() as Record<string, unknown>).member_uids as unknown[])
          : [];
        const list = Array.isArray(current) ? current.map(String) : [];
        await syncProjectMemberUids(input.dashboardId, [...list, input.uid]);
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
        const ref = doc(firestore, MEMBERS, id);
        let dashboardId: string | null = null;
        let removedUid: string | null = null;
        try {
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = snap.data() as Record<string, unknown>;
            dashboardId =
              data.dashboard_id != null ? String(data.dashboard_id) : null;
            removedUid = data.uid != null ? String(data.uid) : null;
          }
        } catch {
          // Sem leitura do membro, só remove o documento.
        }

        await deleteDoc(ref);

        if (dashboardId && removedUid) {
          const dashRef = doc(firestore, DASHBOARDS, dashboardId);
          const snap = await getDoc(dashRef);
          const current = snap.exists()
            ? ((snap.data() as Record<string, unknown>).member_uids as unknown[])
            : [];
          const list = Array.isArray(current)
            ? current.map(String).filter((value) => value !== removedUid)
            : [];
          await syncProjectMemberUids(dashboardId, list);
        }
      },
    }),
    [isFirebase],
  );
}

/* ------------------------------ contas ------------------------------ */

/**
 * Cria o perfil de site (`users/{uid}`) do usuário autenticado como "user".
 * Roda depois da confirmação de e-mail — é o que dispensa liberação manual.
 */
export async function ensureUserProfile(): Promise<void> {
  const firestore = db();
  const user = getFirebaseAuth()?.currentUser;
  if (!firestore || !user || !user.emailVerified || !user.email) return;

  const ref = doc(firestore, USERS, user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  await setDoc(ref, {
    role: "user",
    name: user.displayName || user.email.split("@")[0],
    email: user.email,
    banned: false,
    created_at: nowIso(),
  });
}

/**
 * Pedido de promoção a ServerADM: grava `admin_requests/{uid}` (a tela de
 * "acesso pendente" mostra o UID para o desenvolvedor liberar no console).
 */
export async function requestServerAdmin(): Promise<void> {
  const firestore = db();
  const uid = currentUid();
  if (!firestore || !uid) return;
  const existing = await getDoc(doc(firestore, ADMIN_REQUESTS, uid));
  if (existing.exists()) return;
  await setDoc(doc(firestore, ADMIN_REQUESTS, uid), {
    uid,
    name: actorName(),
    email: actorEmail(),
    requested_at: nowIso(),
  });
}

/** Pedido de ServerADM do usuário atual (`null` se não pediu). */
export function useAdminRequestQuery(): { exists: boolean; at?: string } {
  const isFirebase = getBackendMode() === "firebase" && isFirebaseReady();
  const uid = useFirebaseUid();
  const [request, setRequest] = useState<{ exists: boolean; at?: string }>({
    exists: false,
  });

  useEffect(() => {
    if (!isFirebase || !uid) return;
    const firestore = db();
    if (!firestore) return;
    const unsub = onSnapshot(
      doc(firestore, ADMIN_REQUESTS, uid),
      (snap) => {
        const data = snap.exists()
          ? (snap.data() as Record<string, unknown>)
          : null;
        setRequest({
          exists: snap.exists(),
          at: data?.requested_at != null ? String(data.requested_at) : undefined,
        });
      },
      () => setRequest({ exists: false }),
    );
    return () => unsub();
  }, [isFirebase, uid]);

  return request;
}

/**
 * Adoção única de dados anteriores ao modelo por projeto (feita pelo
 * ServerADM): define dono e lista de membros nos documentos legados.
 */
export async function adoptLegacyData(): Promise<void> {
  const firestore = db();
  const uid = currentUid();
  if (!firestore || !uid) return;

  const dashboardsCol = collection(firestore, DASHBOARDS);
  const dashboardsSnap = await getDocs(dashboardsCol);
  const memberUidsByProject = new Map<string, string[]>();

  for (const d of dashboardsSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    const owner = data.owner_uid != null ? String(data.owner_uid) : null;
    const list = Array.isArray(data.member_uids)
      ? data.member_uids.map(String)
      : [];
    if (!owner) {
      const next = Array.from(new Set([...list, uid]));
      await updateDoc(d.ref, { owner_uid: uid, member_uids: next });
      memberUidsByProject.set(d.id, next);
      await setDoc(doc(firestore, MEMBERS, `${d.id}_${uid}`), {
        uid,
        name: actorName(),
        email: actorEmail(),
        role: "admin",
        dashboard_id: d.id,
        invited_at: nowIso(),
      });
    } else {
      memberUidsByProject.set(d.id, Array.from(new Set([...list, owner])));
    }
  }

  const notesCol = collection(firestore, NOTES);
  const notesSnap = await getDocs(notesCol);
  for (const d of notesSnap.docs) {
    const data = d.data() as Record<string, unknown>;
    if (Array.isArray(data.member_uids) && data.member_uids.length > 0) continue;
    const projectId =
      data.dashboard_id != null ? String(data.dashboard_id) : null;
    const owner = data.owner_uid != null ? String(data.owner_uid) : uid;
    await updateDoc(d.ref, {
      owner_uid: owner,
      member_uids: projectId
        ? (memberUidsByProject.get(projectId) ?? [owner])
        : [owner],
    });
  }

  const activityCol = collection(firestore, ACTIVITY);
  const activitySnap = await getDocs(activityCol);
  for (const d of activitySnap.docs) {
    const data = d.data() as Record<string, unknown>;
    if (Array.isArray(data.member_uids) && data.member_uids.length > 0) continue;
    const projectId =
      data.dashboard_id != null ? String(data.dashboard_id) : null;
    await updateDoc(d.ref, {
      member_uids: projectId
        ? (memberUidsByProject.get(projectId) ?? [uid])
        : [uid],
    });
  }
}

/** Executa a adoção de dados legados uma vez, quando habilitado. */
export function useLegacyAdoption(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (getBackendMode() !== "firebase") return;
    if (!isFirebaseReady()) return;
    void adoptLegacyData().catch((error) => {
      console.error("Adoção de dados legados falhou:", error);
    });
  }, [enabled]);
}

/* -------------------------------- seed -------------------------------- */

/**
 * Cria um projeto inicial para o usuário, uma vez. IDs fixos tornam a
 * operação idempotente — rodar duas vezes não duplica documentos.
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
  const uid = currentUid();
  if (!dashboards || !notes || !members || !uid) return;

  // Sem perfil, as regras negam todas as escritas do seed.
  await ensureProfileReady();

  const existing = await getDocs(
    query(dashboards, where("member_uids", "array-contains", uid)),
  );
  if (!existing.empty) return;

  const now = nowIso();
  const projectId = `dash-${uid.slice(0, 8)}-inicial`;

  await setDoc(doc(dashboards, projectId), {
    id: projectId,
    name: "Meu primeiro projeto",
    description: "Organize sprints, anotações e equipe neste projeto.",
    owner_uid: uid,
    member_uids: [uid],
    created_at: now,
    updated_at: now,
  });

  await setDoc(doc(members, `${projectId}_${uid}`), {
    uid,
    name: actorName(),
    email: actorEmail(),
    role: "admin",
    dashboard_id: projectId,
    invited_at: now,
  });

  const noteId = `note-${uid.slice(0, 8)}-boas-vindas`;
  await setDoc(
    doc(notes, noteId),
    toNoteDoc(
      {
        title: "Bem-vindo ao Lab Notes",
        content:
          "Esta anotação é sua. Convide colegas em Equipe & Parceiros para " +
          "trabalhar no projeto junto com você.",
        status: "in_progress",
        tags: ["boas-vindas"],
        dashboardId: projectId,
      },
      noteId,
      actorName(),
      now,
      uid,
      [uid],
    ),
  );
}
