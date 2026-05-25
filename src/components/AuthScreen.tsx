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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 sm:px-6 lg:px-8 py-12 relative overflow-hidden font-sans">
      {/* Background visual accents */}
      <div className="absolute top-0 left-0 w-full h-[5px] bg-blue-600" />
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-blue-600/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-slate-900/5 blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-xl shadow-sm border border-slate-200 transition-all duration-300 relative z-10">
        
        {/* Languages Switch Header Row */}
        <div className="flex justify-end items-center gap-1.5 no-print">
          <Languages className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value as "pt" | "en")}
            className="text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md py-1 px-2.5 outline-none cursor-pointer"
          >
            <option value="pt">🇧🇷 Português</option>
            <option value="en">🇺🇸 English</option>
          </select>
        </div>

        {/* Header Visual */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-blue-600 text-white shadow-sm mb-4">
            <span className="text-xl font-bold italic font-display">A</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-800 tracking-tight">
            ISTQB<span className="text-blue-600">Arena</span>
          </h2>
          <p className="mt-1.5 text-xs text-slate-500 max-w-xs mx-auto">
            {language === "en" 
              ? "Internal Training Hub & Official Simulations Suite"
              : "Internal Training Hub e Suíte de Simulações Oficiais"}
          </p>
          <p className="mt-2 text-[11px] text-slate-400">
            {t.welcomeSubtitle}
          </p>
        </div>

        {/* Tab selection */}
        {!isGoogleSsoMode && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 rounded-lg border border-slate-100">
            <button
              onClick={() => setIsLogin(true)}
              className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                isLogin ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.loginTab}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                !isLogin ? "bg-white text-blue-600 shadow-2xs" : "text-slate-500 hover:text-slate-800"
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
          <form className="space-y-4" onSubmit={handleEmailAuth}>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1" htmlFor="email">
                {language === "en" ? "CREDENTIAL EMAIL" : "EMISSÃO DE CREDENCIAL (EMAIL)"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-450 mb-1" htmlFor="password">
                {language === "en" ? "CORPORATE PASSWORD" : "SENHA CORPORATIVA"}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
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
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
             <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg text-xs text-blue-800 leading-relaxed mb-2 text-center w-full">
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
              <div className="flex items-center my-1 text-slate-300">
                <hr className="w-full border-slate-100" />
                <span className="px-2 text-slate-400 uppercase text-[10px] tracking-wider font-mono">{language === "en" ? "or" : "ou"}</span>
                <hr className="w-full border-slate-100" />
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsGoogleSsoMode(true);
                  setError("");
                }}
                className="py-2 px-4 bg-white hover:bg-slate-50 border border-slate-250 rounded-lg text-xs text-slate-700 font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-3xs"
              >
                <svg className="w-4 h-4 text-red-500 mr-1" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V13.4h6.86c-.277 1.56-1.602 4.585-6.86 4.585-4.54 0-8.24-3.765-8.24-8.4s3.7-8.4 8.24-8.4c2.58 0 4.307 1.095 5.298 2.045l2.465-2.37C18.435 1.21 15.62 0 12.24 0 5.58 0 0 5.37 0 12s5.58 12 12.24 12c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.4-.195-1.925H12.24z"/>
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
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              {language === "en" ? "Back to Email & Password Login" : "Voltar ao Login por Email e Senha"}
            </button>
          )}
        </div>

        {/* Demo Quick Accounts Segment */}
        <div className="border-t border-slate-200 pt-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">
            {language === "en" ? "DEMO ACCOUNTS (ONE-CLICK)" : "Contas Rápidas de Demonstração"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("qa.junior@testarena.com")}
              className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-white transition-all text-xs text-slate-700 cursor-pointer"
            >
              <div className="font-semibold text-blue-600 text-xs">Analista Junior</div>
              <div className="text-[10px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">qa.junior@testarena.com</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin("mentor.tests@testarena.com")}
              className="text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 bg-slate-50 hover:bg-white transition-all text-xs text-slate-700 cursor-pointer"
            >
              <div className="font-semibold text-blue-600 text-xs text-ellipsis">QA Lead / Mentor</div>
              <div className="text-[10px] text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap">mentor.tests@testarena.com</div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
