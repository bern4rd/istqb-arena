import { useState } from "react";
import { GraduationCap, Award, HelpCircle, Clock, BookOpen, ChevronRight, Zap } from "lucide-react";
import { CertificationOverview } from "../types";
import { translations } from "../utils/translations";

interface SimulationConfigProps {
  certification: CertificationOverview;
  language: "pt" | "en";
  onCancel: () => void;
  onStartSimulation: (mode: "training" | "exam") => void;
}

export default function SimulationConfig({ certification, language, onCancel, onStartSimulation }: SimulationConfigProps) {
  const [selectedMode, setSelectedMode] = useState<"training" | "exam">("training");

  const t = translations[language];

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-3xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg max-w-2xl w-full border border-slate-200 dark:border-slate-800 overflow-hidden transform scale-100 transition-all">
        
        {/* Banner with Title */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-6 relative">
          <GraduationCap className="absolute right-6 top-6 w-14 h-14 text-slate-800 dark:text-slate-800/40 opacity-60" />
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1.5 font-mono">
            {language === 'en' ? 'PRACTICE PROTOCOLS' : 'Configuração de Prática'}
          </div>
          <h3 className="font-display text-xl font-bold tracking-tight">
            {certification.name}
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              {certification.timeLimitMins} {language === "en" ? "minutes" : "minutos"}
            </span>
            <span className="flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
              {certification.questionCount} {language === "en" ? "questions" : "questões"}
            </span>
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-blue-500" />
              {language === "en" ? `Min score: ${certification.passScorePercentage}%` : `Mínimo ${certification.passScorePercentage}% de acertos`}
            </span>
          </p>
        </div>

        {/* Mode Selector Content */}
        <div className="p-6 space-y-5">
          <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold mb-2">
            {language === "en" ? "Select the ideal evaluation protocol for your study goals today:" : "Selecione a modalidade de simulação ideal para o seu nível de estudos hoje:"}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Modo Treino Card */}
            <div
              onClick={() => setSelectedMode("training")}
              className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMode === "training"
                  ? "border-blue-600 bg-blue-50/20 dark:border-blue-500 dark:bg-blue-950/20"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex py-0.5 px-2 rounded bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-mono text-[9px] font-bold uppercase tracking-wider">
                  {t.trainingMode}
                </span>
                {selectedMode === "training" && (
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                )}
              </div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mb-1.5">
                {language === "en" ? "Learn As You Go" : "Aprenda na Hora"}
              </h4>
              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">✔</span>
                  <span>{language === "en" ? "Instant correct/incorrect feedback on every single question submitted." : "Feedback imediato de acerto ou erro após enviar cada questão."}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">✔</span>
                  <span>{language === "en" ? "Review technical Syllabus definitions while you practice." : "Opção de rever as nuances do Syllabus no momento em que responde."}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">✔</span>
                  <span>{language === "en" ? "Direct access to technical explanations." : "Acesso instantâneo à justificativa técnica."}</span>
                </li>
              </ul>
            </div>

            {/* Modo Simulado Oficial Card */}
            <div
              onClick={() => setSelectedMode("exam")}
              className={`p-5 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMode === "exam"
                  ? "border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800/40"
                  : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex py-0.5 px-2 rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-mono text-[9px] font-bold uppercase tracking-wider">
                  {t.examMode}
                </span>
                {selectedMode === "exam" && (
                  <span className="w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-100 animate-ping" />
                )}
              </div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs mb-1.5">
                {language === "en" ? "Authentic Constraints" : "Condições Reais de Exame"}
              </h4>
              <ul className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-blue-500 font-bold">●</span>
                  <span>{language === "en" ? "No immediate answers. Check final reports and scorecards upon submission." : "Sem feedback imediato. Veja o veredito final apenas ao encerrar o simulado."}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">✔</span>
                  <span>{language === "en" ? "Fully autonomous navigation: skip and review questions freely." : "Navegação totalmente livre: avance, retorne ou pule questões livremente."}</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-emerald-500 font-bold">✔</span>
                  <span>{language === "en" ? "Countdown timer matching original ISTQB exams precisely." : "Cronômetro regressivo com tempo global idêntico ao exame real."}</span>
                </li>
              </ul>
            </div>

          </div>

          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
            <BookOpen className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
                {language === "en" ? "AI Evaluation & Fine-Tuning" : "Gestão de Tópicos e IA"}
              </span>
              {language === "en" ? "Incorrect questions will be categorized dynamically to enrich personalized advice generated by our AI platform." : "Ao concluir o teste, as questões erradas serão agrupadas para alimentar as recomendações do Mentor IA."}
            </div>
          </div>
        </div>

        {/* Buttons Action footer */}
        <div className="bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 p-4 flex justify-end gap-3 font-sans">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            {language === 'en' ? 'Cancel' : 'Cancelar'}
          </button>
          
          <button
            type="button"
            onClick={() => onStartSimulation(selectedMode)}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            {language === 'en' ? 'Start Evaluation' : 'Iniciar Simulação'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
