import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthShell, RequireAuth, PublicOnly } from "./router";
import { AppBackendProvider } from "@/shared/backend/AppBackendProvider";
import { ToastProvider } from "@/shared/components/Toast";
import { useSeedOnMount } from "@/shared/backend/hooks";
import { getBackendMode } from "@/shared/backend/config";
import { NotesProvider } from "@/features/notes";
import { LabProvider } from "@/features/dashboards/store";
import { TrashProvider } from "@/features/trash";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import AppShellPage from "./pages/AppShellPage";
import DashboardOverviewPage from "./pages/DashboardOverviewPage";
import NotesPage from "./pages/NotesPage";
import DashboardsPage from "./pages/DashboardsPage";
import TeamPage from "./pages/TeamPage";
import DocumentsPage from "./pages/DocumentsPage";
import TemplatesPage from "./pages/TemplatesPage";
import TrashPage from "./pages/TrashPage";
import "../styles/global.css";

/**
 * Sprint 8 (D1) — Dispara o seed idempotente dentro do contexto Convex.
 * No modo local (protótipo/testes) é um no-op.
 */
function ConvexSeedLauncher() {
  useSeedOnMount();
  return null;
}

export default function App() {
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap";
    document.head.appendChild(css);
  }, []);

  return (
    <AppBackendProvider>
      {getBackendMode() === "convex" && <ConvexSeedLauncher />}
      <BrowserRouter>
        <AuthShell>
          <ToastProvider>
          <LabProvider>
            <NotesProvider>
              <TrashProvider>
              <Routes>
                <Route element={<PublicOnly />}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/auth" element={<AuthPage />} />
                </Route>

                <Route path="/app" element={<RequireAuth />}>
                  <Route element={<AppShellPage />}>
                    <Route index element={<DashboardOverviewPage />} />
                    <Route path="notes" element={<NotesPage />} />
                    <Route path="dashboards" element={<DashboardsPage />} />
                    <Route path="team" element={<TeamPage />} />
                    <Route path="documents" element={<DocumentsPage />} />
                    <Route path="templates" element={<TemplatesPage />} />
                    <Route path="trash" element={<TrashPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              </TrashProvider>
            </NotesProvider>
          </LabProvider>
          </ToastProvider>
        </AuthShell>
      </BrowserRouter>
    </AppBackendProvider>
  );
}
