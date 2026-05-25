import { useEffect, useState } from "react";
import { Award, Clock, BookOpen, ChevronRight, BarChart3, ListCollapse, LogOut, ArrowUpRight, GraduationCap, Sparkles, CheckCircle2, User, Trophy, Play, LayoutDashboard, Target, Layers, HelpCircle, Languages } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
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

  // Navigation handlers to scroll smoothly to sections or toggle view focus
  const handleTabClick = (tabId: "dashboard" | "certifications" | "performance" | "study") => {
    setActiveTab(tabId);
    if (tabId === "certifications") {
      document.getElementById("section-catalog")?.scrollIntoView({ behavior: "smooth" });
    } else if (tabId === "performance") {
      document.getElementById("section-performance")?.scrollIntoView({ behavior: "smooth" });
    } else if (tabId === "study") {
      document.getElementById("section-history")?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h4 className="font-display font-bold text-slate-800 text-sm tracking-tight">{t.appName} Hub</h4>
        <p className="text-[11px] text-slate-500 mt-1 max-w-xs">{language === "en" ? "Loading credentials and compiling dashboard metrics..." : "Carregando métricas individuais e orquestrando conexões..."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex overflow-hidden font-sans w-full">
      
      {/* LEFT STATIC SIDEBAR (Professional Polish Theme) */}
      <aside className="w-64 bg-slate-900 text-white hidden lg:flex flex-col shrink-0 border-r border-slate-850">
        
        {/* Brand Block */}
        <div className="p-6 border-b border-slate-850 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center font-bold text-sm italic text-white shadow-md">
            A
          </div>
          <span className="text-lg font-bold tracking-tight font-display">
            ISTQB<span className="text-blue-500">Arena</span>
          </span>
        </div>

        {/* Sidebar Nav links */}
        <nav className="flex-1 p-4 space-y-1.5 pt-6">
          <button
            onClick={() => handleTabClick("dashboard")}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-blue-600/10 text-blue-400"
                : "text-slate-450 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            Dashboard
          </button>

          <button
            onClick={() => handleTabClick("certifications")}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold cursor-pointer ${
              activeTab === "certifications"
                ? "bg-blue-600/10 text-blue-400"
                : "text-slate-455 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <Target className="w-4 h-4 shrink-0" />
            {language === "en" ? "Cert Certifications" : "Catálogo Exames"}
          </button>

          <button
            onClick={() => handleTabClick("performance")}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold cursor-pointer ${
              activeTab === "performance"
                ? "bg-blue-600/10 text-blue-400"
                : "text-slate-455 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <BarChart3 className="w-4 h-4 shrink-0" />
            {language === "en" ? "Performance Stats" : "Curva Rendimento"}
          </button>

          <button
            onClick={() => handleTabClick("study")}
            className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors text-xs font-semibold cursor-pointer ${
              activeTab === "study"
                ? "bg-blue-600/10 text-blue-400"
                : "text-slate-455 hover:text-white hover:bg-slate-800/50"
            }`}
          >
            <ListCollapse className="w-4 h-4 shrink-0" />
            {language === "en" ? "Exam History" : "Simulados Concluídos"}
          </button>
        </nav>

        {/* Session Widget */}
        <div className="p-4 border-t border-slate-850">
          <div className="bg-slate-800/20 border border-slate-800/40 rounded-xl p-4 text-xs text-slate-400 relative overflow-hidden">
            <div className="absolute right-2 bottom-2 bg-slate-800 text-blue-500 rounded p-1 opacity-20 pointer-events-none">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">{language === "en" ? "GEMINI AI MENTOR ACTIVE" : "Mentor IA Integrado"}</p>
            <p className="text-white font-medium text-xs leading-relaxed mb-0.5">{language === "en" ? "Dynamic Exam Analytics" : "Metodologias Ativas ISTQB"}</p>
            <p className="text-[10px] text-slate-500 font-mono">{language === "en" ? "Ready to give feedbacks" : "Pronto para fornecer feedbacks"}</p>
          </div>
        </div>

      </aside>

      {/* RIGHT SCROLLABLE MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        
        {/* Upper Header Nav bar */}
        <header className="bg-white border-b border-slate-205 py-4 px-6 md:px-8 sticky top-0 z-40 flex items-center justify-between gap-4 shadow-3xs">
          
          <div className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center font-bold text-white text-xs italic">
              A
            </div>
            <h1 className="font-display font-extrabold text-slate-900 tracking-tight text-md">
              ISTQB Arena
            </h1>
          </div>

          <div className="hidden lg:block">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
              ISTQB ARENA CO-PILOT
            </span>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight leading-none mt-0.5">
              {t.dashboardTitle}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            
            {/* Dynamic Languages Selector */}
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-205 rounded-lg py-1 px-2.5">
              <Languages className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as "pt" | "en")}
                className="text-[11px] font-bold text-slate-650 outline-none border-none cursor-pointer bg-transparent"
              >
                <option value="pt">🇧🇷 PT</option>
                <option value="en">🇺🇸 EN</option>
              </select>
            </div>

            <div className="hidden sm:block text-right">
              <p className="text-xs font-bold text-slate-900 capitalize">{username}</p>
              <p className="text-[9px] text-slate-450 font-medium font-mono uppercase leading-none mt-0.5">{userRole}</p>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-800 text-xs">
              {username.substring(0, 2).toUpperCase()}
            </div>

            <button
              onClick={onLogout}
              title={t.logout}
              className="p-1 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t.logout}</span>
            </button>
          </div>

        </header>

        {/* Dashboard Workstation Container */}
        <div className="p-6 md:p-8 space-y-6 max-w-7xl w-full mx-auto flex-1">
          
          {error && (
            <div className="bg-red-50 border border-red-250 p-4 rounded-xl text-xs text-red-700 font-semibold shadow-xs">
              {error}
            </div>
          )}

          {/* Three Column KPI metrics grid of the theme */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Readiness KPI Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between min-h-28">
              <div className="flex items-center justify-between pb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.passingRate}</p>
                <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-blue-650 tracking-tight">{passRate}%</p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2.5">
                <div 
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
                  style={{ width: `${passRate}%` }}
                />
              </div>
            </div>

            {/* Simulated Tests KPI Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between min-h-28">
              <div className="flex items-center justify-between pb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.attemptsCount}</p>
                <div className="w-7 h-7 rounded bg-slate-50 text-slate-600 flex items-center justify-center text-xs">
                  <Play className="w-3.5 h-3.5 fill-slate-500 text-slate-500" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{completedCount}</p>
              <p className="text-[9px] text-green-600 font-bold font-mono uppercase mt-1 leading-none">
                {completedCount > 0 ? `+${completedCount} total active attempts` : "Aguardando simulados"}
              </p>
            </div>

            {/* Average Accuracy KPI Card */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs flex flex-col justify-between min-h-28">
              <div className="flex items-center justify-between pb-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.averageScore}</p>
                <div className="w-7 h-7 rounded bg-slate-50 text-slate-600 flex items-center justify-center text-xs">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{avgAccuracy}%</p>
              <p className="text-[9px] text-slate-400 mt-1">
                {language === "en" ? "Minimum required code: 65%" : "Meta corporativa de aprovação: 65%"}
              </p>
            </div>

          </div>

          {/* Section: Performance tracking analysis */}
          <div id="section-performance" className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-3xs space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                    {t.chartTitle}
                  </h3>
                  <p className="text-[10px] text-slate-450 mt-0.5 leading-relaxed">{language === "en" ? "Progress curves mapped chronologically" : "Curva histórica do rendimento absoluto por tentativa sucessiva."}</p>
                </div>
              </div>

              <div className="p-1">
                {chartData.length > 0 ? (
                  <div className="w-full">
                    <div className="h-48 md:h-64 text-xs font-mono">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(v) => new Date(v).toLocaleDateString(language === 'en' ? 'en-US' : 'pt-BR', { month: 'short', day: 'numeric' })}
                            stroke="#94a3b8"
                            fontSize={9}
                          />
                          <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={9} />
                          <Tooltip 
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const pt = payload[0].payload;
                                return (
                                  <div className="bg-slate-900 text-white p-3 rounded-lg border border-slate-850 shadow-md text-[11px] font-sans">
                                    <p className="font-bold text-[10px] text-slate-400 font-mono mb-1">{new Date(pt.date).toLocaleDateString()}</p>
                                    <p className="text-blue-400"><strong className="text-white">{pt.certificationId}</strong>: {payload[0].value}%</p>
                                    <p className="capitalize text-slate-300">Modo: {pt.mode === 'training' ? t.trainingMode : t.examMode}</p>
                                    <p className="text-slate-405 font-mono text-[9px] mt-0.5">Duração: {pt.timeSpentMins} min</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke="#2563eb" 
                            strokeWidth={2.5} 
                            dot={{ r: 4, stroke: "#2563eb", strokeWidth: 1.5, fill: "#ffffff" }}
                            activeDot={{ r: 5 }} 
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="w-9 h-9 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                      <BarChart3 className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-755 block">{language === "en" ? "Empty timeline chart" : "Gráfico em branco"}</span>
                      <p className="text-[10px] text-slate-500 max-w-xs mt-0.5 px-4 leading-relaxed">
                        {language === "en" ? "Complete simulation attempts to observe your technical performance curves." : "Conclua simulados para visualizar a curva evolutiva do seu rendimento."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="text-[10px] text-slate-400 border-t border-slate-50 pt-3 text-center">
                {language === "en" ? "Real-time accuracy coefficient progression tracker." : "Visualização do coeficiente de acertos em tempo real."}
              </div>
            </div>

          </div>

          {/* Catalog Sections of Certifications (Styled as theme catalog) */}
          <div id="section-catalog" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-201 pb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                {t.activeCertifications}
              </h3>
              <span className="text-[10px] font-mono font-bold text-slate-405">
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
                    className="group bg-white rounded-xl border border-slate-200 hover:border-blue-600 transition-all p-5 flex flex-col justify-between gap-4 cursor-pointer shadow-3xs relative overflow-hidden active:scale-98/100"
                  >
                    {/* Background badge identifier decorator */}
                    <div className="absolute right-0 bottom-0 bg-blue-50 text-blue-100/30 text-7xl font-sans tracking-tight font-black opacity-30 select-none translate-x-4 translate-y-4 group-hover:scale-105 transition-transform">
                      {cert.id.split("-")[0]}
                    </div>

                    <div className="space-y-2 relative z-10">
                      
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="py-0.5 px-2 rounded-md bg-blue-50 text-blue-700 font-mono text-[9px] font-bold uppercase tracking-wider">
                          ISTQB {cert.id}
                        </span>
                        
                        <span className="text-[10px] text-slate-450 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-350" /> {cert.timeLimitMins}m
                        </span>
                      </div>

                      <h4 className="font-display font-bold text-sm text-slate-900 tracking-tight leading-snug group-hover:text-blue-600 transition-all">
                        {cert.name}
                      </h4>

                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-450 relative z-10 font-mono">
                      <span>{cert.questionCount} {language === 'en' ? 'questions' : 'questões'}</span>
                      {bestTry !== null ? (
                        <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded leading-none">
                          Best: {bestTry}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 hover:underline">
                          {t.startTraining} <Play className="w-2.5 h-2.5 fill-blue-600 shrink-0" />
                        </span>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Past Attempts Detailed List (Theme style) */}
          <div id="section-history" className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <h3 className="font-bold text-xs text-slate-705 uppercase tracking-wider flex items-center gap-1.5">
                <ListCollapse className="w-4.5 h-4.5 text-slate-500 shrink-0" />
                {t.recentHistory}
              </h3>
              <span className="text-[10px] text-slate-450 font-mono">
                {attempts.length} {language === 'en' ? 'attempts recorded' : 'tentativas salvas na nuvem'}
              </span>
            </div>

            {attempts.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {attempts.map((attempt) => {
                  const isPassed = attempt.verdict === "Passaria" || attempt.verdict === "Pass";
                  return (
                    <div
                      key={attempt.id}
                      className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">
                            {attempt.certificationName}
                          </span>
                          <span className="inline-flex py-0.5 px-2 rounded bg-slate-50 text-slate-605 font-mono text-[9px] uppercase tracking-wide border border-slate-101">
                            {attempt.mode === "training" ? t.trainingMode : t.examMode}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 flex items-center gap-2 font-mono">
                          <span>{getRelativeDateString(attempt.date)}</span>
                          <span>•</span>
                          <span>{language === 'en' ? 'Duration' : 'Tempo'}: {Math.round(attempt.timeSpentSeconds / 60)} min</span>
                          <span>•</span>
                          <span>{language === 'en' ? 'Ratio' : 'Gabarito'}: {attempt.correctCount} / {attempt.totalQuestions} {t.hits}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3.5 self-end sm:self-auto">
                        <div className="text-right">
                          <div className="text-sm font-extrabold text-slate-900 leading-none">{attempt.scorePercentage}%</div>
                          <span className={`inline-flex py-0.5 px-2 rounded-full text-[9px] font-bold uppercase tracking-wider leading-none mt-1 ${
                            isPassed ? "bg-green-100 text-green-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {isPassed ? t.passedLabel : t.failedLabel}
                          </span>
                        </div>

                        <button
                          onClick={() => onViewAttempt(attempt.id)}
                          className="py-1.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-3xs"
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
              <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 border border-slate-100">
                  <BookOpen className="w-6 h-6 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-xs text-slate-800 block">{language === "en" ? "No simulations recorded" : "Nenhum simulado executado"}</span>
                  <p className="text-[11px] text-slate-500 max-w-sm leading-relaxed mx-auto">
                    {t.noHistoryYet}
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Global Footer of the Workspace */}
        <footer className="py-6 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono mt-auto pr-6 pl-6">
          {t.compiledByArena}
        </footer>

      </main>

    </div>
  );
}
