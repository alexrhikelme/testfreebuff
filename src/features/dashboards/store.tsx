import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type {
  Dashboard,
  Member,
  MemberRole,
  NewDashboardInput,
  NewMemberInput,
} from "./types";
import {
  useDashboardsQuery as useConvexDashboards,
  useMembersQuery as useConvexMembers,
  useDashboardMutations as useConvexDashboardMutations,
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
} from "./types";
export { canEditDashboard, canManageMembers, ROLE_LABEL } from "./types";

const seedDashboards: Dashboard[] = [
  {
    id: "dash-seed-1",
    name: "Experimento A — Coleta",
    description: "Rotina de coleta e preparação de amostras.",
    createdAt: "2026-09-10T09:00:00.000Z",
    updatedAt: "2026-09-14T11:00:00.000Z",
  },
  {
    id: "dash-seed-2",
    name: "Análises e Relatórios",
    description: "Resultados, curvas de calibração e relatórios.",
    createdAt: "2026-09-11T10:00:00.000Z",
    updatedAt: "2026-09-13T15:00:00.000Z",
  },
];

const seedMembers: Member[] = [
  {
    id: "member-seed-1",
    name: "Ana Costa",
    email: "ana@lab.local",
    role: "admin",
    dashboardId: "dash-seed-1",
    invitedAt: "2026-09-10T09:05:00.000Z",
  },
  {
    id: "member-seed-2",
    name: "Bruno Lima",
    email: "bruno@lab.local",
    role: "editor",
    dashboardId: "dash-seed-1",
    invitedAt: "2026-09-11T10:00:00.000Z",
  },
  {
    id: "member-seed-3",
    name: "Carla Dias",
    email: "carla@lab.local",
    role: "viewer",
    dashboardId: "dash-seed-2",
    invitedAt: "2026-09-12T14:00:00.000Z",
  },
];

type LabContextValue = {
  dashboards: Dashboard[];
  members: Member[];
  /** Papel do usuário corrente (usuário simulado da Sprint 1). */
  currentRole: MemberRole;
  createDashboard: (input: NewDashboardInput) => Dashboard;
  updateDashboard: (id: string, patch: Partial<NewDashboardInput>) => void;
  deleteDashboard: (id: string) => void;
  addMember: (input: NewMemberInput) => Member;
  updateMemberRole: (id: string, role: MemberRole) => void;
  removeMember: (id: string) => void;
};

const LabContext = createContext<LabContextValue | null>(null);

/**
 * Sprint 8 (D1) — Dois modos atrás da mesma API:
 * - "convex": dashboards/membros reativos do banco, mutations no servidor;
 * - "local": estado em memória (protótipo e testes), comportamento intacto.
 */
export function LabProvider({ children }: { children: ReactNode }) {
  const isConvex = getBackendMode() === "convex";
  const convexDashboards = useConvexDashboards();
  const convexMembers = useConvexMembers();
  const convexMutations = useConvexDashboardMutations();
  const toast = useOptionalToast();

  const [localDashboards, setLocalDashboards] =
    useState<Dashboard[]>(seedDashboards);
  const [localMembers, setLocalMembers] = useState<Member[]>(seedMembers);

  const dashboards = isConvex ? convexDashboards : localDashboards;
  const members = isConvex ? convexMembers : localMembers;
  // Sprint 9 (D3): papel real do usuário autenticado, derivado da tabela
  // de membros pelo servidor (users:me). No modo local (protótipo), o
  // usuário simulado continua admin para não regredir a demonstração.
  const { user } = useOptionalAuth();
  const currentRole: MemberRole = user?.role ?? (isConvex ? "viewer" : "admin");

  const createDashboard = useCallback(
    (input: NewDashboardInput): Dashboard => {
      const id = makeId("dash");
      const dashboard: Dashboard = {
        id,
        name: input.name,
        description: input.description ?? "",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      if (isConvex) {
        void convexMutations
          .createDashboard(input, id)
          .then(() => toast.showToast("success", "Dashboard criado."))
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao criar dashboard."
            );
          });
        return dashboard;
      }
      setLocalDashboards((prev) => [dashboard, ...prev]);
      return dashboard;
    },
    [isConvex, convexMutations]
  );

  const updateDashboard = useCallback(
    (id: string, patch: Partial<NewDashboardInput>) => {
      if (isConvex) {
        void convexMutations
          .updateDashboard(id, patch)
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao salvar dashboard."
            );
          });
        return;
      }
      setLocalDashboards((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, ...patch, updatedAt: nowIso() } : d
        )
      );
    },
    [isConvex, convexMutations]
  );

  const deleteDashboard = useCallback(
    (id: string) => {
      if (isConvex) {
        void convexMutations
          .deleteDashboard(id)
          .then(() => toast.showToast("success", "Dashboard excluído (notas preservadas)."))
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao excluir dashboard."
            );
          });
        return;
      }
      setLocalDashboards((prev) => prev.filter((d) => d.id !== id));
      // No modo local o cascade é simulado: notas perdem o vínculo e os
      // membros do dashboard são removidos (o servidor faz isso atomicamente).
      setLocalMembers((prev) => prev.filter((m) => m.dashboardId !== id));
    },
    [isConvex, convexMutations]
  );

  const addMember = useCallback(
    (input: NewMemberInput): Member => {
      const id = makeId("member");
      const member: Member = {
        id,
        name: input.name,
        email: input.email,
        role: input.role,
        dashboardId: input.dashboardId,
        invitedAt: nowIso(),
      };
      if (isConvex) {
        void convexMutations
          .addMember(input, id)
          .then(() => toast.showToast("success", `Convite enviado a ${input.email}.`))
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao convidar membro."
            );
          });
        return member;
      }
      setLocalMembers((prev) => [member, ...prev]);
      return member;
    },
    [isConvex, convexMutations]
  );

  const updateMemberRole = useCallback(
    (id: string, role: MemberRole) => {
      if (isConvex) {
        void convexMutations
          .updateMemberRole(id, role)
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao alterar papel."
            );
          });
        return;
      }
      setLocalMembers((prev) =>
        prev.map((m) => (m.id === id ? { ...m, role } : m))
      );
    },
    [isConvex, convexMutations]
  );

  const removeMember = useCallback(
    (id: string) => {
      if (isConvex) {
        void convexMutations
          .removeMember(id)
          .then(() => toast.showToast("success", "Membro removido."))
          .catch((e: unknown) => {
            toast.showToast(
              "error",
              e instanceof Error ? e.message : "Erro ao remover membro."
            );
          });
        return;
      }
      setLocalMembers((prev) => prev.filter((m) => m.id !== id));
    },
    [isConvex, convexMutations]
  );

  const value: LabContextValue = {
    dashboards,
    members,
    currentRole,
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
