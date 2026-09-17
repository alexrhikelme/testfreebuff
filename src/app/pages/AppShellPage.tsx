import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../router/AppRouter";
import { Logo } from "@/shared/components/Logo";

export default function AppShellPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await new Promise((r) => setTimeout(r, 400));
    signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-on-background">
      <header className="border-b border-outline-variant/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Logo to="/app" size="md" />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-sm text-on-surface-variant">
              <span className="text-xs font-medium uppercase tracking-wide">
                {user?.role}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1 text-sm text-on-surface">
              <span className="font-medium">{user?.name}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md p-1 text-on-surface-variant transition hover:bg-error/10 hover:text-error"
                title="Sair"
              >
                <svg
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
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1">
        <aside className="w-56 shrink-0 border-r border-outline-variant/50 bg-surface/40">
          <nav className="flex flex-col gap-1 p-3">
            <SideLink to="/app" label="Visão geral" icon="grid" />
            <SideLink to="/app/notes" label="Anotações" icon="file-text" />
            <SideLink to="/app/dashboards" label="Dashboards" icon="layout-dashboard" />
            <SideLink to="/app/team" label="Equipe" icon="users" />
          </nav>

          <div className="mt-auto border-t border-outline-variant/50 p-3">
            <p className="text-xs text-on-surface-variant/70">
              Sprint 2 — CRUD de anotações
            </p>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex-1 p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SideLink({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: string;
}) {
  const { pathname } = useLocation();
  const isActive = to === "/app" ? pathname === "/app" : pathname.startsWith(to);

  return (
    <NavLink
      to={to}
      end={to === "/app"}
      className={
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition " +
        (isActive
          ? "bg-brand/15 text-brand-glow ring-1 ring-brand/40"
          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface")
      }
    >
      <Icon name={icon} className="h-4 w-4 shrink-0" />
      {label}
    </NavLink>
  );
}

function Icon({ name, className }: { name: string; className?: string }) {
  const common = {
    className,
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "grid") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
      </svg>
    );
  }
  if (name === "file-text") {
    return (
      <svg {...common}>
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  if (name === "layout-dashboard") {
    return (
      <svg {...common}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    );
  }
  if (name === "users") {
    return (
      <svg {...common}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  return null;
}
