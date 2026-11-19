/**
 * Dashboards/projetos, papéis por projeto e contas do site.
 * Arquivo puro (sem React): pode ser importado por views, stores e hooks
 * sem criar dependências circulares.
 */

/**
 * Papel dentro de UM projeto:
 * - admin  → dono do projeto ou alguém promovido: lê, escreve, edita o
 *            projeto e atribui papéis;
 * - editor → "Escritor": lê e escreve nas notas do projeto;
 * - viewer → "Leitor": apenas lê o projeto.
 */
export type MemberRole = "admin" | "editor" | "viewer";

export const ROLE_LABEL: Record<MemberRole, string> = {
  admin: "Administrador",
  editor: "Escritor",
  viewer: "Leitor",
};

/**
 * Papel no SITE (independente de projeto):
 * - user         → conta padrão criada no cadastro;
 * - server_admin → conta escolhida pelos desenvolvedores: acessa todos os
 *                  projetos e gerencia papéis/contas.
 */
export type SiteRole = "user" | "server_admin";

export const SITE_ROLE_LABEL: Record<SiteRole, string> = {
  user: "Usuário",
  server_admin: "ServerADM",
};

/** Conta do site exibida no diretório usado para convidar por e-mail. */
export type SiteUser = {
  uid: string;
  name: string;
  email: string;
  banned: boolean;
};

/** Permissões derivadas do papel no projeto — fonte única (UI e regras). */
export function canEditDashboard(role: MemberRole): boolean {
  return role === "admin" || role === "editor";
}

export function canManageMembers(role: MemberRole): boolean {
  return role === "admin";
}

export type Member = {
  id: string;
  /** UID da conta do site (ausente em documentos legados). */
  uid?: string;
  name: string;
  email: string;
  role: MemberRole;
  /** Projeto a que pertence — um membro é sempre convidado a um projeto. */
  dashboardId: string;
  invitedAt: string;
};

export type Dashboard = {
  id: string;
  name: string;
  description: string;
  /** Quem criou o projeto: admin permanente dele. */
  ownerUid?: string;
  createdAt: string;
  updatedAt: string;
};

export type NewDashboardInput = {
  name: string;
  description?: string;
};

export type NewMemberInput = {
  uid: string;
  name: string;
  email: string;
  role: MemberRole;
  dashboardId: string;
};
