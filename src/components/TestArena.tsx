import { useState, useEffect, useRef } from "react";
import { Clock, CheckCircle2, XCircle, AlertTriangle, ChevronLeft, ChevronRight, HelpCircle, CornerDownRight, SquareCheck, Info } from "lucide-react";
import { Question, CertificationDetail } from "../types";
import { translations } from "../utils/translations";

interface TestArenaProps {
  certificationId: string;
  mode: "training" | "exam";
  language: "pt" | "en";
  token: string;
  onFinished: (attemptId: string) => void;
  onExit: () => void;
}

export default function TestArena({ certificationId, mode, language, token, onFinished, onExit }: TestArenaProps) {
  const [loading, setLoading] = useState(true);
  const [certDetail, setCertDetail] = useState<CertificationDetail | null>(null);
  const [error, setError] = useState("");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<{ [qId: string]: string[] }>({});
  
  // Track validated states in Training Mode
  const [trainingValidated, setTrainingValidated] = useState<{ [qId: string]: { correct: boolean; correctAnswers: string[]; justification: string } }>({});
  const [validating, setValidating] = useState(false);

  // General timers
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [questionTimeLeft, setQuestionTimeLeft] = useState(0); // individual per-question timer
  
  // Submission dialog state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const initialTimeLeftRef = useRef<number>(0);
  const timerIntervalRef = useRef<any>(null);
  const questionTimerIntervalRef = useRef<any>(null);

  // Calculate total seconds spent in the exam
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const t = translations[language];

  // Fetch Questions
  useEffect(() => {
    async function loadQuestions() {
      try {
        const response = await fetch(`/api/questions/${certificationId}`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "X-App-Language": language
          }
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Erro ao carregar o simulado.");
        }
        setCertDetail(data);
        
        const limitSeconds = (data.timeLimitMins || 60) * 60;
        setTimeLeft(limitSeconds);
        initialTimeLeftRef.current = limitSeconds;
        
        const budgetPerQuestion = Math.round(limitSeconds / data.questions.length);
        setQuestionTimeLeft(budgetPerQuestion);
        
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }
    loadQuestions();
  }, [certificationId, token, language]);

  // Main countdown timer and total time counter
  useEffect(() => {
    if (loading || !certDetail) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleAutoSubmit(); // submit when time runs out!
          return 0;
        }
        return prev - 1;
      });
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [loading, certDetail]);

  // Individual question timer countdown
  useEffect(() => {
    if (loading || !certDetail) return;

    if (certDetail?.questions) {
      const budgetPerQuestion = Math.round((certDetail.timeLimitMins * 60) / certDetail.questions.length);
      setQuestionTimeLeft(budgetPerQuestion);
    }

    if (questionTimerIntervalRef.current) clearInterval(questionTimerIntervalRef.current);

    questionTimerIntervalRef.current = setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          return 0; 
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (questionTimerIntervalRef.current) clearInterval(questionTimerIntervalRef.current);
    };
  }, [currentIndex, loading, certDetail]);

  const currentQuestion: Question = certDetail?.questions[currentIndex] || ({} as Question);
  const userAnswersOnCurrent = currentQuestion?.id ? (selectedOptions[currentQuestion.id] || []) : [];
  const isValidatedOnCurrent = currentQuestion?.id ? (trainingValidated[currentQuestion.id] !== undefined) : false;

  const handleSelectOption = (optionId: string) => {
    if (mode === "training" && isValidatedOnCurrent) return;

    if (currentQuestion.question_type === "single_choice") {
      setSelectedOptions((prev) => ({
        ...prev,
        [currentQuestion.id]: [optionId]
      }));
    } else {
      setSelectedOptions((prev) => {
        const current = prev[currentQuestion.id] || [];
        const updated = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
        return {
          ...prev,
          [currentQuestion.id]: updated
        };
      });
    }
  };

  const handleValidateCurrent = async () => {
    if (userAnswersOnCurrent.length === 0) return;
    setValidating(true);
    try {
      const response = await fetch("/api/test/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-App-Language": language
        },
        body: JSON.stringify({
          certificationId: certDetail?.id,
          questionId: currentQuestion.id,
          selectedOption: userAnswersOnCurrent
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      setTrainingValidated((prev) => ({
        ...prev,
        [currentQuestion.id]: {
          correct: data.correct,
          correctAnswers: data.correctAnswers,
          justification: data.justification
        }
      }));
    } catch (err: any) {
      alert("Erro ao validar questão: " + err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmitExamAnswers = async () => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/test/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-App-Language": language
        },
        body: JSON.stringify({
          certificationId: certDetail?.id,
          mode,
          answers: selectedOptions,
          timeSpentSeconds: elapsedSeconds
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro ao submeter as respostas.");
      }

      onFinished(data.attemptId);
    } catch (err: any) {
      alert("Falha no encerramento do simulado: " + err.message);
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = () => {
    alert(language === 'en' ? "Time out! Your recorded answers are being compiled and saved for valuation automatically." : "Tempo esgotado! Suas respostas arquivadas estão sendo enviadas para correção automática.");
    handleSubmitExamAnswers();
  };

  const formatTime = (secs: number) => {
    const min = Math.floor(secs / 60);
    const sec = secs % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-10 h-10 border-4 border-blue-650 border-t-transparent rounded-full animate-spin mb-4" />
        <h4 className="font-display font-bold text-slate-800 text-sm tracking-tight">{language === 'en' ? 'ISTQB Certification Suite' : 'Ambiente de Provas ISTQB'}</h4>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm">{language === 'en' ? 'Loading questions database and rulesets...' : 'Estruturando dados de questões e injetando diretrizes oficiais...'}</p>
      </div>
    );
  }

  if (error || !certDetail) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center font-sans">
        <div className="bg-white p-8 rounded-xl max-w-md w-full border border-red-150 shadow-sm text-center">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h4 className="font-display font-bold text-slate-900 text-sm">Problema ao Inicializar Prova</h4>
          <p className="text-[11px] text-slate-600 mt-2 bg-rose-50 p-2.5 rounded font-mono text-left">{error}</p>
          <button
            type="button"
            onClick={onExit}
            className="mt-5 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
          >
            {t.backDashboard}
          </button>
        </div>
      </div>
    );
  }

  const answeredCount = Object.keys(selectedOptions).filter((k) => selectedOptions[k].length > 0).length;
  const isQuestionAnswered = userAnswersOnCurrent.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans w-full">
      
      {/* Simulation Engine Header */}
      <header className="bg-slate-900 text-white px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-blue-650 flex items-center justify-center font-bold text-sm italic text-white shadow-sm">
            A
          </div>
          <div>
            <h1 className="font-display font-extrabold text-sm tracking-tight leading-none text-slate-100">
              {certDetail.name}
            </h1>
            <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-widest font-mono">
              {mode === "training" ? t.trainingMode + ` (${language === 'en' ? 'Live Highlights' : 'Feedbacks Instantâneos'})` : t.examMode}
            </p>
          </div>
        </div>

        {/* Global Timer Panel */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
            <Clock className={`w-3.5 h-3.5 ${timeLeft < 300 ? "text-rose-455 animate-pulse" : "text-blue-405"}`} />
            <span className="font-mono font-medium text-slate-300 text-[11px]">
              {language === 'en' ? 'Remaining time' : 'Tempo Restante'}: <span className="font-bold text-white">{formatTime(timeLeft)}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            {language === 'en' ? 'Exit' : 'Sair'}
          </button>
        </div>
      </header>

      {/* Main split work bench */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Side: Active question Arena */}
        <main className="lg:col-span-3 space-y-6">
          
          {/* Question Metadata bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] py-1 px-2 bg-slate-100 font-mono font-bold text-slate-650 rounded-lg">
                {language === 'en' ? `Question ${currentIndex + 1} of ${certDetail.questions.length}` : `Questão ${currentIndex + 1} de ${certDetail.questions.length}`}
              </span>
              <span className="text-[10px] font-mono text-slate-455 flex items-center gap-1">
                Syllabus ISTQB: <strong className="text-slate-800 uppercase">{currentQuestion.syllabus_topic}</strong>
              </span>
            </div>

            {/* Micro Timer indicator */}
            <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 bg-slate-50 py-1 px-2 rounded-lg border border-slate-100">
              {language === 'en' ? 'Budget' : 'Orçamento de Tempo'}: <span className={`font-bold ${questionTimeLeft < 15 ? "text-amber-500" : "text-slate-700"}`}>{formatTime(questionTimeLeft)}</span>
            </div>
          </div>

          {/* Core Question Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
            
            {/* Case/Context Study panel if applicable */}
            {currentQuestion.context && (
              <div className="bg-blue-50/15 border border-blue-200/50 p-4 rounded-xl text-xs text-slate-700 leading-relaxed font-sans mb-4 relative">
                <div className="absolute top-3 right-3 text-[9px] uppercase font-bold text-blue-500 font-mono tracking-wider flex items-center gap-1 pointer-events-none">
                  <Info className="w-3.5 h-3.5" /> {t.scenarioComplement}
                </div>
                <div className="font-bold text-blue-900 border-b border-blue-100 pb-1 mb-2 font-mono text-[10px] uppercase">{language === 'en' ? 'CASE SCENARIO STUDY:' : 'CONTEXTO DE PRÁTICA:'}</div>
                <p className="whitespace-pre-line italic text-slate-650">{currentQuestion.context}</p>
              </div>
            )}

            {/* Question Text */}
            <h2 className="font-display font-semibold text-base md:text-lg text-slate-900 leading-snug">
              {currentQuestion.question_text}
            </h2>

            {/* Question Type Hint */}
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
              {language === 'en' ? 'Input type:' : 'Classificação:'} <span className="text-slate-605 font-semibold">{currentQuestion.question_type === "single_choice" ? t.singleChoice : t.multipleChoice}</span>
            </div>

            {/* Options List */}
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => {
                const isSelected = userAnswersOnCurrent.includes(option.id);
                const validatedMeta = trainingValidated[currentQuestion.id];
                const isCorrectAnswer = validatedMeta?.correctAnswers.includes(option.id);

                let optionStyle = "border-slate-200 hover:border-slate-350 hover:bg-slate-50/30";
                let iconBlock = null;

                if (mode === "training" && isValidatedOnCurrent) {
                  const wasUserSelected = isSelected;
                  if (isCorrectAnswer) {
                    optionStyle = "border-emerald-500 bg-emerald-50/20 text-emerald-950 font-medium";
                    iconBlock = <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />;
                  } else if (wasUserSelected) {
                    optionStyle = "border-rose-500 bg-rose-50/20 text-rose-950";
                    iconBlock = <XCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />;
                  } else {
                    optionStyle = "border-slate-100 bg-slate-50/30 text-slate-400 opacity-55";
                  }
                } else if (isSelected) {
                  optionStyle = "border-blue-600 bg-blue-50/20 text-blue-950";
                }

                return (
                  <div
                    key={option.id}
                    onClick={() => handleSelectOption(option.id)}
                    className={`p-3.5 rounded-lg border transition-all duration-150 flex items-start gap-3 select-none text-xs leading-relaxed ${
                      mode === "training" && isValidatedOnCurrent ? "cursor-default" : "cursor-pointer"
                    } ${optionStyle}`}
                  >
                    <div className={`w-5 h-5 rounded font-mono text-[10px] font-bold uppercase flex items-center justify-center shrink-0 border ${
                      isSelected 
                        ? "bg-slate-900 text-white border-slate-900" 
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}>
                      {option.id}
                    </div>
                    <div className="font-medium flex-1 pt-0.5">
                      {option.text}
                    </div>
                    {iconBlock}
                  </div>
                );
              })}
            </div>

            {/* Practice Mode Commentary */}
            {mode === "training" && isValidatedOnCurrent && (
              <div className="mt-6 p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-1">
                  {trainingValidated[currentQuestion.id].correct ? (
                    <span className="inline-flex py-0.5 px-2 rounded-full bg-emerald-100 text-emerald-805 font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      {language === 'en' ? 'CORRECT' : 'CORRETO'}
                    </span>
                  ) : (
                    <span className="inline-flex py-0.5 px-2 rounded-full bg-rose-100 text-rose-805 font-mono text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                      {language === 'en' ? 'INCORRECT' : 'INCORRETO'}
                    </span>
                  )}
                  <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-wider">
                    {t.syllabusExplanation}
                  </span>
                </div>
                <div className="text-xs text-slate-700 leading-relaxed font-sans">
                  <div className="font-bold text-slate-900 flex items-center gap-1 text-[10px] uppercase font-mono mb-1">
                    <CornerDownRight className="w-3 h-3 text-blue-500" /> {language === 'en' ? 'THEORETICAL ANALYSIS' : 'EXPLICAÇÃO TEÓRICA'}:
                  </div>
                  <p className="italic bg-white p-3 rounded border border-slate-150 shadow-3xs">{trainingValidated[currentQuestion.id].justification}</p>
                </div>
              </div>
            )}

            {/* Question Card Bottom Actions bar */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-4">
              
              <div>
                {mode === "training" && !isValidatedOnCurrent && (
                  <button
                    type="button"
                    onClick={handleValidateCurrent}
                    disabled={validating || !isQuestionAnswered}
                    className="py-2 px-4 bg-slate-900 hover:bg-slate-850 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {validating ? (language === 'en' ? 'Processing...' : 'Processando...') : t.submitAnswer}
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((idx) => idx - 1)}
                  className="py-2 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-705 text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer border border-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" /> {language === 'en' ? 'Previous' : 'Anterior'}
                </button>

                {currentIndex < certDetail.questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentIndex((idx) => idx + 1)}
                    className="py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    {language === 'en' ? 'Next' : 'Próxima'} <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="py-2 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <SquareCheck className="w-4 h-4 text-emerald-450" /> {t.finishExam}
                  </button>
                )}
              </div>

            </div>

          </div>

        </main>

        {/* Right Side: Questions Quick Grid & Progress Track */}
        <aside className="space-y-6">
          
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs space-y-4">
            <h3 className="font-display font-semibold text-xs text-slate-850 uppercase tracking-wider flex items-center justify-between">
              <span>{t.navigation}</span>
              <span className="text-[9px] py-0.5 px-2 bg-slate-100 rounded-full font-mono font-bold text-slate-500">
                {answeredCount}/{certDetail.questions.length} {language === 'en' ? 'Done' : 'Feitas'}
              </span>
            </h3>

            {/* Questions Jump Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
              {certDetail.questions.map((q, index) => {
                const isSelectedOnCurrent = currentIndex === index;
                const isAnswered = selectedOptions[q.id] && selectedOptions[q.id].length > 0;
                const validatedMeta = trainingValidated[q.id];

                let baseClass = "h-8 w-full rounded font-mono text-[11px] font-bold flex items-center justify-center border transition-all cursor-pointer select-none ";
                
                if (isSelectedOnCurrent) {
                  baseClass += "border-slate-900 bg-slate-900 text-white shadow-3xs ring-1 ring-slate-900";
                } else if (mode === "training" && validatedMeta) {
                  if (validatedMeta.correct) {
                    baseClass += "border-emerald-300 bg-emerald-50 text-emerald-700";
                  } else {
                    baseClass += "border-rose-300 bg-rose-50 text-rose-700";
                  }
                } else if (isAnswered) {
                  baseClass += "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100";
                } else {
                  baseClass += "border-slate-200 bg-slate-50 text-slate-500 hover:bg-white";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(index)}
                    className={baseClass}
                  >
                    {(index + 1).toString().padStart(2, "0")}
                  </button>
                );
              })}
            </div>

            {/* Legend block */}
            <div className="pt-3 border-t border-slate-100 text-[9px] space-y-1 text-slate-500 font-mono uppercase">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded bg-slate-900 shrink-0" />
                <span>{t.current}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded border-blue-400 bg-blue-55 shrink-0" />
                <span>{t.saved}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded border-slate-200 bg-slate-50 shrink-0" />
                <span>{t.pending}</span>
              </div>
            </div>

          </div>

          {/* Quick guidelines reminder box */}
          <div className="bg-slate-900 text-slate-300 p-5 rounded-xl text-[11px] space-y-3 border border-slate-800">
            <h4 className="font-display font-medium text-blue-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
              <HelpCircle className="w-3.5 h-3.5 text-blue-450" /> {t.quickInstructions}
            </h4>
            <p className="leading-relaxed">
              {language === 'en' ? 'In the official exam, the diagnostic explanations and AI scoring breakdown are mapped only after final sign-off.' : 'No simulado oficial, as correções estruturadas da IA e justificativas serão exibidas somente no final.'}
            </p>
            <div className="border-t border-slate-800 pt-2 space-y-1 text-[10px] text-slate-400">
              <div>• {language === 'en' ? 'Passing target' : 'Rendimento Mínimo'}: <strong className="text-white">65% {language === 'en' ? 'score' : 'acertos'}</strong></div>
              <div>• {language === 'en' ? 'Core syllabus' : 'Uso Teórico'}: <strong className="text-white">ISTQB Syllabus v4.0</strong></div>
            </div>
            <button
              onClick={() => setShowSubmitModal(true)}
              className="w-full mt-2 py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow flex items-center justify-center gap-1"
            >
              {t.finishExam}
            </button>
          </div>

        </aside>

      </div>

      {/* Confirmation Submit Overlay Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-3xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full border border-slate-200 p-6 space-y-4 text-center font-sans">
            
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-3xs">
              <SquareCheck className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-slate-900 tracking-tight">
                {language === 'en' ? 'Complete simulated exames?' : 'Finalizar seu Simulado?'}
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed px-2">
                {language === 'en' ? `Answers registered: ` : `Respostas arquivadas: `} <strong className="text-slate-850">{answeredCount} de {certDetail.questions.length}</strong>. {language === 'en' ? 'AI Mentor will grade your score and analyze results.' : 'Nosso avaliador calculará os resultados e o modelo Gemini gerará as análises.'}
              </p>
            </div>

            {answeredCount < certDetail.questions.length && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 text-left flex items-start gap-2 leading-relaxed">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <span>
                  <strong>{language === 'en' ? 'Warning' : 'Atenção'}:</strong> {language === 'en' ? `You left ${certDetail.questions.length - answeredCount} items blank. Unanswered questions count as failure.` : `Restam ${certDetail.questions.length - answeredCount} questões sem resposta. Questões vazias contam como erro.`}
                </span>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-200"
              >
                {language === 'en' ? 'Review Questions' : 'Revisar Prova'}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitExamAnswers}
                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow flex items-center justify-center gap-1 cursor-pointer"
              >
                {submitting ? (language === 'en' ? 'Grading...' : "Corrigindo...") : (language === 'en' ? 'Finish Exam' : "Concluir Exame")}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
