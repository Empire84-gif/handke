import { useEffect, useMemo, useState } from "react";

import Sidebar from "./components/layout/Sidebar";

import ClientsPage from "./pages/ClientsPage";
import DashboardPage from "./pages/DashboardPage";
import DocumentsPage from "./pages/DocumentsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import MailsPage from "./pages/MailsPage";
import PaymentsPage from "./pages/PaymentsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import ProjectsPage from "./pages/ProjectsPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import StatsPage from "./pages/StatsPage";
import TasksPage from "./pages/TasksPage";

import { getCurrentUser, logoutUser } from "./api/authApi";
import { getSettings } from "./api/settingsApi";

function App() {
  const [activeMenu, setActiveMenu] = useState("Dashboard");
  const [authView, setAuthView] = useState("login");
  const [user, setUser] = useState(null);
  const [settings, setSettings] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const isResetPasswordRoute = useMemo(() => {
    return window.location.pathname === "/reset-password";
  }, []);

  useEffect(() => {
    if (isResetPasswordRoute) {
      setAuthView("reset");
      setIsCheckingAuth(false);
      return;
    }

    async function checkAuth() {
      try {
        const data = await getCurrentUser();

        if (data.authenticated) {
          setUser(data.user);
          await loadSettings();
        } else {
          setUser(null);
          setSettings(null);
        }
      } catch (error) {
        setUser(null);
        setSettings(null);
      } finally {
        setIsCheckingAuth(false);
      }
    }

    checkAuth();
  }, [isResetPasswordRoute]);

  async function loadSettings() {
    try {
      const data = await getSettings();
      setSettings(data.settings || null);
    } catch (error) {
      console.error(error);
      setSettings(null);
    }
  }

  async function handleLogin(loggedUser) {
    setUser(loggedUser);
    await loadSettings();
  }

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (error) {
      // Jeżeli backend zwróci błąd, i tak czyścimy frontend lokalnie.
    }

    setUser(null);
    setSettings(null);
    setActiveMenu("Dashboard");
    setAuthView("login");
  }

  if (isCheckingAuth) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-head">
            <h1>Ładowanie CRM...</h1>
            <p>Sprawdzanie sesji użytkownika.</p>
          </div>
        </section>
      </main>
    );
  }

  if (!user) {
    if (authView === "forgot") {
      return <ForgotPasswordPage onBack={() => setAuthView("login")} />;
    }

    if (authView === "reset") {
      return <ResetPasswordPage onBack={() => setAuthView("login")} />;
    }

    return (
      <LoginPage
        onLogin={handleLogin}
        onForgotPassword={() => setAuthView("forgot")}
      />
    );
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        onLogout={handleLogout}
        settings={settings}
      />

      <main className="main-content">
        {activeMenu === "Dashboard" ? (
          <DashboardPage setActiveMenu={setActiveMenu} />
        ) : activeMenu === "Klienci" ? (
          <ClientsPage />
        ) : activeMenu === "Płatności" ? (
          <PaymentsPage />
        ) : activeMenu === "Zadania" ? (
          <TasksPage />
        ) : activeMenu === "Projekty" ? (
          <ProjectsPage />
        ) : activeMenu === "Dokumenty" ? (
          <DocumentsPage />
        ) : activeMenu === "Maile" ? (
          <MailsPage />
        ) : activeMenu === "Statystyki" ? (
          <StatsPage />
        ) : activeMenu === "Ustawienia" ? (
          <SettingsPage onSettingsSaved={loadSettings} />
        ) : (
          <PlaceholderPage title={activeMenu} />
        )}
      </main>
    </div>
  );
}

export default App;