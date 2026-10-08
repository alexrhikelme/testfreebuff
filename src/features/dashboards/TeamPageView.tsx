import { useEffect, useMemo, useState } from "react";
import {
  useLab,
  canManageMembers,
  ROLE_LABEL,
  type MemberRole,
} from "./store";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { useToast } from "@/shared/components/Toast";
import { getBackendMode } from "@/shared/backend/config";

/**
 * Sprint 11 — Janela "Equipe & Parceiros":
 * cards das equipes multidisciplinares + tabela "Membros & Parceiros"
 * com busca por nome/e-mail, convite e ações por linha (menu "...").
 *
 * A tabela combina os parceiros fixos do ecossistema Combogó com os
 * membros reais convidados aos dashboards (LabProvider).
 */

type TeamDef = {
  name: string;
  description: string;
  memberCount: number;
  /** Líder exibido em formato curto no rodapé do card. */
  leader: string;
  icon: "pen" | "code" | "gamepad" | "board";
};

const TEAMS: TeamDef[] = [
  {
    name: "Design UI/UX",
    description: "Interfaces digitais, design system e experiência do usuário.",
    memberCount: 8,
    leader: "Beatriz A.",
    icon: "pen",
  },
  {
    name: "Desenvolvimento Web",
    description: "Aplicações web, arquitetura em nuvem e APIs do ecossistema.",
    memberCount: 14,
    leader: "Carlos E.",
    icon: "code",
  },
  {
    name: "Polo Games",
    description: "Desenvolvimento de jogos 2D/3D e soluções interativas imersivas.",
    memberCount: 10,
    leader: "Rafael M.",
    icon: "gamepad",
  },
  {
    name: "Gestão Ágil",
    description: "Facilitação ágil, sprints, métricas e acompanhamento de entregas.",
    memberCount: 6,
    leader: "Juliana F.",
    icon: "board",
  },
];

type PartnerSeed = {
  id: string;
  name: string;
  email: string;
  team: string;
  roleLabel: string;
};

const SEED_PARTNERS: PartnerSeed[] = [
  { id: "partner-1", name: "Beatriz Albuquerque", email: "beatriz.albuquerque@unicap.br", team: "Design UI/UX", roleLabel: "Lead Designer" },
  { id: "partner-2", name: "Carlos Eduardo Silveira", email: "carlos.silveira@unicap.br", team: "Desenvolvimento Web", roleLabel: "Tech Lead" },
  { id: "partner-3", name: "Rafael Melo", email: "rafael.melo@unicap.br", team: "Polo Games", roleLabel: "Game Director" },
  { id: "partner-4", name: "Juliana Freire", email: "juliana.freire@unicap.br", team: "Gestão Ágil", roleLabel: "Agile Coach" },
  { id: "partner-5", name: "Rodrigo Mendes da Fonte", email: "rodrigo@portodigital.org", team: "Porto Digital", roleLabel: "Parceiro Externo" },
  { id: "partner-6", name: "Larissa Valença", email: "larissa.valenca@unicap.br", team: "Desenvolvimento Web", roleLabel: "Bolsista Jr" },
];

type Row = {
  id: string;
  name: string;
  email: string;
  team: string;
  roleLabel: string;
  /** Presente quando o membro vem do LabProvider (papel editável). */
  storeRole?: MemberRole;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function TeamPageView() {
  const { members, dashboards, currentRole, addMember, updateMemberRole, removeMember } =
    useLab();
  const { showToast } = useToast();
  const [inviting, setInviting] = useState(false);
  const [partners, setPartners] = useState<PartnerSeed[]>(SEED_PARTNERS);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);
  const canManage = canManageMembers(currentRole);

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openMenu]);

  const rows: Row[] = useMemo(() => {
    const fromStore: Row[] = members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      team: dashboards.find((d) => d.id === m.dashboardId)?.name ?? "—",
      roleLabel: ROLE_LABEL[m.role],
      storeRole: m.role,
    }));
    const fromPartners: Row[] = partners.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      team: p.team,
      roleLabel: p.roleLabel,
    }));
    return [...fromPartners, ...fromStore];
  }, [members, dashboards, partners]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (teamFilter === null || r.team === teamFilter) &&
        (q === "" ||
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q))
    );
  }, [rows, search, teamFilter]);

  const removeRow = (row: Row) => {
    if (row.storeRole) {
      removeMember(row.id);
      if (getBackendMode() === "local") showToast("success", "Membro removido.");
    } else {
      setPartners((prev) => prev.filter((p) => p.id !== row.id));
      showToast("success", "Parceiro removido da equipe.");
    }
  };

  const copyEmail = (row: Row) => {
    try {
      void navigator.clipboard?.writeText(row.email);
    } catch {
      // Clipboard indisponível (ex.: contexto não seguro) — segue o aviso.
    }
    showToast("info", `E-mail copiado: ${row.email}`);
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface">
            Equipe &amp; Parceiros
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Pessoas e times colaboradores do ecossistema Combogó Unicap.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setInviting(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-on-brand transition hover:bg-brand-strong active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            Convidar Membro
          </button>
        )}
      </div>

      {!canManage && (
        <p className="mb-4 rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-4 py-3 text-xs text-on-surface-variant">
          Apenas administradores podem convidar ou remover membros.
        </p>
      )}

      {/* Equipes multidisciplinares */}
      <section className="mb-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
          Equipes Multidisciplinares ({TEAMS.length})
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {TEAMS.map((t) => (
            <button
              key={t.name}
              type="button"
              onClick={() =>
                setTeamFilter((prev) => (prev === t.name ? null : t.name))
              }
              aria-pressed={teamFilter === t.name}
              className={
                "flex flex-col rounded-xl border bg-surface-container-lowest p-4 text-left transition hover:shadow-lg hover:shadow-brand/5 " +
                (teamFilter === t.name
                  ? "border-brand/60 ring-1 ring-brand/40"
                  : "border-outline-variant/40 hover:border-brand/40")
              }
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand-glow ring-1 ring-brand/20">
                  <TeamIcon name={t.icon} />
                </span>
                <span className="text-sm text-on-surface-variant">{t.memberCount} membros</span>
              </div>
              <h3 className="font-display text-base font-semibold text-on-surface">{t.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-on-surface-variant">
                {t.description}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-outline-variant/30 pt-3 text-sm">
                <span className="text-on-surface-variant">
                  Líder: <span className="font-semibold text-on-surface">{t.leader}</span>
                </span>
                <svg
                  className="text-on-surface-variant"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </div>
            </button>
          ))}
        </div>
        {teamFilter && (
          <p className="mt-3 text-xs text-on-surface-variant">
            Filtrando por{" "}
            <button
              type="button"
              onClick={() => setTeamFilter(null)}
              className="font-semibold text-brand-glow underline underline-offset-2 transition hover:opacity-80"
            >
              {teamFilter} ✕
            </button>
          </p>
        )}
      </section>

      {/* Membros & Parceiros */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            Membros &amp; Parceiros ({rows.length})
          </h2>
          <div className="relative w-full max-w-xs">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              aria-label="Buscar membro por nome ou e-mail"
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest py-2.5 pl-9 pr-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest px-6 py-10 text-center">
            <p className="text-sm font-medium text-on-surface">Nenhum membro encontrado.</p>
            <p className="mt-1 text-sm text-on-surface-variant">
              Tente outro nome, e-mail ou remova o filtro de equipe.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-outline-variant/40 text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  <th className="px-4 py-3 font-semibold">Colaborador</th>
                  <th className="px-4 py-3 font-semibold">Equipe</th>
                  <th className="px-4 py-3 font-semibold">Papel</th>
                  <th className="px-4 py-3 text-right font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {visible.map((row) => (
                  <tr key={row.id} className="transition hover:bg-surface-container/40">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand-glow ring-1 ring-brand/25">
                          {initials(row.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-on-surface">
                            {row.name}
                          </p>
                          <p className="truncate text-xs text-on-surface-variant">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-on-surface-variant">{row.team}</td>
                    <td className="px-4 py-3">
                      {row.storeRole && canManage ? (
                        <select
                          value={row.storeRole}
                          onChange={(e) =>
                            updateMemberRole(row.id, e.target.value as MemberRole)
                          }
                          aria-label={`Papel de ${row.name}`}
                          className="rounded-md border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-xs text-on-surface focus:border-brand focus:outline-none [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
                        >
                          {(Object.keys(ROLE_LABEL) as MemberRole[]).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABEL[r]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-sm text-on-surface">{row.roleLabel}</span>
                      )}
                    </td>
                    <td className="relative px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setOpenMenu(openMenu === row.id ? null : row.id)}
                        aria-label={`Ações de ${row.name}`}
                        aria-haspopup="menu"
                        aria-expanded={openMenu === row.id}
                        className="rounded-md px-2 py-1 text-lg leading-none text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
                      >
                        …
                      </button>
                      {openMenu === row.id && (
                        <>
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-hidden="true"
                            className="fixed inset-0 z-30 cursor-default"
                            onClick={() => setOpenMenu(null)}
                          />
                          <div
                            role="menu"
                            className="absolute right-4 top-11 z-40 w-48 overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest py-1 text-left shadow-xl"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                copyEmail(row);
                                setOpenMenu(null);
                              }}
                              className="block w-full px-3 py-2 text-sm text-on-surface transition hover:bg-surface-container"
                            >
                              Copiar e-mail
                            </button>
                            {canManage && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setPendingDelete(row);
                                  setOpenMenu(null);
                                }}
                                className="block w-full px-3 py-2 text-sm text-error transition hover:bg-error/10"
                              >
                                Remover da equipe
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {inviting && (
        <InviteMemberModal
          dashboards={dashboards}
          onClose={() => setInviting(false)}
          onInvite={(input) => {
            const member = addMember(input);
            if (getBackendMode() === "local") {
              showToast("success", `Convite enviado a ${input.email}.`);
            }
            return member;
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Remover membro?"
          description={`${pendingDelete.name} perderá o acesso a este workspace.`}
          confirmLabel="Remover"
          onConfirm={() => {
            removeRow(pendingDelete);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function TeamIcon({ name }: { name: TeamDef["icon"] }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "pen") {
    return (
      <svg {...common}>
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    );
  }
  if (name === "code") {
    return (
      <svg {...common}>
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    );
  }
  if (name === "gamepad") {
    return (
      <svg {...common}>
        <line x1="6" y1="12" x2="10" y2="12" />
        <line x1="8" y1="10" x2="8" y2="14" />
        <line x1="15" y1="13" x2="15.01" y2="13" />
        <line x1="18" y1="11" x2="18.01" y2="11" />
        <rect x="2" y="6" width="20" height="12" rx="4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
    </svg>
  );
}

function InviteMemberModal({
  dashboards,
  onClose,
  onInvite,
}: {
  dashboards: ReturnType<typeof useLab>["dashboards"];
  onClose: () => void;
  onInvite: ReturnType<typeof useLab>["addMember"];
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("viewer");
  const [dashboardId, setDashboardId] = useState(dashboards[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Informe o nome.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Informe um e-mail válido.");
      return;
    }
    if (!dashboardId) {
      setError("Escolha um dashboard.");
      return;
    }
    onInvite({ name: name.trim(), email: email.trim(), role, dashboardId });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-xl">
        <h2 className="font-display text-lg font-semibold text-on-surface">
          Convidar Membro
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Diego Souza"
              autoFocus
              className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="diego@unicap.br"
              className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-on-surface">Papel</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-brand focus:outline-none [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
              >
                {(Object.keys(ROLE_LABEL) as MemberRole[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-on-surface">Equipe</label>
              <select
                value={dashboardId}
                onChange={(e) => setDashboardId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface focus:border-brand focus:outline-none [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
              >
                {dashboards.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-outline-variant/30 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface transition hover:bg-surface-container"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-on-brand transition hover:bg-brand-strong"
            >
              Convidar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
