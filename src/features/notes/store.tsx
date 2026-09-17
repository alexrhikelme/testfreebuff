import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Note, NoteStatus } from "./types";

type NewNoteInput = {
  title: string;
  content?: string;
  status?: NoteStatus;
  tags?: string[];
  assignee?: string;
  startDate?: string;
  dueDate?: string;
};

type NotesContextValue = {
  notes: Note[];
  createNote: (input: NewNoteInput) => Note;
  updateNote: (id: string, patch: Partial<NewNoteInput>) => void;
  deleteNote: (id: string) => void;
};

const nowIso = () => new Date().toISOString();

const makeId = () =>
  `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

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
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-12T14:30:00.000Z",
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
  },
];

const NotesContext = createContext<NotesContextValue | null>(null);

export function NotesProvider({ children }: { children: ReactNode }) {
  const [notes, setNotes] = useState<Note[]>(seedNotes);

  const createNote = useCallback((input: NewNoteInput): Note => {
    const note: Note = {
      id: makeId(),
      title: input.title,
      content: input.content ?? "",
      status: input.status ?? "not_started",
      tags: input.tags ?? [],
      assignee: input.assignee,
      startDate: input.startDate,
      dueDate: input.dueDate,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    setNotes((prev) => [note, ...prev]);
    return note;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<NewNoteInput>) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...patch, updatedAt: nowIso() } : n
      )
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const value: NotesContextValue = {
    notes,
    createNote,
    updateNote,
    deleteNote,
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
