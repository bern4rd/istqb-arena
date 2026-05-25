import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const MONGO_URI = "mongodb+srv://felipe:Ld8jVNRHdPNoeq@cluster0.adpgryc.mongodb.net/istqb_arena?retryWrites=true&w=majority&appName=Cluster0";

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

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Conectado ao MongoDB para migração...");

    const usersPath = path.join(process.cwd(), "src", "data", "users.json");
    if (fs.existsSync(usersPath)) {
      const users = JSON.parse(fs.readFileSync(usersPath, "utf-8"));
      for (const u of users) {
        await User.updateOne({ id: u.id }, { $set: u }, { upsert: true });
      }
      console.log(`Migrados ${users.length} usuários.`);
    }

    const attemptsPath = path.join(process.cwd(), "src", "data", "attempts.json");
    if (fs.existsSync(attemptsPath)) {
      const attempts = JSON.parse(fs.readFileSync(attemptsPath, "utf-8"));
      for (const a of attempts) {
        await Attempt.updateOne({ id: a.id }, { $set: a }, { upsert: true });
      }
      console.log(`Migradas ${attempts.length} tentativas.`);
    }

    console.log("Migração concluída com sucesso!");
    process.exit(0);
  } catch (err) {
    console.error("Erro na migração:", err);
    process.exit(1);
  }
}

migrate();
