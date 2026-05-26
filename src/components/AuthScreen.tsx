import React, { useState } from "react";
import { ShieldCheck, Mail, Lock, Sparkles, Loader2, LogIn, UserPlus, Languages } from "lucide-react";
import { translations } from "../utils/translations";
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
interface AuthScreenProps {
  language: "pt" | "en";
  onLanguageChange: (lang: "pt" | "en") => void;
  onLoginSuccess: (token: string, email: string) => void;
}

export default function AuthScreen({ language, onLanguageChange, onLoginSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [googleEmail, setGoogleEmail] = useState("");
  const [isGoogleSsoMode, setIsGoogleSsoMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const t = translations[language];

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(language === "en" ? "Please fill out all fields." : "Por favor, preencha todos os campos.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMsg("");

    const url = isLogin ? "/api/auth/login" : "/api/auth/register";
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-App-Language": language
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || (language === "en" ? "A server error occurred." : "Ocorreu um erro no servidor."));
      }

      if (!isLogin) {
        setSuccessMsg(language === "en" ? "Account created successfully! Directing..." : "Conta criada com sucesso! Redirecionando...");
        setTimeout(() => {
          onLoginSuccess(data.token, data.user.email);
        }, 1200);
      } else {
        onLoginSuccess(data.token, data.user.email);
      }
    } catch (err: any) {
      setError(err.message || (language === "en" ? "Error connecting to the server." : "Erro ao conectar com o servidor."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSsoSuccess = async (credentialResponse: CredentialResponse) => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/google-sso", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-App-Language": language
        },
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || (language === "en" ? "Google SSO login error." : "Erro de login com Google SSO."));
      }

      onLoginSuccess(data.token, data.user.email);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSsoError = () => {
    setError(language === "en" ? "Google SSO Failed." : "Falha ao autenticar com o Google.");
  };

  const handleQuickDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Senha@123");
    setIsLogin(true);
    setIsGoogleSsoMode(false);
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 sm:px-6 lg:px-8 py-2 md:py-1 relative overflow-hidden font-sans transition-colors duration-250">
      {/* Background visual accents */}
      <div className="absolute top-0 left-0 w-full h-[5px] bg-blue-600" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600/5 dark:bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-slate-900/5 dark:bg-slate-900/10 blur-3xl pointer-events-none" />

      {/* Dynamic scrolling background tracks */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex flex-col justify-around py-16 sm:py-24 select-none z-0">
        {/* Track 1: CTFL • CT-AI • CT-GenAI • CTAL-TAE • CTAL-AT */}
        <div className="animate-marquee-track-1 flex gap-12 text-6xl md:text-8xl font-black font-display uppercase tracking-widest text-slate-200/40 dark:text-slate-900/15">
          <span>CTFL <span className="text-outline-accent">•</span> CT-AI <span className="text-outline-accent">•</span> CT-GENAI <span className="text-outline-accent">•</span> CTAL-TAE <span className="text-outline-accent">•</span> CTAL-AT <span className="text-outline-accent">•</span>&nbsp;</span>
          <span>CTFL <span className="text-outline-accent">•</span> CT-AI <span className="text-outline-accent">•</span> CT-GENAI <span className="text-outline-accent">•</span> CTAL-TAE <span className="text-outline-accent">•</span> CTAL-AT <span className="text-outline-accent">•</span>&nbsp;</span>
        </div>

        {/* Track 2: SOFTWARE TESTING • MOCK EXAMS • AI MENTOR • SIMULADOS • QA */}
        <div className="animate-marquee-track-2 flex gap-12 text-6xl md:text-8xl font-black font-display uppercase tracking-widest text-slate-200/30 dark:text-slate-900/10">
          <span><span className="text-outline-accent">SOFTWARE TESTING</span> • MOCK EXAMS • <span className="text-outline-accent">AI MENTOR</span> • SIMULADOS • <span className="text-outline-accent">QA</span> •&nbsp;</span>
          <span><span className="text-outline-accent">SOFTWARE TESTING</span> • MOCK EXAMS • <span className="text-outline-accent">AI MENTOR</span> • SIMULADOS • <span className="text-outline-accent">QA</span> •&nbsp;</span>
        </div>

        {/* Track 3: ISTQB ARENA • DAILY PRACTICE • MENTOR IA • ARENA */}
        <div className="animate-marquee-track-3 flex gap-12 text-6xl md:text-8xl font-black font-display uppercase tracking-widest text-slate-200/40 dark:text-slate-900/15">
          <span>ISTQB ARENA <span className="text-outline-accent">•</span> DAILY PRACTICE <span className="text-outline-accent">•</span> MENTOR IA <span className="text-outline-accent">•</span> ARENA <span className="text-outline-accent">•</span>&nbsp;</span>
          <span>ISTQB ARENA <span className="text-outline-accent">•</span> DAILY PRACTICE <span className="text-outline-accent">•</span> MENTOR IA <span className="text-outline-accent">•</span> ARENA <span className="text-outline-accent">•</span>&nbsp;</span>
        </div>
      </div>

      <div className="max-w-md md:max-w-lg lg:max-w-xl w-full space-y-2 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-all duration-300 relative z-10 max-h-screen overflow-y-auto md:overflow-visible">
        
        {/* Languages Switch Header Row */}
          {/* Language selector – flags */}
          <div className="flex justify-end items-center gap-1.5 no-print">
            {/* PT – Brazil */}
            <button
              onClick={() => onLanguageChange("pt")}
              title="Português (Brasil)"
              className={`w-7 h-5 rounded overflow-hidden border-2 transition-all cursor-pointer hover:scale-110 ${
                language === "pt"
                  ? "border-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                  : "border-slate-300 dark:border-slate-700 opacity-50 hover:opacity-80"
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
                language === "en"
                  ? "border-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]"
                  : "border-slate-300 dark:border-slate-700 opacity-50 hover:opacity-80"
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

        {/* Header Visual */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-blue-600 text-white shadow-sm mb-2">
            <span className="text-xl font-bold italic font-display">A</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            ISTQB<span className="text-blue-600 dark:text-blue-400">Arena</span>
          </h2>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-xs mx-auto">
            {language === "en" 
              ? "Internal Training Hub & Official Simulations Suite"
              : "Internal Training Hub e Suíte de Simulações Oficiais"}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            {t.welcomeSubtitle}
          </p>
        </div>

        {/* Tab selection */}
        {!isGoogleSsoMode && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setIsLogin(true)}
              className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                isLogin 
                  ? "bg-white text-blue-600 dark:bg-slate-800 dark:text-blue-400 shadow-2xs" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {t.loginTab}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                !isLogin 
                  ? "bg-white text-blue-600 dark:bg-slate-800 dark:text-blue-400 shadow-2xs" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {t.registerTab}
            </button>
          </div>
        )}

        {/* Display Error Message */}
        {error && (
          <div className="bg-rose-50 border border-rose-250 p-3 rounded-lg text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* Display Success Message */}
        {successMsg && (
          <div className="bg-green-50 border border-green-250 p-3 rounded-lg text-xs text-green-700 font-medium">
            {successMsg}
          </div>
        )}

        {!isGoogleSsoMode ? (
          /* Email / Password Form */
          <form className="space-y-2" onSubmit={handleEmailAuth}>
            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1" htmlFor="email">
                {language === "en" ? "CREDENTIAL EMAIL" : "EMISSÃO DE CREDENCIAL (EMAIL)"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="analista.qa@corp.com"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1" htmlFor="password">
                {language === "en" ? "CORPORATE PASSWORD" : "SENHA CORPORATIVA"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 dark:text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/50 text-slate-800 dark:text-slate-100 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                <>
                  <LogIn className="w-4 h-4" />
                  {t.loginBtn}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {t.registerBtn}
                </>
              )}
            </button>
          </form>
        ) : (
          /* Real Google SSO */
          <div className="flex flex-col items-center space-y-4">
             <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 p-3 rounded-lg text-xs text-blue-800 dark:text-blue-400 leading-relaxed mb-2 text-center w-full">
              {language === "en"
                ? "Authenticate securely via Google Corporate SSO."
                : "Autentique-se com segurança via Google SSO Corporativo."}
            </div>
            {loading ? (
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSsoSuccess}
                onError={handleGoogleSsoError}
                useOneTap
                theme="outline"
                size="large"
                shape="rectangular"
              />
            )}
          </div>
        )}

        {/* Auth Mode Toggles */}
        <div className="flex flex-col gap-3 text-center text-xs">
          {!isGoogleSsoMode ? (
            <>
              <div className="flex items-center my-1 text-slate-400 dark:text-slate-500">
                <hr className="w-full border-slate-200 dark:border-slate-800" />
                <span className="px-2 text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider font-mono">{language === "en" ? "or" : "ou"}</span>
                <hr className="w-full border-slate-200 dark:border-slate-800" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsGoogleSsoMode(true);
                  setError("");
                }}
                className="py-1.5 px-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-250 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
              >
                <svg className="w-4 h-4 mr-1" viewBox="0 0 533.5 544.3">
  <path fill="#4285F4" d="M533.5 278.4c0-18.4-1.6-36.1-4.6-53.2H272v100.8h146.9c-6.4 34.6-25.5 63.9-54.4 83.4v68.8h87.6c51.4-47.3 80.4-117 80.4-199.8z"/>
  <path fill="#34A853" d="M272 544.3c73.2 0 134.7-24.2 179.6-65.9l-87.6-68.8c-24.3 16.3-55.3 25.9-92 25.9-70.7 0-130.5-47.7-152-111.9h-89.5v70.3c44.9 88.4 136.5 150.4 241.5 150.4z"/>
  <path fill="#FBBC05" d="M120 324.6c-10.4-30.9-10.4-64.4 0-95.3v-70.3h-89.5c-37.2 73.8-37.2 160.8 0 234.6L120 324.6z"/>
  <path fill="#EA4335" d="M272 107.2c39.8 0 75.7 13.7 104 40.7l78-78c-48.6-45.2-111.3-71.9-182-71.9-105 0-196.6 62-241.5 150.4l89.5 70.3c21.5-64.2 81.3-111.9 152-111.9z"/>
</svg>


                {language === "en" ? "Sign in using Google SSO" : "Fazer login com SSO Google"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setIsGoogleSsoMode(false);
                setError("");
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              {language === "en" ? "Back to Email & Password Login" : "Voltar ao Login por Email e Senha"}
            </button>
          )}
        </div>



      </div>
    </div>
  );
}
