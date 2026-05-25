import { useEffect, useState } from "react";
import { Award, Clock, BookOpen, ChevronRight, ChevronLeft, BarChart3, ListCollapse, LogOut, ArrowUpRight, GraduationCap, Sparkles, CheckCircle2, User, Trophy, Play, LayoutDashboard, Target, Layers, HelpCircle, Languages } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { CertificationOverview, AttemptSummary, ChartProgressionPoint } from "../types";
import { translations } from "../utils/translations";

interface DashboardProps {
  token: string;
  userEmail: string;
  language: "pt" | "en";
  onLanguageChange: (lang: "pt" | "en") => void;
  onLogout: () => void;
  onSelectCertification: (cert: CertificationOverview) => void;
  onViewAttempt: (attemptId: string) => void;
}

export default function Dashboard({ 
  token, 
  userEmail, 
  language,
  onLanguageChange,
  onLogout, 
  onSelectCertification, 
  onViewAttempt 
}: DashboardProps) {
  const [certifications, setCertifications] = useState<CertificationOverview[]>([]);
  const [chartData, setChartData] = useState<ChartProgressionPoint[]>([]);
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"dashboard" | "certifications" | "performance" | "study">("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("istqb_sidebar_collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("istqb_sidebar_collapsed", isSidebarCollapsed.toString());
  }, [isSidebarCollapsed]);

  const t = translations[language];

  const loadData = async () => {
    try {
      const headers = { 
        "Authorization": `Bearer ${token}`,
        "X-App-Language": language 
      };

      // Load certifications
      const certRes = await fetch("/api/certifications", { headers });
      const certs = await certRes.json();
      if (!certRes.ok) throw new Error(certs.error || (language === "en" ? "Error loading certifications." : "Erro ao carregar certificações."));

      // Load user history
      const histRes = await fetch("/api/user/history", { headers });
      const history = await histRes.json();
      if (!histRes.ok) throw new Error(history.error || (language === "en" ? "Error loading history." : "Erro ao carregar histórico."));

      setCertifications(certs);
      setChartData(history.chartProgression || []);
      setAttempts(history.listHistory || []);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token, language]);

  useEffect(() => {
    if (loading) return;

    const timer = setTimeout(() => {
      const container = document.getElementById("dashboard-scroll-container");
      if (!container) return;

      const sections = ["dashboard", "certifications", "study"];
      const observers = sections.map((id) => {
        const element = document.getElementById(`section-${id}`);
        if (!element) return null;

        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.intersectionRatio >= 0.45) {
                setActiveTab(id as any);
              }
            });
          },
          {
            root: container,
            threshold: [0.45],
          }
        );
        observer.observe(element);
        return { observer, element };
      });

      return () => {
        observers.forEach((obs) => {
          if (obs) {
            obs.observer.unobserve(obs.element);
          }
        });
      };
    }, 150);

    return () => clearTimeout(timer);
  }, [loading]);

  // Compute metrics
  const completedCount = attempts.length;
  const passedAttempts = attempts.filter(a => a.verdict === "Passaria" || a.verdict === "Pass");
  const approvedCount = passedAttempts.length;
  const passRate = completedCount > 0 ? Math.round((approvedCount / completedCount) * 100) : 0;
  
  // Calculate Avg Accuracy
  const avgAccuracy = completedCount > 0 
    ? Math.round(attempts.reduce((sum, item) => sum + item.scorePercentage, 0) / completedCount * 10) / 10 
    : 0;

  // Render relative time
  const getRelativeDateString = (isoString: string) => {
    const elapsed = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(elapsed / 1000 / 60);
    if (minutes < 1) return language === "en" ? "Just now" : "Agora mesmo";
    if (minutes < 60) return language === "en" ? `${minutes}m ago` : `Há ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return language === "en" ? `${hours}h ago` : `Há ${hours} horas`;
    const days = Math.floor(hours / 24);
    return language === "en" ? `${days}d ago` : `Há ${days} dias`;
  };

  const username = userEmail ? userEmail.split("@")[0] : "QA Analyst";
  const userRole = userEmail && (userEmail.includes("mentor") || userEmail.includes("lead")) ? "QA Lead / Tech Mentor" : "QA Engineer II";

  // Navigation handlers to toggle view focus on isolated sections
  const handleTabClick = (tabId: "dashboard" | "certifications" | "performance" | "study") => {
    setActiveTab(tabId);
    const element = document.getElementById(`section-${tabId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans transition-colors duration-250">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h4 className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm tracking-tight">{t.appName}</h4>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 max-w-xs">{language === "en" ? "Loading credentials and compiling dashboard metrics..." : "Carregando métricas individuais e orquestrando conexões..."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex overflow-y-auto lg:overflow-hidden font-sans w-full transition-colors duration-250">
      
      {/* LEFT STATIC SIDEBAR (Professional Polish Theme) */}
      <aside className={`bg-slate-900 text-white hidden lg:flex flex-col shrink-0 border-r border-slate-800 transition-all duration-300 ${isSidebarCollapsed ? "w-20" : "w-64"}`}>
        
        {/* Brand Block */}
        <div className={`p-6 border-b border-slate-800 flex items-center justify-between gap-3 ${isSidebarCollapsed ? "flex-col py-6 px-2" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-sm italic text-white shadow-md shrink-0">
              A
            </div>
            {!isSidebarCollapsed && (
              <span className="text-lg font-bold tracking-tight font-display transition-opacity duration-300">
                ISTQB<span className="text-blue-500">Arena</span>
              </span>
            )}
          </div>
          
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className={`p-1.5 rounded-lg bg-slate-800/40 border border-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0 ${isSidebarCollapsed ? "mt-2" : ""}`}
            title={isSidebarCollapsed ? (language === "en" ? "Expand menu" : "Expandir menu") : (language === "en" ? "Collapse menu" : "Minimizar menu")}
          >
            {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Nav links */}
        <nav className={`flex-1 p-4 space-y-1.5 pt-6 ${isSidebarCollapsed ? "px-2" : ""}`}>
          <button
            onClick={() => handleTabClick("dashboard")}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold cursor-pointer ${isSidebarCollapsed ? "justify-center" : ""} ${
              activeTab === "dashboard"
                ? "bg-blue-600/10 text-blue-400"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
            title={isSidebarCollapsed ? "Dashboard" : undefined}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span className="transition-opacity duration-300">Dashboard</span>}
          </button>

          <button
            onClick={() => handleTabClick("certifications")}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold cursor-pointer ${isSidebarCollapsed ? "justify-center" : ""} ${
              activeTab === "certifications"
                ? "bg-blue-600/10 text-blue-400"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
            title={isSidebarCollapsed ? (language === "en" ? "Certifications" : "Catálogo Exames") : undefined}
          >
            <Target className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span className="transition-opacity duration-300">{language === "en" ? "Certifications" : "Catálogo Exames"}</span>}
          </button>

          <button
            onClick={() => handleTabClick("study")}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold cursor-pointer ${isSidebarCollapsed ? "justify-center" : ""} ${
              activeTab === "study"
                ? "bg-blue-600/10 text-blue-400"
                : "text-slate-400 hover:text-white hover:bg-slate-800/50"
            }`}
            title={isSidebarCollapsed ? (language === "en" ? "Exam History" : "Simulados Concluídos") : undefined}
          >
            <ListCollapse className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span className="transition-opacity duration-300">{language === "en" ? "Exam History" : "Simulados Concluídos"}</span>}
          </button>
        </nav>

        {/* Rodapé do Sidebar (User Info, Language Selector, Logout) */}
        <div className={`p-4 border-t border-slate-800 space-y-4 shrink-0`}>
          
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-4">
              {/* Language toggler minimal – flags */}
              <button
                onClick={() => onLanguageChange(language === "pt" ? "en" : "pt")}
                className="w-8 h-8 rounded-lg overflow-hidden border-2 border-slate-700 hover:border-blue-500 transition-all cursor-pointer hover:scale-110 flex items-center justify-center shadow-md"
                title={language === "pt" ? "Switch to English" : "Mudar para Português"}
              >
                {language === "pt" ? (
                  /* UK flag */
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="w-full h-full">
                    <clipPath id="sc"><rect width="60" height="30"/></clipPath>
                    <clipPath id="tc"><polygon points="0,0 30,15 0,30"/><polygon points="60,0 30,15 60,30"/></clipPath>
                    <rect width="60" height="30" fill="#012169"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#tc)"/>
                    <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
                    <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
                  </svg>
                ) : (
                  /* Brazil flag */
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 42" className="w-full h-full">
                    <rect width="60" height="42" fill="#009c3b"/>
                    <polygon points="30,3 57,21 30,39 3,21" fill="#FFDF00"/>
                    <circle cx="30" cy="21" r="10.5" fill="#002776"/>
                    <path d="M20,23 Q30,17 40,23" stroke="#fff" strokeWidth="1.8" fill="none"/>
                    <circle cx="25" cy="19" r="0.9" fill="white"/>
                    <circle cx="30" cy="17" r="0.9" fill="white"/>
                    <circle cx="35" cy="19" r="0.9" fill="white"/>
                    <circle cx="27" cy="23" r="0.9" fill="white"/>
                    <circle cx="33" cy="23" r="0.9" fill="white"/>
                  </svg>
                )}
              </button>

              {/* User Avatar */}
              <div 
                className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-xs border border-slate-700 shadow-sm"
                title={`${username} (${userRole})`}
              >
                {username.substring(0, 2).toUpperCase()}
              </div>

              {/* Logout Button minimal */}
              <button
                onClick={onLogout}
                className="w-8 h-8 rounded-lg bg-rose-950/20 hover:bg-rose-900/40 text-rose-500 flex items-center justify-center transition-colors cursor-pointer border border-rose-950/30"
                title={t.logout}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Language Selector – flags */}
              <div className="flex items-center justify-between bg-slate-800/40 border border-slate-800/60 rounded-lg py-1.5 px-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <Languages className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono">{language === "en" ? "Language" : "Idioma"}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* PT – Brazil */}
                  <button
                    onClick={() => onLanguageChange("pt")}
                    title="Português (Brasil)"
                    className={`w-7 h-5 rounded overflow-hidden border-2 transition-all cursor-pointer hover:scale-110 ${
                      language === "pt" ? "border-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" : "border-slate-700 opacity-50 hover:opacity-80"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 42" className="w-full h-full">
                      <rect width="60" height="42" fill="#009c3b"/>
                      <polygon points="30,3 57,21 30,39 3,21" fill="#FFDF00"/>
                      <circle cx="30" cy="21" r="10.5" fill="#002776"/>
                      <path d="M20,23 Q30,17 40,23" stroke="#fff" strokeWidth="1.8" fill="none"/>
                      <circle cx="25" cy="19" r="0.9" fill="white"/>
                      <circle cx="30" cy="17" r="0.9" fill="white"/>
                      <circle cx="35" cy="19" r="0.9" fill="white"/>
                      <circle cx="27" cy="23" r="0.9" fill="white"/>
                      <circle cx="33" cy="23" r="0.9" fill="white"/>
                    </svg>
                  </button>
                  {/* EN – UK */}
                  <button
                    onClick={() => onLanguageChange("en")}
                    title="English (UK)"
                    className={`w-7 h-5 rounded overflow-hidden border-2 transition-all cursor-pointer hover:scale-110 ${
                      language === "en" ? "border-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]" : "border-slate-700 opacity-50 hover:opacity-80"
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="w-full h-full">
                      <clipPath id="stc"><polygon points="0,0 30,15 0,30"/><polygon points="60,0 30,15 60,30"/></clipPath>
                      <rect width="60" height="30" fill="#012169"/>
                      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#stc)"/>
                      <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
                      <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* User Profile Block */}
              <div className="flex items-center gap-3 bg-slate-850 p-2.5 rounded-lg border border-slate-800/50">
                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm border border-blue-500/20 shrink-0">
                  {username.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-200 truncate capitalize">{username}</p>
                  <p className="text-[9px] text-slate-400 font-mono uppercase truncate mt-0.5">{userRole}</p>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                className="w-full py-2 px-3 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 hover:border-rose-500/30 text-rose-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logout}</span>
              </button>

            </div>
          )}

        </div>

      </aside>

      {/* RIGHT CONTENT AREA */}
      <main className="flex-1 flex flex-col min-h-screen lg:h-screen overflow-visible lg:overflow-hidden">

        {/* Upper Header Nav bar - Compact and Mobile Only */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-3 px-4 shrink-0 flex lg:hidden items-center justify-between gap-4 shadow-3xs transition-colors duration-250">
          
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-xs italic">
              A
            </div>
            <h1 className="font-display font-extrabold text-slate-900 dark:text-slate-100 tracking-tight text-sm">
              ISTQB Arena
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Minimal Mobile Lang toggle – flags */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onLanguageChange("pt")}
                title="Português (Brasil)"
                className={`w-7 h-5 rounded overflow-hidden border-2 transition-all cursor-pointer hover:scale-110 ${
                  language === "pt" ? "border-blue-500" : "border-slate-300 dark:border-slate-700 opacity-50"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 42" className="w-full h-full">
                  <rect width="60" height="42" fill="#009c3b"/>
                  <polygon points="30,3 57,21 30,39 3,21" fill="#FFDF00"/>
                  <circle cx="30" cy="21" r="10.5" fill="#002776"/>
                  <path d="M20,23 Q30,17 40,23" stroke="#fff" strokeWidth="1.8" fill="none"/>
                  <circle cx="25" cy="19" r="0.9" fill="white"/>
                  <circle cx="30" cy="17" r="0.9" fill="white"/>
                  <circle cx="35" cy="19" r="0.9" fill="white"/>
                  <circle cx="27" cy="23" r="0.9" fill="white"/>
                  <circle cx="33" cy="23" r="0.9" fill="white"/>
                </svg>
              </button>
              <button
                onClick={() => onLanguageChange("en")}
                title="English (UK)"
                className={`w-7 h-5 rounded overflow-hidden border-2 transition-all cursor-pointer hover:scale-110 ${
                  language === "en" ? "border-blue-500" : "border-slate-300 dark:border-slate-700 opacity-50"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="w-full h-full">
                  <clipPath id="mstc"><polygon points="0,0 30,15 0,30"/><polygon points="60,0 30,15 60,30"/></clipPath>
                  <rect width="60" height="30" fill="#012169"/>
                  <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
                  <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#mstc)"/>
                  <path d="M30,0 V30 M0,15 H60" stroke="#fff" strokeWidth="10"/>
                  <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
                </svg>
              </button>
            </div>

            {/* Logout Mobile */}
            <button
              onClick={onLogout}
              className="p-1 px-2 text-rose-500 hover:text-rose-600 text-xs font-semibold flex items-center gap-1"
              title={t.logout}
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Scroll Snap Workstation Container */}
        <div 
          id="dashboard-scroll-container" 
          className="flex-1 overflow-y-auto lg:snap-y lg:snap-mandatory scroll-smooth w-full"
        >
          {error && (
            <div className="m-6 md:m-8 mb-0 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-4 rounded-xl text-xs text-red-700 dark:text-red-400 font-semibold shadow-xs">
              {error}
            </div>
          )}

          {/* Seção 1: Dashboard Geral (KPIs + Gráfico evolutivo concentrados) */}
          <section 
            id="section-dashboard" 
            className="lg:snap-start lg:snap-always h-auto lg:min-h-screen w-full max-w-[1600px] mx-auto p-6 md:p-8 flex flex-col justify-between shrink-0"
          >
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              
              {/* Three Column KPI metrics grid of the theme */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Readiness KPI Card */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs flex flex-col justify-between min-h-28">
                  <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-wider">{t.passingRate}</p>
                    <div className="w-7 h-7 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-450 flex items-center justify-center text-xs">
                      <Trophy className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 tracking-tight">{passRate}%</p>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2.5">
                    <div 
                      className="bg-blue-600 dark:bg-blue-500 h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${passRate}%` }}
                    />
                  </div>
                </div>

                {/* Simulated Tests KPI Card */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs flex flex-col justify-between min-h-28">
                  <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-wider">{t.attemptsCount}</p>
                    <div className="w-7 h-7 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-355 flex items-center justify-center text-xs">
                      <Play className="w-3.5 h-3.5 fill-slate-500 text-slate-500 dark:text-slate-400 shrink-0" />
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{completedCount}</p>
                  <p className="text-[9px] text-green-600 dark:text-green-400 font-bold font-mono uppercase mt-1 leading-none">
                    {completedCount > 0 ? (language === "en" ? `+${completedCount} total active attempts` : `+${completedCount} tentativas ativas no total`) : (language === "en" ? "Awaiting attempts" : "Aguardando simulados")}
                  </p>
                </div>

                {/* Average Accuracy KPI Card */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs flex flex-col justify-between min-h-28">
                  <div className="flex items-center justify-between pb-1">
                    <p className="text-[10px] font-bold text-slate-655 dark:text-slate-400 uppercase tracking-wider">{t.averageScore}</p>
                    <div className="w-7 h-7 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-355 flex items-center justify-center text-xs">
                      <Award className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{avgAccuracy}%</p>
                  <p className="text-[9px] text-slate-655 dark:text-slate-450 mt-1">
                    {language === "en" ? "Minimum required code: 65%" : "Meta corporativa de aprovação: 65%"}
                  </p>
                </div>

              </div>

              {/* Section: Performance tracking analysis */}
              <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-3xs space-y-4">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                        <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        {t.chartTitle}
                      </h3>
                      <p className="text-[10px] text-slate-655 dark:text-slate-400 mt-0.5 leading-relaxed">{language === "en" ? "Progress curves mapped chronologically" : "Curva histórica do rendimento absoluto por tentativa sucessiva."}</p>
                    </div>
                  </div>

                  <div className="p-1">
                    {chartData.length > 0 ? (
                      <div className="w-full">
                        <div className="h-48 md:h-[280px] lg:h-[320px] xl:h-[380px] text-xs font-mono text-slate-655 dark:text-slate-400">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                              <defs>
                                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" stroke="currentColor" strokeOpacity={0.1} />
                              <XAxis 
                                dataKey="date" 
                                tickFormatter={(v) => new Date(v).toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR', { month: 'short', day: 'numeric' })}
                                stroke="currentColor"
                                fontSize={9}
                              />
                              <YAxis domain={[0, 100]} stroke="currentColor" fontSize={9} />
                              <Tooltip 
                                content={({ active, payload }) => {
                                  if (active && payload && payload.length) {
                                    const pt = payload[0].payload;
                                    return (
                                      <div className="bg-slate-900/90 text-white p-3 rounded-lg border border-slate-800 dark:border-slate-700 shadow-md text-[11px] font-sans backdrop-blur-xs">
                                        <p className="font-bold text-[10px] text-slate-400 font-mono mb-1">{new Date(pt.date).toLocaleDateString()}</p>
                                        <p className="text-blue-400"><strong className="text-white">{pt.certificationId}</strong>: {payload[0].value}%</p>
                                        <p className="capitalize text-slate-300">Modo: {pt.mode === 'training' ? t.trainingMode : t.examMode}</p>
                                        <p className="text-slate-400 font-mono text-[9px] mt-0.5">Duração: {pt.timeSpentMins} min</p>
                                      </div>
                                    );
                                  }
                                  return null;
                                }}
                              />
                              <ReferenceLine 
                                y={65} 
                                stroke="#ef4444" 
                                strokeDasharray="4 4" 
                                strokeWidth={1.5}
                                label={{ 
                                  value: language === "en" ? "Official Pass Limit (65%)" : "Corte ISTQB Oficial (65%)", 
                                  fill: "#ef4444", 
                                  fontSize: 9, 
                                  fontWeight: "bold",
                                  position: "top",
                                  offset: 5
                                }} 
                              />
                              <Area 
                                type="monotone" 
                                dataKey="score" 
                                stroke="#2563eb" 
                                strokeWidth={3} 
                                fillOpacity={1}
                                fill="url(#colorScore)"
                                dot={{ r: 5, stroke: "#2563eb", strokeWidth: 2, fill: "#ffffff" }}
                                activeDot={{ r: 6, stroke: "#2563eb", strokeWidth: 2, fill: "#ffffff" }} 
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                        <div className="w-9 h-9 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <BarChart3 className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">{language === "en" ? "Empty timeline chart" : "Gráfico em branco"}</span>
                          <p className="text-[10px] text-slate-655 dark:text-slate-400 max-w-xs mt-0.5 px-4 leading-relaxed">
                            {language === "en" ? "Complete simulation attempts to observe your technical performance curves." : "Conclua simulados para visualizar a curva evolutiva do seu rendimento."}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-655 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 text-center">
                    {language === "en" ? "Real-time accuracy coefficient progression tracker." : "Visualização do coeficiente de acertos em tempo real."}
                  </div>
                </div>
              </div>

            </div>
          </section>

          {/* Seção 2: Catálogo de Certificações (Isolated catalog segments) */}
          <section 
            id="section-certifications" 
            className="lg:snap-start lg:snap-always h-auto lg:min-h-screen w-full max-w-[1600px] mx-auto p-6 md:p-8 flex flex-col justify-center shrink-0"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
                  <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  {t.activeCertifications}
                </h3>
                <span className="text-[10px] font-mono font-bold text-slate-655 dark:text-slate-400">
                  {certifications.length} {language === "en" ? "Active Syllabus Modules" : "Módulos Conectados ao Co-piloto IA"}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {certifications.map((cert) => {
                  const hasTried = attempts.some(a => a.certificationId === cert.id);
                  const bestTry = hasTried ? Math.max(...attempts.filter(a => a.certificationId === cert.id).map(a => a.scorePercentage)) : null;

                  return (
                    <div
                      key={cert.id}
                      onClick={() => onSelectCertification(cert)}
                      className="group bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 transition-all p-5 flex flex-col justify-between gap-4 cursor-pointer shadow-3xs relative overflow-hidden active:scale-98/100"
                    >
                      {/* Background badge identifier decorator */}
                      <div className="absolute right-0 bottom-0 bg-blue-50 dark:bg-blue-950/20 text-blue-100/30 dark:text-blue-900/10 text-7xl font-sans tracking-tight font-black opacity-30 select-none translate-x-4 translate-y-4 group-hover:scale-105 transition-transform">
                        {cert.id.split("-")[0]}
                      </div>

                      <div className="space-y-2 relative z-10">
                        
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="py-0.5 px-2 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-mono text-[9px] font-bold uppercase tracking-wider">
                            ISTQB {cert.id}
                          </span>
                          
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400 dark:text-slate-500" /> {cert.timeLimitMins}m
                          </span>
                        </div>

                        <h4 className="font-display font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all">
                          {cert.name}
                        </h4>

                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-655 dark:text-slate-400 relative z-10 font-mono">
                        <span>{cert.questionCount} {language === 'en' ? 'questions' : 'questões'}</span>
                        {bestTry !== null ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded leading-none">
                            Best: {bestTry}%
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-0.5 hover:underline">
                            {t.startTraining} <Play className="w-2.5 h-2.5 fill-blue-600 dark:fill-blue-400 shrink-0" />
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Seção 3: Histórico de Simulados (Isolated simulation history list) */}
          <section 
            id="section-study" 
            className="lg:snap-start lg:snap-always h-auto lg:min-h-screen w-full max-w-[1600px] mx-auto p-6 md:p-8 flex flex-col justify-between shrink-0"
          >
            <div className="space-y-4 flex-1">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 space-y-4 transition-colors duration-200">
                
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                  <h3 className="font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ListCollapse className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
                    {t.recentHistory}
                  </h3>
                  <span className="text-[10px] text-slate-655 dark:text-slate-400 font-mono">
                    {attempts.length} {language === 'en' ? 'attempts recorded' : 'tentativas salvas na nuvem'}
                  </span>
                </div>

                {attempts.length > 0 ? (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[48vh] overflow-y-auto pr-2">
                    {attempts.map((attempt) => {
                      const isPassed = attempt.verdict === "Passaria" || attempt.verdict === "Pass";
                      return (
                        <div
                          key={attempt.id}
                          className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {attempt.certificationName}
                              </span>
                              <span className="inline-flex py-0.5 px-2 rounded bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-350 font-mono text-[9px] uppercase tracking-wide border border-slate-200 dark:border-slate-700">
                                {attempt.mode === "training" ? t.trainingMode : t.examMode}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-605 dark:text-slate-400 flex items-center gap-2 font-mono">
                              <span>{getRelativeDateString(attempt.date)}</span>
                              <span>•</span>
                              <span>{language === 'en' ? 'Duration' : 'Tempo'}: {Math.round(attempt.timeSpentSeconds / 60)} min</span>
                              <span>•</span>
                              <span>{language === 'en' ? 'Ratio' : 'Gabarito'}: {attempt.correctCount} / {attempt.totalQuestions} {t.hits}</span>
                            </p>
                          </div>

                          <div className="flex items-center gap-3.5 self-end sm:self-auto">
                            <div className="text-right">
                              <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100 leading-none">{attempt.scorePercentage}%</div>
                              <span className={`inline-flex py-0.5 px-2 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none mt-1 ${
                                isPassed 
                                  ? "bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-400" 
                                  : "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400"
                              }`}>
                                {isPassed ? t.passedLabel : t.failedLabel}
                              </span>
                            </div>

                            <button
                              onClick={() => onViewAttempt(attempt.id)}
                              className="py-1.5 px-3.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-750 text-white dark:text-slate-100 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-3xs border border-transparent dark:border-slate-800"
                            >
                              {t.viewReportBtn}
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center space-y-3">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800">
                      <BookOpen className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-xs text-slate-800 block">{language === "en" ? "No simulations recorded" : "Nenhum simulado executado"}</span>
                      <p className="text-[11px] text-slate-655 dark:text-slate-400 max-w-sm leading-relaxed mx-auto">
                        {t.noHistoryYet}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Global Footer of the Workspace */}
            <footer className="py-4 border-t border-slate-200 dark:border-slate-800 text-center text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-auto">
              {t.compiledByArena}
            </footer>
          </section>

        </div>
      </main>

    </div>
  );
}
