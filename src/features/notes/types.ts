export type NoteStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "blocked";

/**
 * Sprints do quadro (montagem de sprints) — coluna criada pelo usuário
 * ALÉM das 4 colunas base, que continuam sendo os status da nota.
 * O vínculo nota → sprint mora no store (sprintOf) e é persistido no
 * localStorage, junto com os títulos já existentes das colunas base.
 */
export type SprintColumn = {
  id: string;
  title: string;
};

/** Colunas base do Kanban: os quatro status da nota (Sprint 1…4). */
export const BASE_COLUMN_COUNT = 4;

export type Note = {
  id: string;
  title: string;
  content: string;
  status: NoteStatus;
  tags: string[];
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  /** Dashboard ao qual a nota pertence (Sprint 4). */
  dashboardId?: string;
  createdAt: string;
  updatedAt: string;
  /** Sprint 6: quem fez a última alteração (colaboração). */
  updatedBy?: string;
  /** Sprint 8: posição manual no Kanban (persistida no servidor). */
  order?: number;
};

/** Sprint 6: registro de atividade recente no workspace. */
export type ActivityEntry = {
  id: string;
  noteId: string;
  noteTitle: string;
  action: "created" | "updated" | "status_changed" | "moved" | "deleted";
  actor: string;
  at: string;
};
