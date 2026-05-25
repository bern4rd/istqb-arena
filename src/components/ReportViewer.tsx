import { useEffect, useState } from "react";
import { Award, Calendar, Clock, FileText, Check, X, ArrowLeft, Printer, AlertCircle, BookOpen, UserCheck, Sparkles, Download } from "lucide-react";
import { AttemptDetail } from "../types";
import { translations } from "../utils/translations";

interface ReportViewerProps {
  attemptId: string;
  token: string;
  language: "pt" | "en";
  onBackToDashboard: () => void;
}

// A simple, incredibly robust React Markdown converter to render LLM bolding, headers, and list elements safely
function SimpleMarkdown({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split("\n");
  return (
    <div className="space-y-3 text-slate-700 text-xs sm:text-sm leading-relaxed font-sans">
      {lines.map((line, index) => {
        let trimmed = line.trim();
        
        // Headers e.g. ### Title or ## Title
        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={index} className="font-display font-semibold text-sm sm:text-base text-slate-900 border-b border-slate-100 pb-1 pt-3">
              {trimmed.substring(4)}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={index} className="font-display font-bold text-base sm:text-lg text-slate-900 pt-4">
              {trimmed.substring(3)}
            </h3>
          );
        }
        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={index} className="font-display font-extrabold text-lg sm:text-xl text-blue-900 pt-5">
              {trimmed.substring(2)}
            </h2>
          );
        }

        // Bullets e.g. - list block or * list block
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.substring(2);
          return (
            <div key={index} className="flex gap-2 pl-2">
              <span className="text-blue-500 font-bold">•</span>
              <span dangerouslySetInnerHTML={{ __html: parseInlineStyles(content) }} />
            </div>
          );
        }

        // Numeric bullets e.g. 1. text
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          const content = numMatch[2];
          return (
            <div key={index} className="flex gap-2 pl-2">
              <span className="text-blue-500 font-bold font-mono">{numMatch[1]}.</span>
              <span dangerouslySetInnerHTML={{ __html: parseInlineStyles(content) }} />
            </div>
          );
        }

        if (trimmed === "---") {
          return <hr key={index} className="my-4 border-slate-100" />;
        }

        if (trimmed === "") {
          return <div key={index} className="h-2" />;
        }

        // Default paragraph
        return (
          <p
            key={index}
            className="leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseInlineStyles(line) }}
          />
        );
      })}
    </div>
  );
}

// Parsers standard bold formatting **text** into <strong> tags
function parseInlineStyles(markup: string): string {
  let parsed = markup.replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-slate-955'>$1</strong>");
  parsed = parsed.replace(/\*(.*?)\*/g, "<em class='italic text-slate-650'>$1</em>");
  parsed = parsed.replace(/`(.*?)`/g, "<code class='font-mono text-xs px-1 bg-slate-100 border border-slate-200 text-rose-600 rounded'>$1</code>");
  return parsed;
}

export default function ReportViewer({ attemptId, token, language, onBackToDashboard }: ReportViewerProps) {
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<AttemptDetail | null>(null);
  const [error, setError] = useState("");
  const [questionsDB, setQuestionsDB] = useState<any>(null);
  const [showExportModal, setShowExportModal] = useState(false);

  const t = translations[language];

  useEffect(() => {
    async function loadReportInfo() {
      try {
        // Fetch attempt details passing custom language header
        const responseAttempt = await fetch(`/api/attempts/${attemptId}`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "X-App-Language": language
          }
        });
        const attemptData = await responseAttempt.json();
        if (!responseAttempt.ok) {
          throw new Error(attemptData.error || "Erro ao recuperar o relatório.");
        }
        setAttempt(attemptData);

        // Fetch original questions with language header so options can render translated definitions
        const responseQuestions = await fetch(`/api/questions/${attemptData.certificationId}`, {
          headers: { 
            "Authorization": `Bearer ${token}`,
            "X-App-Language": language
          }
        });
        const questionsData = await responseQuestions.json();
        if (responseQuestions.ok) {
          setQuestionsDB(questionsData);
        }

        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }
    loadReportInfo();
  }, [attemptId, token, language]);

  const triggerNativePrint = () => {
    window.print();
  };

  const downloadHTMLReport = () => {
    if (!attempt) return;
    
    const isPassing = attempt.scorePercentage >= 65;
    
    // Map AI recommendations markdown safely to basic HTML
    let renderedAIReport = attempt.aiAdvice;
    renderedAIReport = renderedAIReport.replace(/### (.*)/g, '<h4 style="font-size: 14px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px;">$1</h4>');
    renderedAIReport = renderedAIReport.replace(/## (.*)/g, '<h3 style="font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 20px; margin-bottom: 8px;">$1</h3>');
    renderedAIReport = renderedAIReport.replace(/# (.*)/g, '<h2 style="font-size: 18px; font-weight: 800; color: #1e3a8a; margin-top: 24px; margin-bottom: 12px;">$1</h2>');
    
    let bulletList = renderedAIReport.split('\n').map(line => {
      let trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return `<div style="display: flex; gap: 8px; margin-left: 8px; margin-bottom: 6px;"><span style="color: #2563eb; font-weight: bold;">•</span><span>${trimmed.substring(2)}</span></div>`;
      }
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        return `<div style="display: flex; gap: 8px; margin-left: 8px; margin-bottom: 6px;"><span style="color: #2563eb; font-family: monospace; font-weight: bold;">${numMatch[1]}.</span><span>${numMatch[2]}</span></div>`;
      }
      if (trimmed === "---") {
        return '<hr style="margin: 16px 0; border: 0; border-top: 1px solid #e2e8f0;" />';
      }
      if (trimmed === "") {
        return '<div style="height: 6px;"></div>';
      }
      let formatted = trimmed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      formatted = formatted.replace(/`(.*?)`/g, "<code style='font-family: monospace; font-size: 12px; padding: 2px 4px; background-color: #f1f5f9; border: 1px solid #cbd5e1; color: #e11d48; border-radius: 4px;'>$1</code>");
      return `<p style="line-height: 1.6; margin-top: 0; margin-bottom: 8px;">${formatted}</p>`;
    }).join('\n');

    // Questions corrections blocks
    const questionsBlockHTML = attempt.results.map((result, idx) => {
      const originQ = questionsDB?.questions?.find((q: any) => q.id === result.id);
      
      const optionsRows = originQ ? originQ.options.map((opt: any) => {
        const isUserChose = result.userSelected.includes(opt.id);
        const isCorrectOpt = result.correctAnswers.includes(opt.id);
        
        let rowStyle = "padding: 12px; border-radius: 8px; border: 1px solid; margin-bottom: 8px; display: flex; align-items: flex-start; gap: 12px; font-size: 13px; ";
        let labelHTML = "";
        
        if (isCorrectOpt) {
          rowStyle += "border-color: #a7f3d0; background-color: #f0fdf4; color: #064e3b;";
          labelHTML = `<span style="font-size: 10px; font-family: monospace; color: #047857; background-color: #ecfdf5; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #a7f3d0; margin-left: auto;">${t.gabaritoText.toUpperCase()}</span>`;
        } else if (isUserChose && !isCorrectOpt) {
          rowStyle += "border-color: #fecdd3; background-color: #fff5f5; color: #9f1239;";
          labelHTML = `<span style="font-size: 10px; font-family: monospace; color: #b91c1c; background-color: #fef2f2; padding: 2px 6px; border-radius: 4px; font-weight: bold; border: 1px solid #fecdd3; margin-left: auto;">${t.incorrectedLabel.toUpperCase()}</span>`;
        } else {
          rowStyle += "border-color: #f1f5f9; background-color: #ffffff; color: #475569;";
        }
        
        const badgeStyle = `width: 20px; height: 20px; border-radius: 4px; font-family: monospace; font-weight: bold; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid ${isUserChose ? '#0f172a' : '#cbd5e1'}; background-color: ${isUserChose ? '#0f172a' : '#f8fafc'}; color: ${isUserChose ? '#ffffff' : '#64748b'};`;
        
        return `
          <div style="${rowStyle}">
            <div style="${badgeStyle}">${opt.id}</div>
            <span style="flex-grow: 1; line-height: 1.5;">${opt.text}</span>
            ${labelHTML}
          </div>
        `;
      }).join("\n") : `<div>Options missing.</div>`;

      const contextHTML = originQ?.context ? `
        <div style="background-color: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; color: #475569; font-style: italic; margin-bottom: 12px; border-left: 4px solid #2563eb;">
          <span style="font-weight: bold; font-size: 10px; color: #94a3b8; display: block; text-transform: uppercase; margin-bottom: 4px;">${t.scenarioComplement}</span>
          ${originQ.context}
        </div>
      ` : '';

      return `
        <div style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); page-break-inside: avoid;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 12px; font-weight: bold; color: #475569; background: #e2e8f0;">${String(idx + 1).padStart(2, "0")}</span>
              <span style="font-size: 12px; font-family: monospace; color: #64748b;">ID: <strong style="color: #2563eb;">${result.id}</strong> | ${language === 'en' ? 'Topic' : 'Tópico'}: <strong style="color: #334155;">${result.syllabus_topic}</strong></span>
            </div>
            <div>
              ${result.isCorrect 
                ? `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; background-color: #ecfdf5; color: #065f46; font-size: 11px; font-weight: bold; text-transform: uppercase; border: 1px solid #a7f3d0;">✓ ${t.correctedLabel}</span>`
                : `<span style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 9999px; background-color: #fdf2f2; color: #991b1b; font-size: 11px; font-weight: bold; text-transform: uppercase; border: 1px solid #fecdd3;">✗ ${t.incorrectedLabel}</span>`
              }
            </div>
          </div>
          
          ${contextHTML}
          
          <h4 style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 0; margin-bottom: 16px; line-height: 1.4;">
            ${originQ ? originQ.question_text : "ISTQB Certification Question"}
          </h4>
          
          <div style="margin-bottom: 16px;">
            ${optionsRows}
          </div>
          
          <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #e2e8f0;">
            <span style="font-size: 10px; font-weight: bold; color: #94a3b8; text-transform: uppercase; display: block; margin-bottom: 4px;">${t.syllabusExplanation}</span>
            <p style="font-size: 13px; color: #475569; font-style: italic; margin: 0; line-height: 1.5;">${result.justification}</p>
          </div>
        </div>
      `;
    }).join("\n");

    const htmlContent = `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <title>${t.reportTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background-color: #f8fafc;
      color: #334155;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 850px;
      margin: 0 auto;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      font-size: 24px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: -0.025em;
      color: #0f172a;
      margin: 0 0 4px 0;
    }
    .header p {
      font-size: 12px;
      font-family: monospace;
      color: #64748b;
      margin: 0;
    }
    .scorecard {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      gap: 24px;
      align-items: center;
      margin-top: 24px;
      margin-bottom: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .score-circle {
      width: 112px;
      height: 112px;
      border-radius: 50%;
      border: 4px solid ${isPassing ? '#10b981' : '#f43f5e'};
      background-color: ${isPassing ? '#f0fdf4' : '#fdf2f2'};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      flex-shrink: 0;
    }
    .score-percentage {
      font-size: 28px;
      font-weight: 800;
      color: ${isPassing ? '#065f46' : '#991b1b'};
      line-height: 1;
    }
    .score-hits {
      font-size: 10px;
      font-family: monospace;
      color: #64748b;
      margin-top: 4px;
    }
    .meta-blocks {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      width: 100%;
    }
    .meta-box {
      background-color: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #f1f5f9;
      text-align: center;
    }
    .meta-title {
      font-size: 9px;
      text-transform: uppercase;
      font-weight: bold;
      color: #94a3b8;
      display: block;
      margin-bottom: 4px;
    }
    .meta-val {
      font-size: 13px;
      font-weight: 600;
      color: #334155;
    }
    .badge {
      display: inline-block;
      margin-top: 8px;
      padding: 2px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      background-color: ${isPassing ? '#d1fae5' : '#fee2e2'};
      color: ${isPassing ? '#065f46' : '#991b1b'};
    }
    .advisor-section {
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }
    .advisor-header {
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .advisor-header h3 {
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      margin: 0;
      color: #1e3a8a;
    }
    .advisor-header span {
      font-size: 9px;
      font-family: monospace;
      color: #94a3b8;
      text-transform: uppercase;
    }
    .advisor-content {
      background-color: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      font-size: 14px;
      line-height: 1.6;
    }
    .no-print-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 24px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .print-btn {
      background-color: #0f172a;
      color: white;
      font-weight: bold;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
    }
    @media print {
      .no-print-bar { display: none !important; }
      body { background-color: #ffffff !important; padding: 0 !important; }
      .scorecard, .advisor-section { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
      .page-break-avoid { page-break-inside: avoid !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    
    <!-- Controls (No Print) -->
    <div class="no-print-bar">
      <div style="font-size: 13px; color: #64748b;">
        <strong>${t.downloadModalTitle}:</strong> ${language === 'en' ? 'Standalone report file. Press Ctrl + P on your keyboard to instantly save as a PDF.' : 'Arquivo offline. Pressione as teclas Ctrl + P do teclado para salvar diretamente como PDF qualificado.'}
      </div>
      <button onclick="window.print()" class="print-btn">
        ${language === 'en' ? 'Print as PDF' : 'Imprimir como PDF'}
      </button>
    </div>

    <!-- Header Banner -->
    <div class="header">
      <div>
        <h1>${t.appName}</h1>
        <p>${t.officialReportBanner} — ID: ${attempt.id}</p>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 12px; font-weight: bold; font-family: monospace;">ISTQB ARENA HUB</div>
        <div style="font-size: 10px; color: #94a3b8; font-family: monospace; text-transform: uppercase;">${t.feedbackExec}</div>
      </div>
    </div>

    <!-- Stats summary scorecard -->
    <div class="scorecard page-break-avoid">
      <div style="text-align: center;">
        <div class="score-circle">
          <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #94a3b8;">${t.scoreLabel}</span>
          <span class="score-percentage">${attempt.scorePercentage}%</span>
          <span class="score-hits">${attempt.correctCount} / ${attempt.totalQuestions} ${t.hits}</span>
        </div>
        <span class="badge">${isPassing ? t.passedLabel : t.failedLabel}</span>
      </div>
      
      <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; height: 112px;">
        <div style="margin-bottom: 12px;">
          <span style="font-size: 10px; font-weight: bold; color: #2563eb; text-transform: uppercase; font-family: monospace; letter-spacing: 0.1em;">${t.officialReportBanner}</span>
          <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 2px 0 0 0;">${attempt.certificationName}</h2>
          <p style="font-size: 12px; color: #64748b; margin: 4px 0 0 0;">${t.evaluationText} <strong>${attempt.userEmail}</strong></p>
        </div>
        
        <div class="meta-blocks">
          <div class="meta-box">
            <span class="meta-title">${t.tableHeaderMode}</span>
            <span class="meta-val" style="text-transform: uppercase;">${attempt.mode === "training" ? t.trainingMode : t.examMode}</span>
          </div>
          <div class="meta-box">
            <span class="meta-title">${t.tableHeaderDuration}</span>
            <span class="meta-val">${Math.floor(attempt.timeSpentSeconds / 60)}m ${attempt.timeSpentSeconds % 60}s</span>
          </div>
          <div class="meta-box">
            <span class="meta-title">${t.tableHeaderDate}</span>
            <span class="meta-val">${new Date(attempt.date).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Advisor analysis feedback -->
    <div class="advisor-section">
      <div class="advisor-header">
        <h3>${t.aiMentorReportHeader}</h3>
        <span>${t.aiMentorReportSub}</span>
      </div>
      <div class="advisor-content">
        ${bulletList}
      </div>
    </div>

    <!-- Detailed Solutions Review list items grid -->
    <div style="margin-top: 32px;">
      <div style="border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0;">${t.detailedReview}</h3>
      </div>
      ${questionsBlockHTML}
    </div>

    <!-- Footer static copyright -->
    <div style="text-align: center; font-size: 12px; color: #94a3b8; font-family: monospace; border-t: 1px solid #e2e8f0; padding-top: 24px; margin-top: 48px;">
      ${t.compiledByArena}
    </div>

  </div>
</body>
</html>`;

    // Process secure file generation download
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Performance_Report_${attempt.certificationId}_${attempt.scorePercentage}pct.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans animate-fade-in">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        <h4 className="font-display font-bold text-slate-800 text-sm">{t.loading}</h4>
        <p className="text-[11px] text-slate-500 mt-1.5 max-w-sm">Estruturando notas, calculando desvios e invocando o avaliador Gemini...</p>
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="bg-white p-8 rounded-xl max-w-md w-full border border-red-150 shadow-sm text-center">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h4 className="font-display font-bold text-slate-900 text-sm">Problema com Relatório</h4>
          <p className="text-xs text-slate-600 mt-2 bg-red-50 p-2.5 rounded text-left font-mono">{error}</p>
          <button
            type="button"
            onClick={onBackToDashboard}
            className="mt-5 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer"
          >
            {t.backDashboard}
          </button>
        </div>
      </div>
    );
  }

  const isPassing = attempt.scorePercentage >= 65;
  const formattedDate = new Date(attempt.date).toLocaleString(language === 'en' ? "en-US" : "pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const minutesTaken = Math.floor(attempt.timeSpentSeconds / 60);
  const secondsTaken = attempt.timeSpentSeconds % 60;

  return (
    <div className="min-h-screen bg-slate-50 pb-16 print-page font-sans">
      
      {/* Interactive sticky actions overlay (Hidden during print) */}
      <div className="bg-white border-b border-slate-200 py-3.5 px-6 sticky top-0 z-40 shadow-3xs no-print">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-950 cursor-pointer py-1.5 px-3 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backDashboard}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2 px-4 rounded-lg cursor-pointer transition-all shadow-3xs"
            >
              <Printer className="w-3.5 h-3.5" />
              {t.downloadReport}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 mt-6 space-y-6">
        
        {/* Print-only Banner */}
        <div className="hidden print:flex items-center justify-between border-b-2 border-slate-950 pb-4 mb-6">
          <div>
            <h1 className="font-display font-extrabold text-xl uppercase tracking-tight text-slate-950">
              {t.appName} — {t.reportTitle}
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">
              Gerado automaticamente em: {formattedDate} | ID: {attempt.id.substring(0, 18).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold font-mono">ISTQB ARENA HUB</div>
            <div className="text-[9px] text-slate-400">{t.feedbackExec}</div>
          </div>
        </div>

        {/* Detailed Core Performance Score Dashboard Block */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-3xs p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 items-center print-card">
          
          {/* Badge Display Circle */}
          <div className="flex flex-col items-center text-center space-y-3 justify-center md:border-r border-slate-200 md:pr-12">
            <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 ${
              isPassing 
                ? "border-emerald-500 bg-emerald-50/10 text-emerald-750" 
                : "border-rose-500 bg-rose-50/10 text-rose-750"
            } print-badge`}>
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">{t.scoreLabel}</span>
              <span className="text-3xl font-extrabold font-display leading-none my-1">{attempt.scorePercentage}%</span>
              <span className="text-[10px] font-mono">{attempt.correctCount} / {attempt.totalQuestions} {t.hits}</span>
            </div>

            <div className="space-y-0.5">
              <span className={`inline-flex py-0.5 px-3 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                isPassing ? "bg-emerald-100 text-emerald-850" : "bg-rose-100 text-rose-855"
              }`}>
                {isPassing ? t.passedLabel : t.failedLabel}
              </span>
              <p className="text-[9px] text-slate-400 mt-1">{t.passingScoreMeta}</p>
            </div>
          </div>

          {/* Metadata parameters checklist */}
          <div className="md:col-span-2 space-y-4">
            <div className="space-y-1 text-center md:text-left">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono">
                {t.officialReportBanner}
              </div>
              <h2 className="font-display font-extrabold text-xl text-slate-900 tracking-tight leading-tight">
                {attempt.certificationName}
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="block text-[9px] uppercase font-bold text-slate-400 font-mono">{t.tableHeaderMode}:</span>
                <span className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                  {attempt.mode === "training" ? t.trainingMode : t.examMode}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="block text-[9px] uppercase font-bold text-slate-400 font-mono">{t.tableHeaderDuration}:</span>
                <span className="text-xs font-semibold text-slate-800 font-mono">
                  {minutesTaken > 0 ? `${minutesTaken}m ${secondsTaken}s` : `${secondsTaken}s`}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 col-span-2 sm:col-span-1">
                <span className="block text-[9px] uppercase font-bold text-slate-400 font-mono">{t.simulationFinishedOn}:</span>
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" /> {formattedDate}
                </span>
              </div>
            </div>

            <div className="text-xs text-slate-500 leading-relaxed pt-1 flex items-start gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                {t.evaluationText} <strong className="text-slate-800">{attempt.userEmail}</strong>. Essencial para revisões de gaps e mentoria técnica corporativa.
              </span>
            </div>
          </div>

        </div>

        {/* AI Mentor Advice Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-3xs p-6 sm:p-8 space-y-4 relative overflow-hidden print-card">
          <div className="absolute right-0 top-0 bg-blue-50 text-blue-200/20 text-8xl font-black font-sans select-none pointer-events-none -mr-4 -mt-4 opacity-30">
            AI
          </div>
          
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 no-print">
            <span className="bg-blue-600 p-1.5 rounded text-white shrink-0">
              <Sparkles className="w-4 h-4 text-amber-300" />
            </span>
            <div>
              <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-slate-800">
                {t.aiMentorReportHeader}
              </h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                {t.aiMentorReportSub}
              </p>
            </div>
          </div>

          <div className="hidden print:block border-b border-slate-900 pb-2 mb-3">
            <h3 className="font-display font-bold text-sm tracking-tight uppercase">
              1. {t.aiMentorReportHeader}
            </h3>
          </div>

          {/* Render Markdown advice safely */}
          <div className="bg-slate-50/50 p-2 sm:p-4 rounded-lg border border-slate-200/50">
            <SimpleMarkdown text={attempt.aiAdvice} />
          </div>
        </div>

        {/* Item-by-item technical corrections details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between no-print">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4.5 h-4.5 text-slate-400 shrink-0" />
              {t.detailedReview}
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              {attempt.results.length} {t.correctedItems}
            </span>
          </div>

          <div className="hidden print:block border-b border-slate-900 pb-2 pt-4">
            <h3 className="font-display font-bold text-sm tracking-tight uppercase">
              2. {t.detailedReview}
            </h3>
          </div>

          <div className="space-y-4">
            {attempt.results.map((result, idx) => {
              const originQ = questionsDB?.questions?.find((q: any) => q.id === result.id);
              
              return (
                <div key={result.id} className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4 print-card">
                  
                  {/* Item header */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center font-mono text-[11px] font-bold text-slate-700">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">ID: </span>
                        <code className="text-xs font-mono font-bold text-blue-700">{result.id}</code>
                        <span className="mx-2 text-slate-200">|</span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">{language === "pt" ? "Tópico" : "Topic"}: </span>
                        <strong className="text-xs text-slate-705 font-mono font-bold uppercase">{result.syllabus_topic}</strong>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {result.isCorrect ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-850 text-[10px] font-bold uppercase tracking-wider">
                          <Check className="w-3 h-3 text-emerald-600" /> {t.correctedLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-50 text-rose-850 text-[10px] font-bold uppercase tracking-wider">
                          <X className="w-3 h-3 text-rose-600" /> {t.incorrectedLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Context banner if presents inside response review */}
                  {originQ?.context && (
                    <div className="bg-slate-50 p-3 rounded border border-slate-150 text-xs text-slate-650 italic leading-relaxed">
                      <span className="font-bold text-[9px] text-slate-400 block uppercase font-mono tracking-wider mb-1">{t.scenarioComplement}</span>
                      {originQ.context}
                    </div>
                  )}

                  {/* Question Title */}
                  <h4 className="font-display font-semibold text-slate-900 text-sm leading-snug">
                    {originQ ? originQ.question_text : "Questão de Simulação ISTQB"}
                  </h4>

                  {/* Options with marked correctness */}
                  <div className="space-y-2 pt-1">
                    {originQ ? (
                      originQ.options.map((opt: any) => {
                        const isUserChose = result.userSelected.includes(opt.id);
                        const isCorrectOpt = result.correctAnswers.includes(opt.id);
                        
                        let cardClass = "p-3 rounded border text-xs flex items-start gap-3 transition-colors ";
                        
                        if (isCorrectOpt) {
                          cardClass += "border-emerald-300 bg-emerald-50/15 text-emerald-950 font-medium";
                        } else if (isUserChose && !isCorrectOpt) {
                          cardClass += "border-rose-200 bg-rose-50/15 text-rose-950";
                        } else {
                          cardClass += "border-slate-100 bg-white text-slate-600";
                        }

                        return (
                          <div key={opt.id} className={cardClass}>
                            <div className={`w-5 h-5 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 border ${
                              isUserChose 
                                ? "bg-slate-900 text-white border-slate-900" 
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}>
                              {opt.id}
                            </div>
                            <span className="flex-1 leading-relaxed">{opt.text}</span>
                            {isCorrectOpt && (
                              <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 py-0.5 px-1.5 rounded uppercase font-bold shrink-0 border border-emerald-200">
                                {t.gabaritoText}
                              </span>
                            )}
                            {isUserChose && !isCorrectOpt && (
                              <span className="text-[9px] font-mono text-rose-750 bg-rose-50 py-0.5 px-1.5 rounded uppercase font-bold shrink-0 border border-rose-200">
                                {t.incorrectedLabel}
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 bg-slate-50 text-xs text-slate-500 rounded border border-slate-150">
                        Opções e dados de contexto ocultados do gabarito.
                      </div>
                    )}
                  </div>

                  {/* Official Syllabus justification explanation */}
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 block">
                      {t.syllabusExplanation}
                    </span>
                    <p className="text-xs text-slate-600 italic leading-relaxed">
                      {result.justification}
                    </p>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* Print Warning note floating */}
        <div className="text-center text-[10px] text-slate-400 py-6 font-mono no-print">
          {t.compiledByArena}
        </div>

      </div>

      {/* Export Options Modal Dialog */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade-in no-print">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-2.5 text-blue-600">
              <Printer className="w-5 h-5 shrink-0" />
              <h3 className="font-display font-bold text-slate-900 text-sm sm:text-base">
                {t.downloadModalTitle}
              </h3>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              {t.downloadModalDesc}
            </p>

            <div className="bg-blue-50/40 border border-blue-100 p-3 rounded-lg text-xs leading-relaxed text-blue-800">
              {t.downloadModalWarning}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                onClick={downloadHTMLReport}
                className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" />
                {t.downloadHtmlBtn}
              </button>
              
              <button
                onClick={triggerNativePrint}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                {t.printDirectlyBtn}
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowExportModal(false)}
                className="py-1.5 px-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
              >
                {t.closeModal}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
