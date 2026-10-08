import { useMemo, useState } from "react";
import { useLab, canEditDashboard, canManageMembers, ROLE_LABEL } from "./store";
import { ConfirmDialog } from "@/shared/components/ConfirmDialog";
import { useNotes } from "@/features/notes";
import type { Note } from "@/features/notes/types";
import type { Dashboard, MemberRole } from "./store";

export function DashboardsPageView() {
  const {
    dashboards,
    members,
    currentRole,
    createDashboard,
    updateDashboard,
    deleteDashboard,
  } = useLab();
  const { notes, updateNote } = useNotes();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Dashboard | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  /** Sprint 10 (H3): dashboard aguardando confirmação de exclusão. */
  const [pendingDelete, setPendingDelete] = useState<Dashboard | null>(null);

  const editable = canEditDashboard(currentRole);

  const notesByDashboard = useMemo(() => {
    const map = new Map<string, Note[]>();
    for (const d of dashboards) map.set(d.id, []);
    for (const n of notes) {
      if (n.dashboardId && map.has(n.dashboardId)) {
        map.get(n.dashboardId)!.push(n);
      }
    }
    return map;
  }, [dashboards, notes]);

  const unlinkedCount = notes.filter((n) => !n.dashboardId).length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-on-surface">
            Dashboards
          </h1>
          <p className="mt-1 text-sm text-on-surface-variant">
            Agrupe anotações por contexto e compartilhe com a equipe.
          </p>
        </div>
        {editable && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-on-brand transition hover:bg-brand-strong active:scale-[0.98]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo dashboard
          </button>
        )}
      </div>

      {dashboards.length === 0 ? (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-10 text-center">
          <p className="text-sm text-on-surface-variant">
            Nenhum dashboard ainda. Crie o primeiro para organizar suas notas.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {dashboards.map((d) => {
            const dNotes = notesByDashboard.get(d.id) ?? [];
            const dMembers = members.filter((m) => m.dashboardId === d.id);
            const isOpen = openId === d.id;
            return (
              <DashboardCard
                key={d.id}
                dashboard={d}
                notes={dNotes}
                members={dMembers}
                open={isOpen}
                editable={editable}
                unlinkedNotes={notes.filter((n) => !n.dashboardId)}
                onToggle={() => setOpenId(isOpen ? null : d.id)}
                onEdit={() => setEditing(d)}
                onDelete={() => setPendingDelete(d)}
                onLinkNote={(noteId) => updateNote(noteId, { dashboardId: d.id })}
                onUnlinkNote={(noteId) => updateNote(noteId, { dashboardId: undefined })}
              />
            );
          })}
        </div>
      )}

      {unlinkedCount > 0 && (
        <p className="mt-4 text-xs text-on-surface-variant/70">
          {unlinkedCount} anotação{unlinkedCount === 1 ? "" : "ões"} fora de
          qualquer dashboard. Abra um dashboard para vinculá-las.
        </p>
      )}

      {creating && (
        <DashboardFormModal onClose={() => setCreating(false)} />
      )}
      {editing && (
        <DashboardFormModal
          dashboard={editing}
          onClose={() => setEditing(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Excluir dashboard?"
          description={`“${pendingDelete.name}” será excluído. As anotações vinculadas são preservadas (ficam sem dashboard) e os membros convidados perdem o acesso.`}
          onConfirm={() => {
            deleteDashboard(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function DashboardCard({
  dashboard,
  notes,
  members,
  open,
  editable,
  unlinkedNotes,
  onToggle,
  onEdit,
  onDelete,
  onLinkNote,
  onUnlinkNote,
}: {
  dashboard: Dashboard;
  notes: Note[];
  members: ReturnType<typeof useLab>["members"];
  open: boolean;
  editable: boolean;
  unlinkedNotes: Note[];
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLinkNote: (noteId: string) => void;
  onUnlinkNote: (noteId: string) => void;
}) {
  const overdue = notes.filter(
    (n) => n.status !== "completed" && n.dueDate && n.dueDate < new Date().toISOString().slice(0, 10)
  ).length;

  return (
    <article className="flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm transition hover:border-outline-variant/60">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <h3 className="font-display text-base font-semibold text-on-surface">
            {dashboard.name}
          </h3>
          {dashboard.description && (
            <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
              {dashboard.description}
            </p>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-brand/15 px-2.5 py-1 text-xs font-medium text-brand-glow">
            {notes.length} notas
          </span>
          {overdue > 0 && (
            <span className="rounded-full border border-error/40 bg-error/15 px-2.5 py-1 text-xs font-medium text-red-400">
              {overdue} atrasada{overdue === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-on-surface-variant">
        {members.length === 0 ? (
          <span>Sem membros ainda</span>
        ) : (
          members.map((m) => (
            <span
              key={m.id}
              className="rounded bg-surface-container px-2 py-0.5"
              title={ROLE_LABEL[m.role]}
            >
              {m.name} · {ROLE_LABEL[m.role]}
            </span>
          ))
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3 border-t border-outline-variant/30 pt-3">
          {notes.length > 0 && (
            <ul className="space-y-1.5">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="flex items-center justify-between gap-2 rounded-md bg-surface-container/60 px-3 py-1.5 text-sm"
                >
                  <span className="truncate text-on-surface">{n.title}</span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => onUnlinkNote(n.id)}
                      className="shrink-0 text-xs text-on-surface-variant transition hover:text-error"
                      title="Remover do dashboard"
                    >
                      remover
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {editable && unlinkedNotes.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-on-surface-variant">
                Adicionar anotação
              </label>
              <select
                value=""
                aria-label="Adicionar anotação ao dashboard"
                onChange={(e) => e.target.value && onLinkNote(e.target.value)}
                className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface focus:border-brand focus:outline-none [&>option]:bg-surface-container-lowest [&>option]:text-on-surface"
              >
                <option value="">Escolher…</option>
                {unlinkedNotes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {editable && (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onEdit}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface"
              >
                Renomear
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="rounded-md px-2.5 py-1 text-xs font-medium text-on-surface-variant transition hover:bg-error/10 hover:text-error"
              >
                Excluir
              </button>
            </div>
          )}
        </div>
      )}

      {!open && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-3 self-start text-xs font-medium text-brand-glow transition hover:underline"
        >
          Ver detalhes
        </button>
      )}
    </article>
  );
}

function DashboardFormModal({
  dashboard,
  onClose,
}: {
  dashboard?: Dashboard;
  onClose: () => void;
}) {
  const { createDashboard, updateDashboard } = useLab();
  const [name, setName] = useState(dashboard?.name ?? "");
  const [description, setDescription] = useState(dashboard?.description ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("O nome é obrigatório.");
      return;
    }
    if (dashboard) {
      updateDashboard(dashboard.id, { name: name.trim(), description });
    } else {
      createDashboard({ name: name.trim(), description });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 shadow-xl">
        <h2 className="font-display text-lg font-semibold text-on-surface">
          {dashboard ? "Renomear dashboard" : "Novo dashboard"}
        </h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-on-surface">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Experimento B — Testes"
              className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-on-surface">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Do que se trata este agrupamento?"
              className="mt-1 block w-full rounded-md border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
            />
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
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
