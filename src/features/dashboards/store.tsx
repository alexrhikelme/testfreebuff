import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import type {
  Dashboard,
  Member,
  MemberRole,
  NewDashboardInput,
  NewMemberInput,
  SiteUser,
} from "./types";
import {
  useDashboardsQuery as useRemoteDashboards,
  useMembersQuery as useRemoteMembers,
  useSiteUsersQuery as useRemoteSiteUsers,
  useDashboardMutations as useRemoteDashboardMutations,
} from "@/shared/backend/hooks";
import { getBackendMode, makeId, nowIso } from "@/shared/backend/config";
import { useOptionalToast } from "@/shared/components/Toast";
import { useOptionalAuth } from "@/app/router/AppRouter";

export type {
  MemberRole,
  Member,
  Dashboard,
  NewDashboardInput,
  NewMemberInput,
  SiteRole,
  SiteUser,
} from "./types";
export {
  canEditDashboard,
  canManageMembers,
  ROLE_LABEL,
  SITE_ROLE_LABEL,
} from "./types";

const LOCAL_OWNER = "local-ana@unicap.br";

const seedDashboards: Dashboard[] = [
  {
    id: "dash-q3",
    name: "Q3 Product Launch",
    description: "Go-to-market do Q3: pricing, ativação e campanha de lançamento.",
    ownerUid: LOCAL_OWNER,
    createdAt: "2026-09-01T09:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
  },
  {
    id: "dash-sprint42",
    name: "Sprint 42 - Core Features",
    description: "Entrega das funcionalidades núcleo planejadas na Sprint 42.",
    ownerUid: LOCAL_OWNER,
    createdAt: "2026-09-05T09:00:00.000Z",
    updatedAt: "2026-09-14T10:00:00.000Z",
  },
  {
    id: "dash-design",
    name: "Design System 2.0",
    description: "Tokens, componentes e documentação do Design System 2.0.",
    ownerUid: LOCAL_OWNER,
    createdAt: "2026-09-07T09:00:00.000Z",
    updatedAt: "2026-09-13T10:00:00.000Z",
  },
  {
    id: "dash-seed-1",
    name: "Experimento A — Coleta",
    description: "Rotina de coleta e preparação de amostras.",
    ownerUid: "local-ana@unicap.br",
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-14T11:00:00.000Z",
  },
  {
    id: "dash-seed-2",
    name: "Análises e Relatórios",
    description: "Resultados, curvas de calibração e relatórios.",
    ownerUid: "local-ana@unicap.br",
    createdAt: "2026-09-11T10:00:00.000Z",
    updatedAt: "2026-09-13T15:00:00.000Z",
  },
];

const seedMembers: Member[] = [
  {
    id: "dash-seed-1_local-ana@unicap.br",
    uid: "local-ana@unicap.br",
    name: "Ana Costa",
    email: "ana@unicap.br",
    role: "admin",
    dashboardId: "dash-seed-1",
    invitedAt: "2026-09-10T09:05:00.000Z",
  },
  {
    id: "dash-seed-1_local-bruno@unicap.br",
    uid: "local-bruno@unicap.br",
    name: "Bruno Lima",
    email: "bruno@unicap.br",
    role: "editor",
    dashboardId: "dash-seed-1",
    invitedAt: "2026-09-11T10:00:00.000Z",
  },
  {
    id: "dash-seed-2_local-carla@unicap.br",
    uid: "local-carla@unicap.br",
    name: "Carla Dias",
    email: "carla@unicap.br",
    role: "viewer",
    dashboardId: "dash-seed-2",
    invitedAt: "2026-09-12T14:00:00.000Z",
  },
];

const seedSiteUsers: SiteUser[] = [
  { uid: "local-ana@unicap.br", name: "Ana Costa", email: "ana@unicap.br", banned: false },
  { uid: "local-bruno@unicap.br", name: "Bruno Lima", email: "bruno@unicap.br", banned: false },
  { uid: "local-carla@unicap.br", name: "Carla Dias", email: "carla@unicap.br", banned: false },
];

type LabContextValue = {
  dashboards: Dashboard[];
  members: Member[];
  /** Diretório de contas do site (convite por e-mail). */
  siteUsers: SiteUser[];
  /** Papel do usuário no SITE (não confundir com o papel no projeto). */
  isServerAdmin: boolean;
  /** Papel do usuário em um projeto; `null` = não participa. */
  roleInProject: (projectId: string) => MemberRole | null;
  /** Pode escrever nas notas do projeto (admin/escritor). */
  canEditProject: (projectId?: string) => boolean;
  /** Pode gerenciar o projeto e atribuir papéis (admin do projeto). */
  canManageProject: (projectId?: string) => boolean;
  createDashboard: (input: NewDashboardInput) => Dashboard;
  updateDashboard: (id: string, patch: Partial<NewDashboardInput>) => void;
  deleteDashboard: (id: string) => void;
  addMember: (input: NewMemberInput) => Member;
  updateMemberRole: (id: string, role: MemberRole) => void;
  removeMember: (id: string) => void;
};

const LabContext = createContext<LabContextValue | null>(null);

/**
 * Dois modos atrás da mesma API:
 * - remoto (firebase/convex): projetos e membros reativos do banco;
 * - "local": estado em memória (protótipo e testes).
 *
 * Permissões são SEMPRE por projeto: `users.role` no site não dá acesso ao
 * projeto de outra pessoa — só o papel dentro do projeto (ou ServerADM).
 */
export function LabProvider({ children }: { children: ReactNode }) {
  const isRemote = getBackendMode() !== "local";
  const remoteDashboards = useRemoteDashboards();
  const remoteMembers = useRemoteMembers();
  const remoteSiteUsers = useRemoteSiteUsers();
  const remoteMutations = useRemoteDashboardMutations();
  const toast = useOptionalToast();

  const [localDashboards, setLocalDashboards] = useState<Dashboard[]>(
    seedDashboards,
  );
  const [localMembers, setLocalMembers] = useState<Member[]>(seedMembers);

  const dashboards = isRemote ? remoteDashboards : localDashboards;
  const members = isRemote ? remoteMembers : localMembers;
  const siteUsers = isRemote ? remoteSiteUsers : seedSiteUsers;

  const { user } = useOptionalAuth();
  const isServerAdmin = !isRemote || user?.role === "server_admin";

  const roleInProject = useCallback(
    (projectId: string): MemberRole | null => {
      // Modo local: a demonstração continua com acesso total.
      if (!isRemote) return "admin";
      if (!user) return null;
      const project = dashboards.find((d) => d.id === projectId);
      if (project?.ownerUid === user.id) return "admin";
      const member = members.find(
        (m) => m.dashboardId === projectId && m.uid === user.id,
      );
      if (member) return member.role;
      if (isServerAdmin) return "admin";
      return null;
    },
    [isRemote, user, dashboards, members, isServerAdmin],
  );

  const canEditProject = useCallback(
    (projectId?: string): boolean => {
      // Sem projeto = item pessoal (anotação avulsa): o dono sempre edita.
      if (!projectId) return true;
      const role = roleInProject(projectId);
      return role !== null && (role === "admin" || role === "editor");
    },
    [roleInProject],
  );

  const canManageProject = useCallback(
    (projectId?: string): boolean => {
      if (!projectId) return false;
      return roleInProject(projectId) === "admin";
    },
    [roleInProject],
  );

  const createDashboard = useCallback(
    (input: NewDashboardInput): Dashboard => {
      const id = makeId("dash");
      const dashboard: Dashboard = {
        id,
        name: input.name,
        description: input.description ?? "",
        ownerUid: user?.id,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      if (isRemote) {
        void remoteMutations
          .createDashboard(input, id)
          .then(() => toast.showToast("success", "Projeto criado. Você é o admin dele."))
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao criar projeto.",
            );
          });
        return dashboard;
      }
      setLocalDashboards((prev) => [dashboard, ...prev]);
      setLocalMembers((prev) =>
        user
          ? [
              {
                id: `${id}_${user.id}`,
                uid: user.id,
                name: user.name,
                email: user.email,
                role: "admin",
                dashboardId: id,
                invitedAt: nowIso(),
              },
              ...prev,
            ]
          : prev,
      );
      return dashboard;
    },
    [isRemote, remoteMutations, toast, user],
  );

  const updateDashboard = useCallback(
    (id: string, patch: Partial<NewDashboardInput>) => {
      if (isRemote) {
        void remoteMutations.updateDashboard(id, patch).catch((e: unknown) => {
          toast.showToast(
            "error",
            e instanceof Error ? e.message : "Erro ao salvar projeto.",
          );
        });
        return;
      }
      setLocalDashboards((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, ...patch, updatedAt: nowIso() } : d,
        ),
      );
    },
    [isRemote, remoteMutations, toast],
  );

  const deleteDashboard = useCallback(
    (id: string) => {
      if (isRemote) {
        void remoteMutations
          .deleteDashboard(id)
          .then(() =>
            toast.showToast("success", "Projeto excluído (notas preservadas)."),
          )
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao excluir projeto.",
            );
          });
        return;
      }
      setLocalDashboards((prev) => prev.filter((d) => d.id !== id));
      setLocalMembers((prev) => prev.filter((m) => m.dashboardId !== id));
    },
    [isRemote, remoteMutations, toast],
  );

  const addMember = useCallback(
    (input: NewMemberInput): Member => {
      const member: Member = {
        id: `${input.dashboardId}_${input.uid}`,
        uid: input.uid,
        name: input.name,
        email: input.email,
        role: input.role,
        dashboardId: input.dashboardId,
        invitedAt: nowIso(),
      };
      if (isRemote) {
        void remoteMutations
          .addMember(input)
          .then(() =>
            toast.showToast("success", `${input.name} agora é ${input.role}.`),
          )
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao convidar membro.",
            );
          });
        return member;
      }
      setLocalMembers((prev) => [
        member,
        ...prev.filter((m) => m.id !== member.id),
      ]);
      return member;
    },
    [isRemote, remoteMutations, toast],
  );

  const updateMemberRole = useCallback(
    (id: string, role: MemberRole) => {
      if (isRemote) {
        void remoteMutations.updateMemberRole(id, role).catch((e: unknown) => {
          toast.showToast(
            "error",
            e instanceof Error ? e.message : "Erro ao alterar papel.",
          );
        });
        return;
      }
      setLocalMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, role } : m)),
      );
    },
    [isRemote, remoteMutations, toast],
  );

  const removeMember = useCallback(
    (id: string) => {
      if (isRemote) {
        void remoteMutations
          .removeMember(id)
          .then(() => toast.showToast("success", "Membro removido."))
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao remover membro.",
            );
          });
        return;
      }
      setLocalMembers((prev) => prev.filter((m) => m.id !== id));
    },
    [isRemote, remoteMutations, toast],
  );

  const value: LabContextValue = {
    dashboards,
    members,
    siteUsers,
    isServerAdmin,
    roleInProject,
    canEditProject,
    canManageProject,
    createDashboard,
    updateDashboard,
    deleteDashboard,
    addMember,
    updateMemberRole,
    removeMember,
  };

  return <LabContext.Provider value={value}>{children}</LabContext.Provider>;
}

export function useLab() {
  const ctx = useContext(LabContext);
  if (!ctx) {
    throw new Error("useLab must be used within LabProvider");
  }
  return ctx;
}

/** Variante tolerante: telas que também rodam isoladas em testes. */
export function useOptionalLab(): LabContextValue | null {
  return useContext(LabContext);
}
