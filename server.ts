import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Ensure directories exist
const DATA_DIR = path.join(process.cwd(), "src", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, "users.json");
const ATTEMPTS_FILE = path.join(DATA_DIR, "attempts.json");
const QUESTIONS_FILE = path.join(DATA_DIR, "questions.json");

// Local helper to read/write JSON databases
function readJSONFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(data) as T;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return defaultValue;
  }
}

function writeJSONFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
  }
}

// User representation
interface User {
  id: string;
  email: string;
  passwordHash: string;
  isGoogleUser?: boolean;
}

// Lazy Gemini API initialization to prevent startup crash if key is missing
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    throw new Error("GEMINI_API_KEY is not defined. Please add your key in the AI Studio Settings secrets panel.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Simple crypt password hash
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ISTQB_SECURE_SALT_KEY").digest("hex");
}

// Simple bearer token validation middleware
function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  const users = readJSONFile<User[]>(USERS_FILE, []);
  // In our simplified MVP token generator, the token can be MD5/SHA representation of user ID or email
  // Let's match tokens: for this MVP, we can keep static active sessions or derive user directly using secure hashes.
  // Let's find the user whose hashed ID matches or simply find user ID in the token string itself.
  // To keep it simple, secure, and state-less, we generate a token in the form: base64(userId:hash(userId+salt))
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId, signature] = decoded.split(":");
    const expectedSignature = crypto.createHash("sha256").update(userId + "SESSION_SIGN").digest("hex").substring(0, 16);
    
    if (signature !== expectedSignature) {
      res.status(403).json({ error: "Invalid login token" });
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) {
      res.status(403).json({ error: "User not found" });
      return;
    }

    // Attach user to request
    (req as any).user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    res.status(403).json({ error: "Session expired or corrupt" });
  }
}

function generateSessionToken(userId: string): string {
  const signature = crypto.createHash("sha256").update(userId + "SESSION_SIGN").digest("hex").substring(0, 16);
  return Buffer.from(`${userId}:${signature}`).toString("base64");
}

/* ==========================================
   API ROUTES
   ========================================== */

// Auth Register
app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  const cleanedEmail = email.trim().toLowerCase();
  const users = readJSONFile<User[]>(USERS_FILE, []);

  if (users.some(u => u.email === cleanedEmail)) {
    res.status(400).json({ error: "Este email já está cadastrado" });
    return;
  }

  const userId = crypto.randomUUID();
  const passwordHash = hashPassword(password);

  const newUser: User = {
    id: userId,
    email: cleanedEmail,
    passwordHash
  };

  users.push(newUser);
  writeJSONFile(USERS_FILE, users);

  const token = generateSessionToken(userId);
  res.json({ token, user: { email: cleanedEmail } });
});

// Auth Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  const cleanedEmail = email.trim().toLowerCase();
  const users = readJSONFile<User[]>(USERS_FILE, []);
  const user = users.find(u => u.email === cleanedEmail && !u.isGoogleUser);

  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(400).json({ error: "Email ou senha incorretos" });
    return;
  }

  const token = generateSessionToken(user.id);
  res.json({ token, user: { email: user.email } });
});

// Google SSO Simulation (or real token creation)
app.post("/api/auth/google-sso", (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email do Google é obrigatório" });
    return;
  }

  const cleanedEmail = email.trim().toLowerCase();
  const users = readJSONFile<User[]>(USERS_FILE, []);
  let user = users.find(u => u.email === cleanedEmail);

  if (!user) {
    // Auto-register google user
    const userId = crypto.randomUUID();
    user = {
      id: userId,
      email: cleanedEmail,
      passwordHash: "GOOGLE_SSO_NOPASSWORD",
      isGoogleUser: true
    };
    users.push(user);
    writeJSONFile(USERS_FILE, users);
  }

  const token = generateSessionToken(user.id);
  res.json({ token, user: { email: user.email } });
});

// Get Certifications and metadata
app.get("/api/certifications", (req, res) => {
  const lang = (req.headers["x-app-language"] as string === "en") ? "en" : "pt";
  const data = readJSONFile<any>(QUESTIONS_FILE, {});
  const list = Object.keys(data).map(key => {
    const certNameObj = data[key].certification_name;
    return {
      id: key,
      name: typeof certNameObj === "object" ? certNameObj[lang] : certNameObj,
      timeLimitMins: data[key].time_limit_mins,
      passScorePercentage: data[key].pass_score_percentage,
      questionCount: data[key].questions.length
    };
  });
  res.json(list);
});

// Fetch questions for specific certification (Anti-cheat: Correct Answers omitted)
app.get("/api/questions/:certificationId", (req, res) => {
  const { certificationId } = req.params;
  const lang = (req.headers["x-app-language"] as string === "en") ? "en" : "pt";
  const data = readJSONFile<any>(QUESTIONS_FILE, {});
  
  if (!data[certificationId]) {
    res.status(404).json({ error: lang === "en" ? "Certification not found" : "Certificação não encontrada" });
    return;
  }

  const cert = data[certificationId];
  // Strip correct answer and justification
  const cleanQuestions = cert.questions.map((q: any) => {
    return {
      id: q.id,
      points: q.points || 1,
      syllabus_topic: typeof q.syllabus_topic === "object" ? q.syllabus_topic[lang] : q.syllabus_topic,
      context: q.context ? (typeof q.context === "object" ? q.context[lang] : q.context) : null,
      question_text: typeof q.question_text === "object" ? q.question_text[lang] : q.question_text,
      question_type: q.question_type,
      options: q.options.map((opt: any) => ({
        id: opt.id,
        text: typeof opt.text === "object" ? opt.text[lang] : opt.text
      }))
    };
  });

  const certNameObj = cert.certification_name;
  res.json({
    id: certificationId,
    name: typeof certNameObj === "object" ? certNameObj[lang] : certNameObj,
    timeLimitMins: cert.time_limit_mins,
    passScorePercentage: cert.pass_score_percentage,
    questions: cleanQuestions
  });
});

// Validate single question (Modo Treino)
app.post("/api/test/validate", (req, res) => {
  const { certificationId, questionId, selectedOption } = req.body;
  const lang = (req.headers["x-app-language"] as string === "en") ? "en" : "pt";
  
  if (!certificationId || !questionId || !selectedOption) {
    res.status(400).json({ error: lang === "en" ? "Invalid parameters" : "Parâmetros inválidos" });
    return;
  }

  const data = readJSONFile<any>(QUESTIONS_FILE, {});
  const cert = data[certificationId];
  if (!cert) {
    res.status(404).json({ error: lang === "en" ? "Certification not found" : "Certificação não encontrada" });
    return;
  }

  const question = cert.questions.find((q: any) => q.id === questionId);
  if (!question) {
    res.status(404).json({ error: lang === "en" ? "Question not found" : "Questão não encontrada" });
    return;
  }

  // Answer is an array of option ids, e.g. ["a"] or ["b", "c"]
  const correctAnswers = question.correct_answers;
  const isCorrect = Array.isArray(selectedOption) && 
                    selectedOption.length === correctAnswers.length &&
                    selectedOption.every(val => correctAnswers.includes(val));

  res.json({
    correct: isCorrect,
    correctAnswers: correctAnswers, // Return this only during validation in practice mode
    justification: typeof question.justification === "object" ? question.justification[lang] : question.justification
  });
});

// Submit full test (Handles grading, saving history, and prompting Gemini)
app.post("/api/test/submit", authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  const userEmail = (req as any).user.email;
  const { certificationId, mode, answers, timeSpentSeconds } = req.body;
  const lang = (req.headers["x-app-language"] as string === "en") ? "en" : "pt";

  if (!certificationId || !mode || !answers) {
    res.status(400).json({ error: lang === "en" ? "Incomplete submission data" : "Dados de envio incompletos" });
    return;
  }

  const data = readJSONFile<any>(QUESTIONS_FILE, {});
  const cert = data[certificationId];
  if (!cert) {
    res.status(404).json({ error: lang === "en" ? "Certification not registered" : "Certificação não cadastrada" });
    return;
  }

  const questions = cert.questions;
  let totalPoints = 0;
  let scorePoints = 0;
  const resultsDetail: any[] = [];
  const errorsList: any[] = [];

  questions.forEach((q: any) => {
    const qPoints = q.points || 1;
    totalPoints += qPoints;

    const userSelected = answers[q.id] || [];
    const correctAnswers = q.correct_answers || [];
    const isCorrect = Array.isArray(userSelected) &&
                      userSelected.length === correctAnswers.length &&
                      userSelected.every((v: string) => correctAnswers.includes(v));

    const topicStr = typeof q.syllabus_topic === "object" ? q.syllabus_topic[lang] : q.syllabus_topic;
    const qTextStr = typeof q.question_text === "object" ? q.question_text[lang] : q.question_text;
    const justificationStr = typeof q.justification === "object" ? q.justification[lang] : q.justification;

    if (isCorrect) {
      scorePoints += qPoints;
    } else {
      errorsList.push({
        id: q.id,
        topic: topicStr,
        questionText: qTextStr,
        userSelected: userSelected,
        correctAnswers: correctAnswers,
        options: q.options.map((opt: any) => ({
          id: opt.id,
          text: typeof opt.text === "object" ? opt.text[lang] : opt.text
        })),
        justification: justificationStr
      });
    }

    resultsDetail.push({
      id: q.id,
      syllabus_topic: topicStr,
      isCorrect,
      userSelected,
      correctAnswers,
      justification: justificationStr
    });
  });

  const percentScore = totalPoints > 0 ? Math.round((scorePoints / totalPoints) * 100) : 0;
  const passLimit = cert.pass_score_percentage || 65;
  const passVerdictStr = percentScore >= passLimit 
    ? (lang === "en" ? "Pass" : "Passaria") 
    : (lang === "en" ? "Fail" : "Não Passaria");

  const certName = typeof cert.certification_name === "object" ? cert.certification_name[lang] : cert.certification_name;

  // Trigger Gemini API to analyze errors
  let aiAdvice = lang === "en" 
    ? "Prepare to see your personalized technical report compiled by the AI Mentor." 
    : "Prepare-se para ver seu aconselhamento personalizado por Inteligência Artificial.";
  let hasAIError = false;

  try {
    const aiInstance = getAI();
    let prompt = "";
    
    // Construct rich prompt in matching language
    if (lang === "en") {
      prompt = `You are an expert mentor for ISTQB certifications (${certName}).
The user completed a mock exam in "${mode}" mode and scored ${percentScore}% (${scorePoints} out of ${totalPoints} possible points). The minimum passing score is ${passLimit}%.
Approval verdict: ${passVerdictStr}.
Time taken: ${Math.floor(timeSpentSeconds / 60)} minutes and ${timeSpentSeconds % 60} seconds.

Here is the mapping of errors made by the student:
${errorsList.map((err, idx) => `
Question ${idx + 1}: [ID: ${err.id}] [Syllabus Topic: ${err.topic}]
Question Text: "${err.questionText}"
Possible Options:
${err.options.map((opt: any) => `- [${opt.id}] ${opt.text}`).join("\n")}
User Selected: [${err.userSelected.join(", ")}]
Syllabus Justification: "${err.justification}"
`).join("\n---")}

Please generate a detailed, constructive, and motivating performance analysis in English structured as follows:
1. **Performance Overview & Verdict**: Comment briefly on the score (${percentScore}%) and passing result in an empathetic, encouraging tone.
2. **Critical Topic Diagnostic**: Identify the Syllabus topics (e.g., 1.1, 4.2) that need the most attention based on the errors.
3. **Technical Key Insights & Guidance**: Give technical guidance and clear conceptual explanations to clear up the confusion on the questions they missed. Help them understand the deep engineering/QA trade-offs (e.g. Page Object Model advantages, boundary equivalence, GenAI hallucination mitigation) without just listing a raw answer key.
4. **Action Study Plan**: A realistic study plan and test-taking tips for their next attempt.

Please respond in a clean, professional, and well-structured Markdown format. Be direct details-wise but deep conceptually.`;
    } else {
      prompt = `Você é um mentor especialista em certificações ISTQB (${certName}).
O usuário realizou uma simulação oficial em modo "${mode}" e obteve nota ${percentScore}% (${scorePoints} de ${totalPoints} pontos possíveis). O mínimo para aprovação é ${passLimit}%.
Veredito de aprovação: ${passVerdictStr}.
Tempo decorrido: ${Math.round(timeSpentSeconds / 60)} minutos e ${timeSpentSeconds % 60} segundos.

Aqui está o mapeamento dos erros cometidos pelo aluno:
${errorsList.map((err, idx) => `
Questão ${idx + 1}: [ID: ${err.id}] [Tópico do Syllabus: ${err.topic}]
Texto da Questão: "${err.questionText}"
Opções possíveis:
${err.options.map((opt: any) => `- [${opt.id}] ${opt.text}`).join("\n")}
Resposta dada pelo usuário: [${err.userSelected.join(", ")}]
Justificativa teórica do syllabus: "${err.justification}"
`).join("\n---")}

Por favor, gere uma análise detalhada e motivadora em português estruturada da seguinte forma:
1. **Análise de Desempenho e Veredito**: Comente brevemente o resultado (${percentScore}%) e se ele passaria ou não, de forma empática e motivadora.
2. **Diagnóstico dos Tópicos Críticos**: Identifique os tópicos de syllabus (ex: 1.1, 4.2) que mais precisam de atenção (com base nos erros).
3. **Recomendações e Dicas Técnicas**: Dê dicas e explicações focadas para clarear os conceitos técnicos que o aluno errou, ajudando-o a compreender a lógica profunda SEM simplesmente entregar uma lista de gabarito seco. Ajude-o a raciocinar sobre os termos específicos (ex: metamorphic testing, POM, robustez vs explainability).
4. **Plano de Ação para as Próximas Tentativas**: Um plano de estudo simples e focado no tempo de prova.

Responda em formato Markdown de leitura limpa. Evite rodeios desnecessários, mas seja profundo nos conceitos de engenharia de software e testes envolvidos.`;
    }

    const response = await aiInstance.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    if (response && response.text) {
      aiAdvice = response.text;
    } else {
      aiAdvice = lang === "en" 
        ? "AI generated an empty response. Please review the syllabus topics carefully." 
        : "A IA gerou uma resposta vazia. Revise o syllabus nos tópicos críticos para consolidar seus conhecimentos.";
    }
  } catch (error: any) {
    console.error("Gemini Advisor failure:", error);
    hasAIError = true;
    if (lang === "en") {
      aiAdvice = `### Mentorship Note (AI Offline)
We could not contact the AI Mentor because of the following exception: \`${error.message || error}\`.

**Fallback Recommendation:**
Focus on studying the following ISTQB Syllabus topics corresponding to your errors:
${errorsList.length > 0 
  ? errorsList.map(err => `- **Topic ${err.topic}**: Relates to question \`${err.id}\` (${err.questionText.substring(0, 50)}...).`).join("\n")
  : "Perfect! You had no errors on this attempt."
}

*Configure your GEMINI_API_KEY in the Secrets panel of Google AI Studio Settings to unlock beautiful AI-generated feedback reports.*`;
    } else {
      aiAdvice = `### Nota de Orientação (IA Indisponível)
Não foi possível contatar o mentor IA devido ao seguinte motivo: \`${error.message || error}\`.

**Recomendação de Emergência:**
Analisando seus erros locais, foque seus estudos nos tópicos do Syllabus ISTQB listados abaixo:
${errorsList.length > 0 
  ? errorsList.map(err => `- **Tópico ${err.topic}**: Relacionado à questão \`${err.id}\` (${err.questionText.substring(0, 50)}...).`).join("\n")
  : "Excelente! Você gabaritou esta tentativa e não possui tópicos de erro para estudar!"
}

*Configure sua chave GEMINI_API_KEY no painel de Secrets da plataforma para habilitar relatórios completos gerados por IA.*`;
    }
  }

  // Create attempt entry
  const attemptId = crypto.randomUUID();
  const newAttempt = {
    id: attemptId,
    userId,
    userEmail,
    certificationId,
    certificationName: certName,
    mode,
    scorePercentage: percentScore,
    correctCount: scorePoints,
    totalQuestions: totalPoints,
    timeSpentSeconds,
    verdict: passVerdictStr,
    date: new Date().toISOString(),
    results: resultsDetail,
    aiAdvice,
    hasAIError
  };

  const attempts = readJSONFile<any[]>(ATTEMPTS_FILE, []);
  attempts.push(newAttempt);
  writeJSONFile(ATTEMPTS_FILE, attempts);

  res.json({
    attemptId,
    scorePercentage: percentScore,
    correctCount: scorePoints,
    totalQuestions: totalPoints,
    verdict: passVerdictStr,
    aiAdvice,
    results: resultsDetail // includes justifications and choices so frontend can display corrections!
  });
});

// Get user history
app.get("/api/user/history", authenticateToken, (req, res) => {
  const userId = (req as any).user.id;
  const attempts = readJSONFile<any[]>(ATTEMPTS_FILE, []);
  
  // Filter by userId & sort by date ascending for line graph progression, but descending for list view
  const userAttempts = attempts.filter(a => a.userId === userId);
  
  // Return attempts sorted by date ascending for charts, and a sorted copy by date descending for list
  const chartProgression = [...userAttempts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(a => ({
    date: a.date,
    certificationId: a.certificationId,
    mode: a.mode,
    score: a.scorePercentage,
    timeSpentMins: Math.round(a.timeSpentSeconds / 60)
  }));

  const listHistory = [...userAttempts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(a => ({
    id: a.id,
    certificationId: a.certificationId,
    certificationName: a.certificationName,
    mode: a.mode,
    scorePercentage: a.scorePercentage,
    verdict: a.verdict,
    date: a.date,
    timeSpentSeconds: a.timeSpentSeconds,
    correctCount: a.correctCount,
    totalQuestions: a.totalQuestions
  }));

  res.json({
    chartProgression,
    listHistory
  });
});

// Get single attempt detail (for final screen, mentor sharing, and PDF export)
app.get("/api/attempts/:attemptId", authenticateToken, (req, res) => {
  const { attemptId } = req.params;
  const attempts = readJSONFile<any[]>(ATTEMPTS_FILE, []);
  const attempt = attempts.find(a => a.id === attemptId);

  if (!attempt) {
    res.status(404).json({ error: "Tentativa não encontrada" });
    return;
  }

  // Allow users to view their own, or anyone's if shared (it's an internal platform with mentorship, so general view is great!)
  res.json(attempt);
});

// Bootserver setup with Vite
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[ISTQB Arena Server] Running smoothly on port ${PORT}`);
  });
}

startServer();
