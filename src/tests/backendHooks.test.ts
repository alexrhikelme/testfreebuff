import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import {
  useNotesQuery,
  useNotesLoading,
  useActivityQuery,
  useNotesOrderQuery,
  useDashboardsQuery,
  useMembersQuery,
  useNoteMutations,
  useDashboardMutations,
  useSprintsQuery,
  useSprintMutations,
  useSeedOnMount,
} from "../shared/backend/hooks";

/**
 * Cobertura dos hooks de dados (src/shared/backend/hooks.ts) nos modos
 * "firebase" e "local".
 *
 * O SDK do Firestore é mockado: as escritas são registradas em `state.writes`
 * (caminho do documento + payload) e as leituras devolvem `state.docs`.
 * Nenhuma conexão real com o Firebase é aberta durante os testes.
 */

type Write =
  | { op: "set"; path: string; data: Record<string, unknown> }
  | { op: "update"; path: string; data: Record<string, unknown> }
  | { op: "delete"; path: string };

const state = vi.hoisted(() => ({
  mode: "local" as "firebase" | "convex" | "local",
  firestore: null as Firestore | null,
  docs: [] as Array<{ id: string; data: () => Record<string, unknown> }>,
  empty: true,
  writes: [] as Write[],
  listeners: 0,
  authUser: { uid: "uid-teste" } as { uid: string } | null,
  authListeners: [] as Array<(user: { uid: string } | null) => void>,
}));

vi.mock("firebase/auth", () => ({
  getAuth: () => ({
    get currentUser() {
      return state.authUser;
    },
  }),
  onAuthStateChanged: (
    _auth: unknown,
    next: (user: { uid: string } | null) => void,
  ) => {
    state.authListeners.push(next);
    next(state.authUser);
    return () => {
      state.authListeners = state.authListeners.filter((l) => l !== next);
    };
  },
}));

vi.mock("@/shared/firebase", () => ({
  getFirebaseApp: () => ({ name: "mock-app" }),
  getFirebaseFirestore: () => state.firestore,
  getFirebaseAuth: () => ({
    get currentUser() {
      return state.authUser;
    },
  }),
  getFirebaseAnalytics: () => null,
  isFirebaseReady: () => state.firestore != null,
  connectFirebaseEmulators: () => {},
  firebaseConfig: { projectId: "combogo-unicap" },
}));

vi.mock("../shared/backend/config", () => ({
  getBackendMode: () => state.mode,
  CURRENT_USER: "Ana Costa",
  MAX_ACTIVITY: 30,
  makeId: (prefix: string) => `${prefix}-fixo`,
  nowIso: () => "2026-09-01T00:00:00.000Z",
}));

vi.mock("firebase/firestore", () => {
  class Timestamp {
    constructor(private readonly value: string) {}
    toDate() {
      return new Date(this.value);
    }
  }

  // Junta os segmentos do caminho: a instância do Firestore (objeto sem
  // `path`) é ignorada; coleções e ids entram no caminho final.
  const pathOf = (args: unknown[]) =>
    args
      .map((part) => {
        if (typeof part === "object" && part !== null) {
          return "path" in part ? (part as { path: string }).path : null;
        }
        return String(part);
      })
      .filter((part): part is string => part != null)
      .join("/");

  return {
    Timestamp,
    collection: (_db: unknown, name: string) => ({ path: name }),
    doc: (...args: unknown[]) => ({ path: pathOf(args) }),
    query: (col: { path: string }, ...rest: unknown[]) => ({
      path: col.path,
      rest,
    }),
    orderBy: (field: string, direction: string) => ({ field, direction }),
    where: (field: string, op: string, value: unknown) => ({ field, op, value }),
    onSnapshot: (
      _q: unknown,
      optsOrNext: unknown,
      maybeNext?: unknown,
    ) => {
      state.listeners += 1;
      const next = (
        typeof optsOrNext === "function" ? optsOrNext : maybeNext
      ) as (snapshot: {
        docs: typeof state.docs;
        metadata: { fromCache: boolean };
      }) => void;
      next({ docs: state.docs, metadata: { fromCache: false } });
      return () => {};
    },
    setDoc: async (ref: { path: string }, data: Record<string, unknown>) => {
      state.writes.push({ op: "set", path: ref.path, data });
    },
    updateDoc: async (
      ref: { path: string },
      data: Record<string, unknown>,
    ) => {
      state.writes.push({ op: "update", path: ref.path, data });
    },
    deleteDoc: async (ref: { path: string }) => {
      state.writes.push({ op: "delete", path: ref.path });
    },
    getDoc: async () => ({
      exists: () => false,
      data: () => ({}),
    }),
    getDocs: async (col: { path: string }) => ({
      empty: state.empty,
      // Cada documento traz a referência, como no SDK real.
      docs: state.docs.map((d) => ({
        ...d,
        ref: { path: `${col.path}/${d.id}` },
      })),
    }),
  };
});

beforeEach(() => {
  state.mode = "local";
  state.firestore = null;
  state.docs = [];
  state.empty = true;
  state.writes = [];
  state.listeners = 0;
  state.authUser = {
    uid: "uid-teste",
    displayName: "Ana Costa",
    email: "ana@lab.local",
  } as unknown as { uid: string };
  state.authListeners = [];
});

function useFirebase() {
  state.mode = "firebase";
  state.firestore = {} as unknown as Firestore;
}

/** Simula o login/logout concluído pelo Firebase Auth. */
function emitAuth(user: { uid: string } | null) {
  state.authUser = user;
  act(() => {
    for (const listener of [...state.authListeners]) listener(user);
  });
}

describe("hooks — modo local (protótipo)", () => {
  it("devolve valores vazios e não abre listeners", () => {
    const { result } = renderHook(() => ({
      notes: useNotesQuery(),
      loading: useNotesLoading(),
      activity: useActivityQuery(),
      order: useNotesOrderQuery(),
      dashboards: useDashboardsQuery(),
      members: useMembersQuery(),
    }));

    expect(result.current.notes).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.activity).toEqual([]);
    expect(result.current.order).toEqual({});
    expect(result.current.dashboards).toEqual([]);
    expect(result.current.members).toEqual([]);
    expect(state.listeners).toBe(0);
  });

  it("mantém as mutations como no-op sem backend", async () => {
    const notes = renderHook(() => useNoteMutations());
    await notes.result.current.createNote({ title: "nada" });
    await notes.result.current.updateNote("note-1", { title: "nada" });
    await notes.result.current.moveNote("note-1", "completed", 1);
    await notes.result.current.deleteNote("note-1");

    const dashboards = renderHook(() => useDashboardMutations());
    await dashboards.result.current.createDashboard({ name: "nada" });
    await dashboards.result.current.deleteDashboard("dash-1");

    expect(state.writes).toEqual([]);
  });

  it("não dispara o seed", async () => {
    renderHook(() => useSeedOnMount());
    await Promise.resolve();
    expect(state.writes).toEqual([]);
  });
});

describe("hooks — queries no modo Firebase", () => {
  it("mapeia os documentos do Firestore para os tipos do app", async () => {
    useFirebase();
    state.docs = [
      {
        id: "note-1",
        data: () => ({
          title: "Coleta",
          content: "tubos",
          status: "in_progress",
          tags: ["lab"],
          assignee: "Ana",
          start_date: "2026-09-01",
          due_date: "2026-09-10",
          dashboard_id: "dash-1",
          // Instância do Timestamp (mockado) para exercitar a conversão.
          created_at: new (Timestamp as unknown as new (
            iso: string,
          ) => object)("2026-09-01T00:00:00.000Z"),
          updated_at: "2026-09-02T00:00:00.000Z",
          updated_by: "Bruno",
          order: 2,
        }),
      },
    ];

    const { result } = renderHook(() => useNotesQuery());

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0]).toEqual({
      id: "note-1",
      title: "Coleta",
      content: "tubos",
      status: "in_progress",
      tags: ["lab"],
      assignee: "Ana",
      startDate: "2026-09-01",
      dueDate: "2026-09-10",
      dashboardId: "dash-1",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-02T00:00:00.000Z",
      updatedBy: "Bruno",
      order: 2,
    });
  });

  it("lê atividade, ordem, dashboards e membros", async () => {
    useFirebase();
    state.docs = [
      {
        id: "act-1",
        data: () => ({
          note_id: "note-1",
          note_title: "Coleta",
          action: "created",
          actor: "Ana Costa",
          at: "2026-09-01T00:00:00.000Z",
        }),
      },
    ];

    const activity = renderHook(() => useActivityQuery());
    await waitFor(() => expect(activity.result.current).toHaveLength(1));
    expect(activity.result.current[0]).toMatchObject({
      id: "act-1",
      noteId: "note-1",
      action: "created",
      actor: "Ana Costa",
    });

    state.docs = [
      { id: "note-1", data: () => ({ order: 3 }) },
      { id: "note-2", data: () => ({}) },
    ];
    const order = renderHook(() => useNotesOrderQuery());
    await waitFor(() => expect(order.result.current).toEqual({ "note-1": 3 }));

    state.docs = [
      {
        id: "dash-1",
        data: () => ({
          name: "Meu dash",
          description: "desc",
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
        }),
      },
    ];
    const dashboards = renderHook(() => useDashboardsQuery());
    await waitFor(() => expect(dashboards.result.current).toHaveLength(1));
    expect(dashboards.result.current[0]).toMatchObject({
      id: "dash-1",
      name: "Meu dash",
    });

    state.docs = [
      {
        id: "member-1",
        data: () => ({
          name: "Ana",
          email: "ana@lab.local",
          role: "admin",
          dashboard_id: "dash-1",
          invited_at: "2026-09-01T00:00:00.000Z",
        }),
      },
    ];
    const members = renderHook(() => useMembersQuery());
    await waitFor(() => expect(members.result.current).toHaveLength(1));
    expect(members.result.current[0]).toMatchObject({
      id: "member-1",
      role: "admin",
      dashboardId: "dash-1",
    });
  });

  it("limpa o estado de carregamento após o primeiro snapshot", async () => {
    useFirebase();
    const { result } = renderHook(() => useNotesLoading());
    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe("hooks — mutations de notas no modo Firebase", () => {
  it("createNote grava o documento e a atividade com id do cliente", async () => {
    useFirebase();
    const { result } = renderHook(() => useNoteMutations());

    await result.current.createNote(
      { title: "Nova nota", tags: ["a"] },
      "note-explicito",
    );

    expect(state.writes).toEqual([
      {
        op: "set",
        path: "notes/note-explicito",
        data: {
          id: "note-explicito",
          title: "Nova nota",
          content: "",
          status: "not_started",
          tags: ["a"],
          assignee: null,
          start_date: null,
          due_date: null,
          dashboard_id: null,
          sprint_id: null,
          created_at: "2026-09-01T00:00:00.000Z",
          updated_at: "2026-09-01T00:00:00.000Z",
          updated_by: "Ana Costa",
          owner_uid: "uid-teste",
          member_uids: ["uid-teste"],
        },
      },
      {
        op: "set",
        path: "activity/act-fixo",
        data: {
          note_id: "note-explicito",
          note_title: "Nova nota",
          action: "created",
          actor: "Ana Costa",
          actor_uid: "uid-teste",
          dashboard_id: null,
          member_uids: ["uid-teste"],
          at: "2026-09-01T00:00:00.000Z",
        },
      },
    ]);
  });

  it("updateNote limpa campos opcionais com null e preserva os demais", async () => {
    useFirebase();
    const { result } = renderHook(() => useNoteMutations());

    await result.current.updateNote("note-1", {
      title: "Editada",
      assignee: undefined,
      startDate: undefined,
      dueDate: undefined,
      dashboardId: undefined,
      content: undefined,
      tags: [],
    });

    expect(state.writes[0]).toEqual({
      op: "update",
      path: "notes/note-1",
      data: {
        title: "Editada",
        assignee: null,
        start_date: null,
        due_date: null,
        dashboard_id: null,
        tags: [],
        updated_at: "2026-09-01T00:00:00.000Z",
        updated_by: "Ana Costa",
      },
    });
  });

  it("moveNote e deleteNote atualizam coluna/ordem e removem o documento", async () => {
    useFirebase();
    const { result } = renderHook(() => useNoteMutations());

    await result.current.moveNote("note-1", "completed", 3);
    await result.current.deleteNote("note-1");

    expect(state.writes[0]).toEqual({
      op: "update",
      path: "notes/note-1",
      data: {
        status: "completed",
        order: 3,
        updated_at: "2026-09-01T00:00:00.000Z",
        updated_by: "Ana Costa",
      },
    });
    expect(state.writes).toContainEqual({ op: "delete", path: "notes/note-1" });
  });
});

describe("hooks — sessão do Firebase (primeira entrada no site)", () => {
  it("não assina as coleções sem sessão e reassina depois do login", async () => {
    useFirebase();
    state.docs = [{ id: "dash-1", data: () => ({ name: "Projeto 1" }) }];

    // Primeira visita: o app monta antes de o Firebase Auth restaurar a sessão.
    state.authUser = null;
    const { result } = renderHook(() => useDashboardsQuery());

    expect(result.current).toEqual([]);
    expect(state.listeners).toBe(0);

    emitAuth({ uid: "uid-teste" });

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].name).toBe("Projeto 1");
    expect(state.listeners).toBe(1);
  });

  it("volta a assinar as coleções quando outro usuário entra", async () => {
    useFirebase();
    state.docs = [{ id: "dash-1", data: () => ({ name: "Projeto 1" }) }];

    const { result } = renderHook(() => useDashboardsQuery());
    await waitFor(() => expect(result.current).toHaveLength(1));
    const primeiraSessao = state.listeners;

    emitAuth({ uid: "outro-uid" });

    await waitFor(() => expect(state.listeners).toBe(primeiraSessao + 1));
  });
});

describe("hooks — sprints do quadro no modo Firebase", () => {
  it("lê as colunas de sprint do workspace", async () => {
    useFirebase();
    state.docs = [
      { id: "sprint-1", data: () => ({ title: "Sprint 5" }) },
      { id: "sprint-2", data: () => ({ title: "Sprint 6" }) },
    ];

    const { result } = renderHook(() => useSprintsQuery());

    await waitFor(() => expect(result.current).toHaveLength(2));
    expect(result.current).toEqual([
      { id: "sprint-1", title: "Sprint 5" },
      { id: "sprint-2", title: "Sprint 6" },
    ]);
  });

  it("cria, renomeia e exclui sprints no backend", async () => {
    useFirebase();
    const { result } = renderHook(() => useSprintMutations());

    await result.current.addSprint({ id: "sprint-1", title: "Sprint 5" });
    await result.current.renameSprint("sprint-1", "Entrega");
    await result.current.removeSprint("sprint-1");

    expect(state.writes[0]).toEqual({
      op: "set",
      path: "sprints/sprint-1",
      data: {
        id: "sprint-1",
        title: "Sprint 5",
        created_at: "2026-09-01T00:00:00.000Z",
      },
    });
    expect(state.writes[1]).toEqual({
      op: "update",
      path: "sprints/sprint-1",
      data: { title: "Entrega" },
    });
    expect(state.writes).toContainEqual({
      op: "delete",
      path: "sprints/sprint-1",
    });
  });

  it("excluir o sprint desvincula as notas sem apagá-las", async () => {
    useFirebase();
    state.docs = [
      { id: "note-1", data: () => ({ title: "No sprint", sprint_id: "sprint-1" }) },
      { id: "note-2", data: () => ({ title: "Fora", sprint_id: null }) },
    ];
    const { result } = renderHook(() => useSprintMutations());

    await result.current.removeSprint("sprint-1");

    expect(state.writes).toEqual([
      { op: "delete", path: "sprints/sprint-1" },
      { op: "update", path: "notes/note-1", data: { sprint_id: null } },
    ]);
  });

  it("vincula a nota ao sprint e grava sprint_id ao criar a nota", async () => {
    useFirebase();
    const sprints = renderHook(() => useSprintMutations());
    await sprints.result.current.setNoteSprint("note-1", "sprint-1");
    expect(state.writes[0]).toEqual({
      op: "update",
      path: "notes/note-1",
      data: { sprint_id: "sprint-1" },
    });

    state.writes = [];
    const notes = renderHook(() => useNoteMutations());
    await notes.result.current.createNote(
      { title: "No sprint", sprintId: "sprint-1" },
      "note-2",
    );
    expect(state.writes[0]).toMatchObject({
      op: "set",
      path: "notes/note-2",
      data: { sprint_id: "sprint-1" },
    });
  });
});

describe("hooks — mutations de dashboards no modo Firebase", () => {
  it("cria, atualiza e remove dashboards", async () => {
    useFirebase();
    const { result } = renderHook(() => useDashboardMutations());

    await result.current.createDashboard({ name: "Meu dash" }, "dash-1");
    await result.current.updateDashboard("dash-1", { name: "Renomeado" });
    await result.current.deleteDashboard("dash-1");

    expect(state.writes[0]).toMatchObject({
      op: "set",
      path: "dashboards/dash-1",
      data: {
        name: "Meu dash",
        description: "",
        owner_uid: "uid-teste",
        member_uids: ["uid-teste"],
      },
    });
    // O criador entra como admin do projeto (id determinístico).
    expect(state.writes[1]).toMatchObject({
      op: "set",
      path: "members/dash-1_uid-teste",
      data: { role: "admin", dashboard_id: "dash-1" },
    });
    expect(state.writes).toContainEqual({
      op: "update",
      path: "dashboards/dash-1",
      data: { name: "Renomeado", updated_at: "2026-09-01T00:00:00.000Z" },
    });
    expect(state.writes).toContainEqual({
      op: "delete",
      path: "dashboards/dash-1",
    });
  });

  it("gerencia membros do dashboard", async () => {
    useFirebase();
    const { result } = renderHook(() => useDashboardMutations());

    await result.current.addMember({
      uid: "uid-convidado",
      name: "Bruno Lima",
      email: "bruno@lab.local",
      role: "editor",
      dashboardId: "dash-1",
    });
    await result.current.updateMemberRole("dash-1_uid-convidado", "viewer");

    // O convite grava o membro com id determinístico (projeto_uid), atualiza
    // a lista de acesso do projeto e sincroniza notas/atividade.
    expect(state.writes[0]).toEqual({
      op: "set",
      path: "members/dash-1_uid-convidado",
      data: {
        uid: "uid-convidado",
        name: "Bruno Lima",
        email: "bruno@lab.local",
        role: "editor",
        dashboard_id: "dash-1",
        invited_at: "2026-09-01T00:00:00.000Z",
      },
    });
    expect(state.writes).toContainEqual({
      op: "update",
      path: "dashboards/dash-1",
      data: {
        member_uids: ["uid-convidado", "uid-teste"],
        updated_at: "2026-09-01T00:00:00.000Z",
      },
    });
    expect(state.writes).toContainEqual({
      op: "update",
      path: "members/dash-1_uid-convidado",
      data: { role: "viewer" },
    });
  });
});

describe("hooks — workspace inicial", () => {
  it("popula o workspace quando o Firestore está vazio", async () => {
    useFirebase();
    state.empty = true;

    renderHook(() => useSeedOnMount(true));

    await waitFor(() => expect(state.writes.length).toBeGreaterThan(0));
    const paths = state.writes.map((w) => w.path);
    // Projeto inicial do próprio usuário + membro admin + nota de boas-vindas.
    expect(paths).toContain("dashboards/dash-uid-test-inicial");
    expect(paths).toContain("members/dash-uid-test-inicial_uid-teste");
    expect(paths).toContain("notes/note-uid-test-boas-vindas");
  });

  it("não repopula quando já existem dashboards", async () => {
    useFirebase();
    state.empty = false;
    state.docs = [
      {
        id: "dash-existente",
        data: () => ({ name: "Já existe" }),
      },
    ];

    renderHook(() => useSeedOnMount(true));
    await Promise.resolve();
    await Promise.resolve();
    expect(state.writes).toEqual([]);
  });

  it("não roda o seed quando desabilitado", async () => {
    useFirebase();
    renderHook(() => useSeedOnMount(false));
    await Promise.resolve();
    expect(state.writes).toEqual([]);
  });
});
