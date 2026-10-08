/**
 * Sprint 4 — Dashboards e Equipe (tipos e permissões).
 * Arquivo puro (sem React): pode ser importado por views, stores e pela
 * ponte Convex sem criar dependências circulares.
 */

export type MemberRole = "admin" | "editor" | "viewer";

export const ROLE_LABEL: Record<MemberRole, string> = {
  admin: "Administrador",
  editor: "Editor",
  viewer: "Visualizador",
};

/** Permissões derivadas do papel — única fonte de verdade (UI e servidor). */
export function canEditDashboard(role: MemberRole): boolean {
  return role === "admin" || role === "editor";
}

export function canManageMembers(role: MemberRole): boolean {
  return role === "admin";
}

export type Member = {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  /** Dashboard a que pertence — um membro é sempre convidado a um dashboard. */
  dashboardId: string;
  invitedAt: string;
};

export type Dashboard = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type NewDashboardInput = {
  name: string;
  description?: string;
};

export type NewMemberInput = {
  name: string;
  email: string;
  role: MemberRole;
  dashboardId: string;
};
