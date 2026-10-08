import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Note, NoteStatus, ActivityEntry } from "./types";
import {
  useNotesQuery as useConvexNotes,
  useActivityQuery as useConvexActivity,
  useNoteMutations as useConvexNoteMutations,
  useNotesOrderQuery as useConvexNotesOrder,
  useNotesLoading as useConvexNotesLoading,
} from "@/shared/backend/hooks";
import { useOptionalToast } from "@/shared/components/Toast";
import { getBackendMode, CURRENT_USER, MAX_ACTIVITY, makeId, nowIso } from "@/shared/backend/config";
import { useOptionalAuth } from "@/app/router/AppRouter";

type NewNoteInput = {
  title: string;
  content?: string;
  status?: NoteStatus;
  tags?: string[];
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  dashboardId?: string;
};

type NotesContextValue = {
  notes: Note[];
  /** Ordem manual dentro de cada coluna do Kanban (id → posição). */
  order: Record<string, number>;
  /** Sprint 6: atividade recente (edições colaborativas). */
  activity: ActivityEntry[];
  /** Sprint 10 (H1): verdadeiro enquanto a lista carrega (modo Convex). */
  isLoading: boolean;
  createNote: (input: NewNoteInput) => Note;
  updateNote: (id: string, patch: Partial<NewNoteInput>) => void;
  deleteNote: (id: string) => void;
  /** Sprint 5: move a nota de status e posição (drag-and-drop do Kanban). */
  moveNote: (id: string, status: NoteStatus, beforeId?: string) => void;
};

const seedNotes: Note[] = [
  {
    id: "note-seed-1",
    title: "Coletar amostras do experimento A",
    content: "Preparar tubos, rotular e registrar temperatura ambiente.",
    status: "in_progress",
    tags: ["laboratório", "coleta"],
    assignee: "Ana Costa",
    startDate: "2026-09-10",
    dueDate: "2026-09-18",
    dashboardId: "dash-seed-1",
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-12T14:30:00.000Z",
    updatedBy: "Bruno Lima",
  },
  {
    id: "note-seed-2",
    title: "Revisar resultados da análise B",
    content: "Conferir duplicatas e validar curva de calibração.",
    status: "not_started",
    tags: ["análise"],
    assignee: "Bruno Lima",
    startDate: "2026-09-15",
    dueDate: "2026-09-22",
    dashboardId: "dash-seed-2",
    createdAt: "2026-09-11T10:15:00.000Z",
    updatedAt: "2026-09-11T10:15:00.000Z",
  },
  {
    id: "note-seed-3",
    title: "Pedir reposição de reagentes",
    content: "Buffer PBS e reagente C estão acabando.",
    status: "blocked",
    tags: ["suprimentos"],
    createdAt: "2026-09-08T08:00:00.000Z",
    updatedAt: "2026-09-09T16:45:00.000Z",
    updatedBy: "Ana Costa",
  },
];

const NotesContext = createContext<NotesContextValue | null>(null);

/**
 * Sprint 8 (D1) — Dois modos atrás da mesma API:
 * - "convex": dados reativos do banco, mutations otimistas com id do cliente;
 * - "local": estado em memória (protótipo e testes), comportamento intacto.
 */
export function NotesProvider({ children }: { children: ReactNode }) {
  const mode = getBackendMode();
  const convexNotes = useConvexNotes();
  const convexActivity = useConvexActivity();
  const convexOrder = useConvexNotesOrder();
  const convexMutations = useConvexNoteMutations();
  const convexLoading = useConvexNotesLoading();
  const isConvex = mode === "convex";
  const toast = useOptionalToast();

  const [localNotes, setLocalNotes] = useState<Note[]>(seedNotes);
  const [localOrder, setLocalOrder] = useState<Record<string, number>>({});
  const [localActivity, setLocalActivity] = useState<ActivityEntry[]>([]);

  const pushActivity = useCallback(
    (entry: Omit<ActivityEntry, "id" | "at">) => {
      setLocalActivity((prev) =>
        [{ ...entry, id: makeId("act"), at: nowIso() }, ...prev].slice(
          0,
          MAX_ACTIVITY
        )
      );
    },
    []
  );

  const notes = isConvex ? convexNotes : localNotes;
  const activity = isConvex ? convexActivity : localActivity;
  const order = isConvex ? convexOrder : localOrder;
  const isLoading = isConvex ? convexLoading : false;
  // Sprint 9 (D3): autoria exibida otimisticamente com o nome da sessão;
  // o servidor confirma com o nome resolvido da conta autenticada.
  const { user } = useOptionalAuth();
  const actor = user?.name ?? CURRENT_USER;

  const createNote = useCallback(
    (input: NewNoteInput): Note => {
      if (isConvex) {
        const id = makeId("note");
        const optimistic: Note = {
          id,
          title: input.title,
          content: input.content ?? "",
          status: input.status ?? "not_started",
          tags: input.tags ?? [],
          assignee: input.assignee,
          startDate: input.startDate,
          dueDate: input.dueDate,
          dashboardId: input.dashboardId,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          updatedBy: actor,
        };
        void convexMutations
          .createNote(input, id)
          .then(() => toast.showToast("success", "Anotação criada."))
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao criar anotação."
            );
          });
        return optimistic;
      }

      const note: Note = {
        id: makeId("note"),
        title: input.title,
        content: input.content ?? "",
        status: input.status ?? "not_started",
        tags: input.tags ?? [],
        assignee: input.assignee,
        startDate: input.startDate,
        dueDate: input.dueDate,
        dashboardId: input.dashboardId,
        createdAt: nowIso(),
        updatedAt: nowIso(),
        updatedBy: actor,
      };
      setLocalNotes((prev) => [note, ...prev]);
      pushActivity({
        noteId: note.id,
        noteTitle: note.title,
        action: "created",
        actor,
      });
      return note;
    },
    [isConvex, convexMutations, pushActivity, actor]
  );

  const updateNote = useCallback(
    (id: string, patch: Partial<NewNoteInput>) => {
      if (isConvex) {
        void convexMutations
          .updateNote(id, patch)
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao salvar anotação."
            );
          });
        return;
      }

      setLocalNotes((prev) => {
        const target = prev.find((n) => n.id === id);
        const isStatusChange =
          target !== undefined &&
          patch.status !== undefined &&
          patch.status !== target.status;
        if (target) {
          // Registro assíncrono da atividade (Sprint 6).
          queueMicrotask(() =>
            pushActivity({
              noteId: id,
              noteTitle: target.title,
              action: isStatusChange ? "status_changed" : "updated",
              actor,
            })
          );
        }
        return prev.map((n) =>
          n.id === id
            ? { ...n, ...patch, updatedAt: nowIso(), updatedBy: actor }
            : n
        );
      });
    },
    [isConvex, convexMutations, pushActivity, actor]
  );

  const deleteNote = useCallback(
    (id: string) => {
      if (isConvex) {
        void convexMutations
          .deleteNote(id)
          .then(() => toast.showToast("success", "Anotação excluída."))
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao excluir anotação."
            );
          });
        return;
      }

      setLocalNotes((prev) => {
        const target = prev.find((n) => n.id === id);
        if (target) {
          queueMicrotask(() =>
            pushActivity({
              noteId: id,
              noteTitle: target.title,
              action: "deleted",
              actor,
            })
          );
        }
        return prev.filter((n) => n.id !== id);
      });
    },
    [isConvex, convexMutations, pushActivity, actor]
  );

  const moveNote = useCallback(
    (id: string, status: NoteStatus, beforeId?: string) => {
      // Recalcula a posição no cliente (mesma semântica da Sprint 5) e
      // envia ao servidor junto com o novo status (Sprint 8).
      const current = isConvex ? convexOrder : localOrder;
      const next = { ...current };
      delete next[id];
      let newPosition: number;
      if (beforeId) {
        const target = next[beforeId];
        const shifted = Object.entries(next).map(
          ([k, v]) => [k, v >= (target ?? 0) ? v + 1 : v] as const
        );
        const base: Record<string, number> = {};
        for (const [k, v] of shifted) base[k] = v;
        newPosition = target ?? 0;
        base[id] = newPosition;
        Object.assign(next, base);
      } else {
        const max = Math.max(-1, ...Object.values(next));
        newPosition = max + 1;
        next[id] = newPosition;
      }

      if (isConvex) {
        void convexMutations
          .moveNote(id, status, newPosition)
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao mover anotação."
            );
          });
        return;
      }

      setLocalOrder(next);
      setLocalNotes((prev) => {
        const target = prev.find((n) => n.id === id);
        if (target && target.status !== status) {
          queueMicrotask(() =>
            pushActivity({
              noteId: id,
              noteTitle: target.title,
              action: "moved",
              actor,
            })
          );
        }
        return prev.map((n) =>
          n.id === id
            ? { ...n, status, updatedAt: nowIso(), updatedBy: actor }
            : n
        );
      });
    },
    [isConvex, convexOrder, localOrder, convexMutations, pushActivity, actor]
  );

  const value: NotesContextValue = {
    notes,
    order,
    activity,
    isLoading,
    createNote,
    updateNote,
    deleteNote,
    moveNote,
  };

  return (
    <NotesContext.Provider value={value}>{children}</NotesContext.Provider>
  );
}

export function useNotes() {
  const ctx = useContext(NotesContext);
  if (!ctx) {
    throw new Error("useNotes must be used within NotesProvider");
  }
  return ctx;
}
