import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Ensure directories exist
const DATA_DIR = path.join(process.cwd(), "src", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Keep questions local since they are static metadata
// Loaded from per-certification files
const CERT_FILES: Record<string, string> = {
  "CTFL": path.join(DATA_DIR, "questions-CTFL.json"),
  "CT-AI": path.join(DATA_DIR, "questions-CT-AI.json"),
  "CTAL-AT": path.join(DATA_DIR, "questions-CTAL-AT.json"),
  "CTAL-TAE": path.join(DATA_DIR, "questions-CTAL-TAE.json"),
  "CT-GenAI": path.join(DATA_DIR, "questions-CT-GenAI.json"),
};

function getCertFilePath(certId: string): string {
  return CERT_FILES[certId] || path.join(DATA_DIR, `questions-${certId}.json`);
}

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

// ----------------------------------------------------------------------------
// MongoDB & Mongoose Setup
// ----------------------------------------------------------------------------
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/istqb_arena";

mongoose.connect(MONGO_URI)
  .then(() => console.log("[ISTQB Arena Server] Connected to MongoDB"))
  .catch(err => console.error("[ISTQB Arena Server] MongoDB connection error:", err));

const UserSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  isGoogleUser: { type: Boolean, default: false }
});
const User = mongoose.model("User", UserSchema);

const AttemptSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  userEmail: { type: String, required: true },
  certificationId: { type: String, required: true },
  certificationName: { type: String, required: true },
  mode: { type: String, required: true },
  scorePercentage: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  timeSpentSeconds: { type: Number, required: true },
  verdict: { type: String, required: true },
  date: { type: String, required: true },
  results: { type: Array, required: true },
  aiAdvice: { type: String, required: false },
  hasAIError: { type: Boolean, required: true, default: false }
});
const Attempt = mongoose.model("Attempt", AttemptSchema);

// ----------------------------------------------------------------------------
// Auth Helpers
// ----------------------------------------------------------------------------

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "ISTQB_SECURE_SALT_KEY").digest("hex");
}

function generateSessionToken(userId: string): string {
  const signature = crypto.createHash("sha256").update(userId + "SESSION_SIGN").digest("hex").substring(0, 16);
  return Buffer.from(`${userId}:${signature}`).toString("base64");
}

async function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [userId, signature] = decoded.split(":");
    const expectedSignature = crypto.createHash("sha256").update(userId + "SESSION_SIGN").digest("hex").substring(0, 16);
    
    if (signature !== expectedSignature) {
      res.status(403).json({ error: "Invalid login token" });
      return;
    }

    const user = await User.findOne({ id: userId });
    if (!user) {
      res.status(403).json({ error: "User not found" });
      return;
    }

    (req as any).user = { id: user.id, email: user.email };
    next();
  } catch (err) {
    res.status(403).json({ error: "Session expired or corrupt" });
  }
}

/* ==========================================
   API ROUTES
   ========================================== */

// Auth Register
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  const cleanedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await User.findOne({ email: cleanedEmail });
    if (existingUser) {
      res.status(400).json({ error: "Este email já está cadastrado" });
      return;
    }

    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);

    await User.create({
      id: userId,
      email: cleanedEmail,
      passwordHash,
      isGoogleUser: false
    });

    const token = generateSessionToken(userId);
    res.json({ token, user: { email: cleanedEmail } });
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Auth Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  const cleanedEmail = email.trim().toLowerCase();

  try {
    const user = await User.findOne({ email: cleanedEmail, isGoogleUser: { $ne: true } });

    if (!user || user.passwordHash !== hashPassword(password)) {
      res.status(400).json({ error: "Email ou senha incorretos" });
      return;
    }

    const token = generateSessionToken(user.id);
    res.json({ token, user: { email: user.email } });
  } catch (err) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// Real Google SSO
app.post("/api/auth/google-sso", async (req, res) => {
  const { credential } = req.body; // Token from @react-oauth/google
  if (!credential) {
    res.status(400).json({ error: "Credencial do Google é obrigatória" });
    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: "Token inválido" });
      return;
    }

    const cleanedEmail = payload.email.trim().toLowerCase();
    let user = await User.findOne({ email: cleanedEmail });

    if (!user) {
      // Auto-register google user
      const userId = crypto.randomUUID();
      user = await User.create({
        id: userId,
        email: cleanedEmail,
        passwordHash: "GOOGLE_SSO_NOPASSWORD",
        isGoogleUser: true
      });
    }

    const token = generateSessionToken(user.id);
    res.json({ token, user: { email: user.email } });
  } catch (err) {
    console.error("Google SSO Verification Error:", err);
    res.status(401).json({ error: "Falha na verificação com o Google" });
  }
});

// Get Certifications and metadata
app.get("/api/certifications", (req, res) => {
  const lang = (req.headers["x-app-language"] as string === "en") ? "en" : "pt";
  const list: any[] = [];
  for (const [certId, filePath] of Object.entries(CERT_FILES)) {
    const certData = readJSONFile<any>(filePath, null);
    if (!certData) continue;
    const certNameObj = certData.certification_name;
    list.push({
      id: certId,
      name: typeof certNameObj === "object" ? certNameObj[lang] : certNameObj,
      timeLimitMins: certData.time_limit_mins,
      passScorePercentage: certData.pass_score_percentage,
      questionCount: certData.questions.length
    });
  }
  res.json(list);
});

// Fetch questions for specific certification (Anti-cheat: Correct Answers omitted)
app.get("/api/questions/:certificationId", (req, res) => {
  const { certificationId } = req.params;
  const lang = (req.headers["x-app-language"] as string === "en") ? "en" : "pt";
  const filePath = getCertFilePath(certificationId);
  const cert = readJSONFile<any>(filePath, null);
  
  if (!cert) {
    res.status(404).json({ error: lang === "en" ? "Certification not found" : "Certificação não encontrada" });
    return;
  }
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

  const filePath = getCertFilePath(certificationId);
  const cert = readJSONFile<any>(filePath, null);
  if (!cert) {
    res.status(404).json({ error: lang === "en" ? "Certification not found" : "Certificação não encontrada" });
    return;
  }

  const question = cert.questions.find((q: any) => q.id === questionId);
  if (!question) {
    res.status(404).json({ error: lang === "en" ? "Question not found" : "Questão não encontrada" });
    return;
  }

  const correctAnswers = question.correct_answers;
  const isCorrect = Array.isArray(selectedOption) && 
                    selectedOption.length === correctAnswers.length &&
                    selectedOption.every((val: string) => correctAnswers.includes(val));

  res.json({
    correct: isCorrect,
    correctAnswers: correctAnswers, 
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

  const filePath = getCertFilePath(certificationId);
  const cert = readJSONFile<any>(filePath, null);
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

  let aiAdvice = lang === "en" 
    ? "Prepare to see your personalized technical report compiled by the AI Mentor." 
    : "Prepare-se para ver seu aconselhamento personalizado por Inteligência Artificial.";
  let hasAIError = false;

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === "MY_DEEPSEEK_API_KEY" || apiKey.trim() === "") {
      throw new Error("DEEPSEEK_API_KEY is not defined. Please add your key in the AI Studio Settings secrets panel.");
    }
    let prompt = "";
    
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

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    if (data && data.choices && data.choices.length > 0 && data.choices[0].message) {
      aiAdvice = data.choices[0].message.content;
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

*Configure your DEEPSEEK_API_KEY in the Secrets panel of Google AI Studio Settings to unlock beautiful AI-generated feedback reports.*`;
    } else {
      aiAdvice = `### Nota de Orientação (IA Indisponível)
Não foi possível contatar o mentor IA devido ao seguinte motivo: \`${error.message || error}\`.

**Recomendação de Emergência:**
Analisando seus erros locais, foque seus estudos nos tópicos do Syllabus ISTQB listados abaixo:
${errorsList.length > 0 
  ? errorsList.map(err => `- **Tópico ${err.topic}**: Relacionado à questão \`${err.id}\` (${err.questionText.substring(0, 50)}...).`).join("\n")
  : "Excelente! Você gabaritou esta tentativa e não possui tópicos de erro para estudar!"
}

*Configure sua chave DEEPSEEK_API_KEY no painel de Secrets da plataforma para habilitar relatórios completos gerados por IA.*`;
    }
  }

  const attemptId = crypto.randomUUID();
  try {
    await Attempt.create({
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
    });
  } catch (err) {
    console.error("Failed to save attempt to DB", err);
  }

  res.json({
    attemptId,
    scorePercentage: percentScore,
    correctCount: scorePoints,
    totalQuestions: totalPoints,
    verdict: passVerdictStr,
    aiAdvice,
    results: resultsDetail 
  });
});

// Get user history
app.get("/api/user/history", authenticateToken, async (req, res) => {
  const userId = (req as any).user.id;
  try {
    const userAttempts = await Attempt.find({ userId }).sort({ date: 1 });
    
    const chartProgression = userAttempts.map(a => ({
      date: a.date,
      certificationId: a.certificationId,
      mode: a.mode,
      score: a.scorePercentage,
      timeSpentMins: Math.round(a.timeSpentSeconds / 60)
    }));

    const listHistory = [...userAttempts].reverse().map(a => ({
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
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Get single attempt detail
app.get("/api/attempts/:attemptId", authenticateToken, async (req, res) => {
  const { attemptId } = req.params;
  try {
    const attempt = await Attempt.findOne({ id: attemptId });
    if (!attempt) {
      res.status(404).json({ error: "Tentativa não encontrada" });
      return;
    }
    res.json(attempt);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch attempt" });
  }
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
