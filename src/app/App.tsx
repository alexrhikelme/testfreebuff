import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  AuthShell,
  RequireAuth,
  PublicOnly,
  ServerAdminRequestPage,
  useAuth,
} from "./router";
import { AppBackendProvider } from "@/shared/backend/AppBackendProvider";
import { ToastProvider } from "@/shared/components/Toast";
import { useLegacyAdoption, useSeedOnMount } from "@/shared/backend/hooks";
import { getBackendMode } from "@/shared/backend/config";
import { useConvexAuth } from "@convex-dev/auth/react";
import { NotesProvider } from "@/features/notes";
import { LabProvider } from "@/features/dashboards/store";
import { TrashProvider } from "@/features/trash";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import AppShellPage from "./pages/AppShellPage";
import DashboardOverviewPage from "./pages/DashboardOverviewPage";
import NotesPage from "./pages/NotesPage";
import DashboardsPage from "./pages/DashboardsPage";
import ProjectsPage from "./pages/ProjectsPage";
import TeamPage from "./pages/TeamPage";
import DocumentsPage from "./pages/DocumentsPage";
import TemplatesPage from "./pages/TemplatesPage";
import TrashPage from "./pages/TrashPage";
import "./../styles/global.css";

/**
 * Dispara o seed idempotente dentro do contexto do backend.
 *
 * No modo Firebase (Firestore), o seed cria o workspace inicial quando as
 * coleções estão vazias. No modo Convex, espera a sessão autenticada. No modo
 * local o seed é um no-op.
 *
 * Complicações:
 * - `useConvexAuth` só existe dentro do ConvexAuthProvider; por isso o seed
 *   do Convex fica em um componente separado, renderizado apenas no modo
 *   convex.
 * - O Firebase Auth ainda não está integrado; a sessão é local (ver
 *   AuthShell), então o seed do Firestore roda sem esperar autenticação.
 */
function ConvexSeedLauncher() {
  const { isAuthenticated } = useConvexAuth();
  useSeedOnMount(isAuthenticated);
  return null;
}

function FirebaseSeedLauncher() {
  // O Firestore só aceita escrita de conta registrada (e-mail verificado +
  // `users/{uid}` com papel de site). Todo usuário novo já entra como "user",
  // então o seed roda no primeiro acesso — sem liberação manual.
  const { user, isLoading, access } = useAuth();
  const canSeed =
    !isLoading &&
    user != null &&
    (access ? access.verified && access.role != null : true);
  useSeedOnMount(canSeed);
  // Dados do modelo antigo (projetos sem dono) só podem ser adotados por um
  // ServerADM, que é quem lê tudo pela regra.
  useLegacyAdoption(canSeed && access?.role === "server_admin");
  return null;
}

export default function App() {
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap";
    document.head.appendChild(css);
  }, []);

  const mode = getBackendMode();

  return (
    <AppBackendProvider>
      <BrowserRouter>
        <AuthShell>
          {mode === "convex" ? (
            <ConvexSeedLauncher />
          ) : mode === "firebase" ? (
            <FirebaseSeedLauncher />
          ) : null}
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
                        {/* Nível espaço de trabalho (atalhos e links antigos). */}
                        <Route path="notes" element={<NotesPage />} />
                        <Route path="dashboards" element={<DashboardsPage />} />
                        {/* Projetos ativos: página dedicada com todos os projetos. */}
                        <Route path="projects" element={<ProjectsPage />} />
                        <Route path="team" element={<TeamPage />} />
                        <Route
                          path="server-admin"
                          element={<ServerAdminRequestPage />}
                        />
                        <Route path="documents" element={<DocumentsPage />} />
                        <Route path="templates" element={<TemplatesPage />} />
                        <Route path="trash" element={<TrashPage />} />

                        {/* Projeto: todas as seções principais vivem DENTRO do
                            projeto — cada rota escopa os dados ao projectId. */}
                        <Route path="p/:projectId">
                          <Route index element={<DashboardOverviewPage />} />
                          <Route path="notes" element={<NotesPage />} />
                          <Route path="dashboards" element={<DashboardsPage />} />
                          <Route path="team" element={<TeamPage />} />
                          <Route path="documents" element={<DocumentsPage />} />
                          <Route path="templates" element={<TemplatesPage />} />
                          <Route path="trash" element={<TrashPage />} />
                        </Route>
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
