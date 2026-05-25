import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import AuthScreen from "./components/AuthScreen";
import Dashboard from "./components/Dashboard";
import SimulationConfig from "./components/SimulationConfig";
import TestArena from "./components/TestArena";
import ReportViewer from "./components/ReportViewer";
import { CertificationOverview } from "./types";

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [language, setLanguage] = useState<"pt" | "en">("pt");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    // Evitar quebra no SSR ou ambiente de teste sem window
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("istqb_theme");
      if (savedTheme === "dark" || savedTheme === "light") {
        return savedTheme;
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
    localStorage.setItem("istqb_theme", theme);
  }, [theme]);
  
  // Navigation states: "auth" | "dashboard" | "simulation_config" | "simulating" | "report"
  const [currentView, setCurrentView] = useState<"auth" | "dashboard" | "simulation_config" | "simulating" | "report">("auth");
  
  // Selection payloads
  const [selectedCert, setSelectedCert] = useState<CertificationOverview | null>(null);
  const [activeSimulationMode, setActiveSimulationMode] = useState<"training" | "exam">("training");
  const [viewAttemptId, setViewAttemptId] = useState<string | null>(null);

  // Restore authenticated session and saved language on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("istqb_token");
    const savedEmail = localStorage.getItem("istqb_email");
    const savedLang = localStorage.getItem("istqb_lang") as "pt" | "en";
    
    if (savedLang) {
      setLanguage(savedLang);
    }

    if (savedToken && savedEmail) {
      setToken(savedToken);
      setEmail(savedEmail);
      setCurrentView("dashboard");
    } else {
      setCurrentView("auth");
    }
  }, []);

  const handleLanguageChange = (lang: "pt" | "en") => {
    setLanguage(lang);
    localStorage.setItem("istqb_lang", lang);
  };

  const handleLoginSuccess = (userToken: string, userEmail: string) => {
    localStorage.setItem("istqb_token", userToken);
    localStorage.setItem("istqb_email", userEmail);
    setToken(userToken);
    setEmail(userEmail);
    setCurrentView("dashboard");
  };

  const handleLogout = () => {
    localStorage.removeItem("istqb_token");
    localStorage.removeItem("istqb_email");
    setToken(null);
    setEmail(null);
    setCurrentView("auth");
  };

  const handleSelectCertification = (cert: CertificationOverview) => {
    setSelectedCert(cert);
    setCurrentView("simulation_config");
  };

  const handleStartSimulation = (mode: "training" | "exam") => {
    setActiveSimulationMode(mode);
    setCurrentView("simulating");
  };

  const handleSimulationFinished = (attemptId: string) => {
    setViewAttemptId(attemptId);
    setCurrentView("report");
  };

  const handleViewAttemptResult = (attemptId: string) => {
    setViewAttemptId(attemptId);
    setCurrentView("report");
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative selection:bg-indigo-500 selection:text-white transition-colors duration-250">
      {currentView === "auth" && (
        <AuthScreen 
          language={language}
          onLanguageChange={handleLanguageChange}
          onLoginSuccess={handleLoginSuccess} 
        />
      )}

      {currentView === "dashboard" && token && email && (
        <Dashboard
          token={token}
          userEmail={email}
          language={language}
          onLanguageChange={handleLanguageChange}
          onLogout={handleLogout}
          onSelectCertification={handleSelectCertification}
          onViewAttempt={handleViewAttemptResult}
          onStartPracticeDirectly={(cert) => {
            setSelectedCert(cert);
            setActiveSimulationMode("training");
            setCurrentView("simulating");
          }}
        />
      )}

      {currentView === "simulation_config" && selectedCert && (
        <SimulationConfig
          certification={selectedCert}
          language={language}
          onCancel={() => setCurrentView("dashboard")}
          onStartSimulation={handleStartSimulation}
        />
      )}

      {currentView === "simulating" && selectedCert && token && (
        <TestArena
          certificationId={selectedCert.id}
          mode={activeSimulationMode}
          language={language}
          token={token}
          onFinished={handleSimulationFinished}
          onExit={() => setCurrentView("dashboard")}
        />
      )}

      {currentView === "report" && viewAttemptId && token && (
        <ReportViewer
          attemptId={viewAttemptId}
          token={token}
          language={language}
          onBackToDashboard={() => setCurrentView("dashboard")}
        />
      )}

      {/* Botão de alternar tema global (Modo Escuro) */}
      <button
        onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
        className="fixed bottom-6 right-6 z-50 p-3.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-amber-400 rounded-full shadow-lg border border-slate-200 dark:border-slate-700 hover:scale-110 active:scale-95 hover:shadow-xl dark:hover:shadow-indigo-500/10 transition-all cursor-pointer flex items-center justify-center"
        title={theme === "light" ? (language === "en" ? "Dark Mode" : "Modo Escuro") : (language === "en" ? "Light Mode" : "Modo Claro")}
        aria-label="Toggle Theme"
        id="theme-toggle-btn"
      >
        {theme === "light" ? <Moon className="w-5 h-5 text-slate-700" /> : <Sun className="w-5 h-5 text-amber-400" />}
      </button>
    </div>
  );
}
