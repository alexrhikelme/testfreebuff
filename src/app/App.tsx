import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthShell, RequireAuth, PublicOnly } from "./router";
import { NotesProvider } from "@/features/notes";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import AppShellPage from "./pages/AppShellPage";
import DashboardOverviewPage from "./pages/DashboardOverviewPage";
import NotesPage from "./pages/NotesPage";
import DashboardsPage from "./pages/DashboardsPage";
import TeamPage from "./pages/TeamPage";
import "../styles/global.css";

export default function App() {
  useEffect(() => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap";
    document.head.appendChild(css);
  }, []);

  return (
    <BrowserRouter>
      <AuthShell>
        <NotesProvider>
        <Routes>
          <Route element={<PublicOnly />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
          </Route>

          <Route element={<RequireAuth />}>
            <Route element={<AppShellPage />}>
              <Route index element={<DashboardOverviewPage />} />
              <Route path="notes" element={<NotesPage />} />
              <Route path="dashboards" element={<DashboardsPage />} />
              <Route path="team" element={<TeamPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </NotesProvider>
      </AuthShell>
    </BrowserRouter>
  );
}
