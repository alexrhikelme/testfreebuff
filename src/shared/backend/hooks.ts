import { useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Note, ActivityEntry, NoteStatus } from "@/features/notes/types";
import type {
  Dashboard,
  Member,
  MemberRole,
} from "@/features/dashboards/types";
import { CURRENT_USER, getBackendMode, makeId } from "./config";

/**
 * Sprint 8 (D1) — Ponte reativa entre o app e o banco Convex.
 *
 * No modo local (protótipo/testes) estes hooks devolvem valores vazios e
 * funções no-op SEM chamar o Convex — as chamadas condicionais são seguras
 * porque o modo é fixo por sessão (definido por variável de ambiente).
 *
 * As queries retornam exatamente os tipos usados pelas views (Note,
 * Dashboard, Member, ActivityEntry); as mutations geram o id no cliente
 * para que a confirmação do servidor coincida com a versão otimista.
 */

export type NewNoteInput = {
  title: string;
  content?: string;
  status?: NoteStatus;
  tags?: string[];
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  dashboardId?: string;
};

/** Campos da nota que podem ser limpos (undefined vira null no servidor). */
const CLEARABLE_FIELDS = new Set([
  "assignee",
  "startDate",
  "dueDate",
  "dashboardId",
]);

/**
 * Converte o patch da view para o contrato do servidor:
 * chaves presentes com `undefined` em campos limpáveis viram `null`
 * (semântica de "limpar campo"); chaves ausentes são preservadas.
 */
function normalizeNotePatch(patch: Partial<NewNoteInput>) {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined && CLEARABLE_FIELDS.has(key)) {
      out[key] = null;
    } else if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
}

const isConvex = () => getBackendMode() === "convex";

/** Popula o banco na primeira carga do modo Convex (idempotente). */
export function useSeedOnMount() {
  const seed = useMutation(api.seed.seedIfEmpty);
  useEffect(() => {
    if (!isConvex()) return;
    void seed({}).catch((e) => console.error("seed falhou:", e));
  }, [seed]);
}

export function useNotesQuery(): Note[] {
  if (!isConvex()) return [];
  return useQuery(api.notes.list, {}) ?? [];
}

/** Sprint 10 (H1): estado de carregamento da lista de notas. */
export function useNotesLoading(): boolean {
  if (!isConvex()) return false;
  return useQuery(api.notes.list, {}) === undefined;
}

export function useActivityQuery(): ActivityEntry[] {
  if (!isConvex()) return [];
  return useQuery(api.seed.listActivity, {}) ?? [];
}

/** Mapa de ordem do Kanban (id → posição), persistido no servidor. */
export function useNotesOrderQuery(): Record<string, number> {
  if (!isConvex()) return {};
  return useQuery(api.orders.getNotesOrder, {}) ?? {};
}

export function useDashboardsQuery(): Dashboard[] {
  if (!isConvex()) return [];
  return useQuery(api.dashboards.list, {}) ?? [];
}

export function useMembersQuery(): Member[] {
  if (!isConvex()) return [];
  return useQuery(api.members.list, {}) ?? [];
}

export function useNoteMutations() {
  if (!isConvex()) {
    return useMemo(
      () => ({
        createNote: async () => {},
        updateNote: async () => {},
        moveNote: async () => {},
        deleteNote: async () => {},
      }),
      []
    );
  }

  const create = useMutation(api.notes.create);
  const update = useMutation(api.notes.update);
  const move = useMutation(api.notes.move);
  const remove = useMutation(api.notes.remove);

  return useMemo(
    () => ({
      createNote: (input: NewNoteInput, id: string = makeId("note")) =>
        create({
          id,
          title: input.title,
          content: input.content,
          status: input.status,
          tags: input.tags,
          assignee: input.assignee,
          startDate: input.startDate,
          dueDate: input.dueDate,
          dashboardId: input.dashboardId,
          actor: CURRENT_USER,
        }),
      updateNote: (id: string, patch: Partial<NewNoteInput>) =>
        update({ id, patch: normalizeNotePatch(patch), actor: CURRENT_USER }),
      moveNote: (id: string, status: NoteStatus, order?: number) =>
        move({ id, status, order, actor: CURRENT_USER }),
      deleteNote: (id: string) => remove({ id, actor: CURRENT_USER }),
    }),
    [create, update, move, remove]
  );
}

export function useDashboardMutations() {
  if (!isConvex()) {
    return useMemo(
      () => ({
        createDashboard: async () => {},
        updateDashboard: async () => {},
        deleteDashboard: async () => {},
        addMember: async () => {},
        updateMemberRole: async () => {},
        removeMember: async () => {},
      }),
      []
    );
  }

  const create = useMutation(api.dashboards.create);
  const update = useMutation(api.dashboards.update);
  const remove = useMutation(api.dashboards.remove);
  const addMemberMut = useMutation(api.members.add);
  const updateRoleMut = useMutation(api.members.updateRole);
  const removeMemberMut = useMutation(api.members.remove);

  return useMemo(
    () => ({
      createDashboard: (
        input: { name: string; description?: string },
        id: string = makeId("dash")
      ) => create({ id, name: input.name, description: input.description }),
      updateDashboard: (
        id: string,
        patch: { name?: string; description?: string }
      ) => update({ id, name: patch.name, description: patch.description }),
      deleteDashboard: (id: string) => remove({ id }),
      addMember: (
        input: {
          name: string;
          email: string;
          role: MemberRole;
          dashboardId: string;
        },
        id: string = makeId("member")
      ) => addMemberMut({ id, ...input }),
      updateMemberRole: (id: string, role: MemberRole) =>
        updateRoleMut({ id, role }),
      removeMember: (id: string) => removeMemberMut({ id }),
    }),
    [create, update, remove, addMemberMut, updateRoleMut, removeMemberMut]
  );
}
