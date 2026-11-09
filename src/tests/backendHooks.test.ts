import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import {
  useNotesQuery,
  useNotesLoading,
  useActivityQuery,
  useNotesOrderQuery,
  useDashboardsQuery,
  useMembersQuery,
  useNoteMutations,
  useDashboardMutations,
  useSeedOnMount,
} from "../shared/backend/hooks";

/**
 * Cobertura do ramo Convex da ponte de dados (src/shared/backend/hooks.ts).
 * Nos testes de tela o modo é sempre "local", então esta é a única forma de
 * exercitar as queries/mutations reais: mockamos convex/react, o objeto `api`
 * gerado e o seletor de modo.
 */

const state = vi.hoisted(() => ({
  mode: "convex" as "convex" | "local",
  queries: {} as Record<string, unknown>,
  calls: [] as Array<{ ref: string; args: unknown }>,
}));

vi.mock("convex/react", () => ({
  useQuery: (ref: string) => state.queries[ref],
  useMutation: (ref: string) => (args: unknown) => {
    state.calls.push({ ref, args });
    return Promise.resolve();
  },
}));

vi.mock("../../convex/_generated/api", () => ({
  api: {
    notes: {
      list: "notes.list",
      create: "notes.create",
      update: "notes.update",
      move: "notes.move",
      remove: "notes.remove",
    },
    seed: {
      ensureWorkspace: "seed.ensureWorkspace",
      listActivity: "seed.listActivity",
    },
    orders: { getNotesOrder: "orders.getNotesOrder" },
    dashboards: {
      list: "dashboards.list",
      create: "dashboards.create",
      update: "dashboards.update",
      remove: "dashboards.remove",
    },
    members: {
      list: "members.list",
      add: "members.add",
      updateRole: "members.updateRole",
      remove: "members.remove",
    },
  },
}));

vi.mock("../shared/backend/config", () => ({
  getBackendMode: () => state.mode,
  CURRENT_USER: "Ana Costa",
  makeId: (prefix: string) => `${prefix}-fixo`,
}));

beforeEach(() => {
  state.mode = "convex";
  state.queries = {};
  state.calls = [];
});

describe("hooks — modo local (protótipo)", () => {
  it("devolve valores vazios e mutations no-op sem tocar no Convex", async () => {
    state.mode = "local";

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

    const notes = renderHook(() => useNoteMutations());
    await notes.result.current.createNote({ title: "não deve chamar" });
    await notes.result.current.deleteNote("qualquer");

    const dashboards = renderHook(() => useDashboardMutations());
    await dashboards.result.current.deleteDashboard("qualquer");

    expect(state.calls).toHaveLength(0);
  });

  it("não dispara o seed no modo local", () => {
    state.mode = "local";
    renderHook(() => useSeedOnMount());
    expect(state.calls).toHaveLength(0);
  });
});

describe("hooks — queries no modo Convex", () => {
  const nota = {
    id: "note-1",
    title: "Do servidor",
    content: "",
    status: "not_started",
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  it("lê notas, atividade, ordem, dashboards e membros", () => {
    state.queries = {
      "notes.list": [nota],
      "seed.listActivity": [{ id: "a1", action: "created" }],
      "orders.getNotesOrder": { "note-1": 0 },
      "dashboards.list": [{ id: "dash-1", name: "Dash" }],
      "members.list": [{ id: "member-1", name: "Ana" }],
    };

    const { result } = renderHook(() => ({
      notes: useNotesQuery(),
      loading: useNotesLoading(),
      activity: useActivityQuery(),
      order: useNotesOrderQuery(),
      dashboards: useDashboardsQuery(),
      members: useMembersQuery(),
    }));

    expect(result.current.notes).toEqual([nota]);
    expect(result.current.loading).toBe(false);
    expect(result.current.activity).toHaveLength(1);
    expect(result.current.order).toEqual({ "note-1": 0 });
    expect(result.current.dashboards).toHaveLength(1);
    expect(result.current.members).toHaveLength(1);
  });

  it("considera carregamento enquanto a query devolve undefined", () => {
    const { result } = renderHook(() => ({
      notes: useNotesQuery(),
      loading: useNotesLoading(),
    }));

    expect(result.current.notes).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("hooks — mutations de notas no modo Convex", () => {
  it("createNote envia o id gerado no cliente (sem forjar autoria)", async () => {
    const { result } = renderHook(() => useNoteMutations());

    await result.current.createNote({ title: "Nova nota", tags: ["a"] });

    expect(state.calls).toEqual([
      {
        ref: "notes.create",
        args: {
          id: "note-fixo",
          title: "Nova nota",
          content: undefined,
          status: undefined,
          tags: ["a"],
          assignee: undefined,
          startDate: undefined,
          dueDate: undefined,
          dashboardId: undefined,
        },
      },
    ]);
  });

  it("createNote aceita um id explícito", async () => {
    const { result } = renderHook(() => useNoteMutations());
    await result.current.createNote({ title: "Com id" }, "note-explicito");
    expect((state.calls[0].args as { id: string }).id).toBe("note-explicito");
  });

  it("updateNote converte campos limpáveis em null e preserva o resto", async () => {
    const { result } = renderHook(() => useNoteMutations());

    await result.current.updateNote("note-1", {
      title: "Editada",
      assignee: undefined,
      startDate: undefined,
      dueDate: undefined,
      dashboardId: undefined,
      // Campo não limpável ausente continua ausente.
      content: undefined,
      tags: [],
    });

    expect(state.calls[0]).toEqual({
      ref: "notes.update",
      args: {
        id: "note-1",
        patch: {
          title: "Editada",
          assignee: null,
          startDate: null,
          dueDate: null,
          dashboardId: null,
          tags: [],
        },
      },
    });
  });

  it("moveNote e deleteNote enviam status/ordem", async () => {
    const { result } = renderHook(() => useNoteMutations());

    await result.current.moveNote("note-1", "completed", 3);
    await result.current.deleteNote("note-1");

    expect(state.calls).toEqual([
      {
        ref: "notes.move",
        args: { id: "note-1", status: "completed", order: 3 },
      },
      { ref: "notes.remove", args: { id: "note-1" } },
    ]);
  });
});

describe("hooks — mutations de dashboards no modo Convex", () => {
  it("cria, atualiza e remove dashboards", async () => {
    const { result } = renderHook(() => useDashboardMutations());

    await result.current.createDashboard({ name: "Meu dash" });
    await result.current.updateDashboard("dash-1", { name: "Renomeado" });
    await result.current.deleteDashboard("dash-1");

    expect(state.calls).toEqual([
      {
        ref: "dashboards.create",
        args: { id: "dash-fixo", name: "Meu dash", description: undefined },
      },
      {
        ref: "dashboards.update",
        args: { id: "dash-1", name: "Renomeado", description: undefined },
      },
      { ref: "dashboards.remove", args: { id: "dash-1" } },
    ]);
  });

  it("gerencia membros do dashboard", async () => {
    const { result } = renderHook(() => useDashboardMutations());

    await result.current.addMember({
      name: "Ana Costa",
      email: "ana@lab.local",
      role: "admin",
      dashboardId: "dash-1",
    });
    await result.current.updateMemberRole("member-1", "viewer");
    await result.current.removeMember("member-1");

    expect(state.calls).toEqual([
      {
        ref: "members.add",
        args: {
          id: "member-fixo",
          name: "Ana Costa",
          email: "ana@lab.local",
          role: "admin",
          dashboardId: "dash-1",
        },
      },
      { ref: "members.updateRole", args: { id: "member-1", role: "viewer" } },
      { ref: "members.remove", args: { id: "member-1" } },
    ]);
  });
});

describe("hooks — workspace inicial", () => {
  it("popula o workspace uma vez quando a sessão está ativa", async () => {
    renderHook(() => useSeedOnMount(true));

    await waitFor(() => expect(state.calls).toHaveLength(1));
    expect(state.calls[0]).toEqual({ ref: "seed.ensureWorkspace", args: {} });
  });

  it("não chama o seed sem sessão (enabled = false)", async () => {
    renderHook(() => useSeedOnMount(false));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(state.calls).toHaveLength(0);
  });
});
