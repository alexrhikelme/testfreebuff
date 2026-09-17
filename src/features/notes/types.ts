export type NoteStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "blocked";

export type Note = {
  id: string;
  title: string;
  content: string;
  status: NoteStatus;
  tags: string[];
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
};
