import express from "express";
import cors from "cors";
import { createClient } from "redis";
import cluster from "cluster";
import os from "os";
import multer from "multer";
import TranslateTextAzure from "./src/Translate.js";
import TextToSpeechAzure from "./src/TTS.js";
import SpeechToText from "./src/ASR.js";
import User from "./Modals/User.js";

const TOTAL_CPUS = os.cpus().length;
const DEBUG_MODE = true;

const storage = multer.memoryStorage(); // Stores files in memory
const upload = multer({ storage: storage });

if (cluster.isPrimary) {
  console.log(`Master ${process.pid} is running`);

  const numWorkers = DEBUG_MODE ? 1 : TOTAL_CPUS;
  for (let i = 0; i < numWorkers; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  const app = express();
  app.use(cors()); // Enable CORS for all routes and origins
  const client = createClient({
    url: "redis://localhost:6379",
  });

  client.on("connect", () => console.log("Connected to Redis"));
  client.on("error", (err) => console.log("Redis Client Error", err));

  app.get("/", async (req, res) => {
    const cacheKey = "home";
    const cachedData = await client.get(cacheKey);

    if (cachedData) {
      console.log("Cache hit");
      return res.send(`Cached: ${cachedData}`);
    } else {
      console.log("Cache miss");
      const freshData = "Hello World from Express!";
      await client.set(cacheKey, freshData, {
        EX: 600,
      });
      return res.send(freshData);
    }
  });

  app.get("/translate", async (req, res) => {
    const { text, lang } = req.query;
    if (!text || !lang) return res.status(400).send("Invalid request");

    const translation = await TranslateTextAzure(text, lang);
    if (!translation) return res.status(500).send("Failed to translate text");

    return res.send(translation);
  });

  app.get("/tts", async (req, res) => {
    const { text, gender, lang } = req.query;
    if (!text || !gender || !lang)
      return res.status(400).send("Invalid request");

    const audio = await TextToSpeechAzure(text, lang, gender);

    if (!audio) return res.status(500).send("Failed to convert text to speech");

    res.setHeader("Content-Type", "audio/wav");
    return res.send(audio);
  });

  app.post("/asr", upload.single("audio"), async (req, res) => {
    console.log("Received audio file");

    if (!req.file || !req.body.lang) {
      return res
        .status(400)
        .send("Invalid request: No file or language provided");
    }

    const { lang } = req.body;
    const audioBuffer = req.file.buffer;

    try {
      const text = await SpeechToText(audioBuffer, lang);
      if (!text) {
        return res.status(500).send("Failed to convert speech to text");
      }
      return res.send({ text });
    } catch (error) {
      console.error("Error processing the audio:", error);
      return res.status(500).send("Server error");
    }
  });

  app.post("/sign-up", async (req, res) => {
    try {
      const { email, name, constituency, sabha, mothertongue, password } =
        req.body;

      const user = new User({
        email,
        name,
        constituency,
        sabha,
        mothertongue,
        password,
      });

      await user.save();

      const token = jwt.sign({ id: user._id }, "secretKey", {
        expiresIn: "16",
      });
      res.status(201).json({ token, userType });
    } catch (error) {
      res.status(400).send(error.message);
    }
  });

  app.post("/sign-in", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).send("Authentication failed");
      }
      const token = jwt.sign({ id: user._id }, "secretKey", {
        expiresIn: "12h",
      });
      res.json({ token, user });
    } catch (error) {
      res.status(400).send(error.message);
    }
  });

  // const verifyToken = (req, res, next) => {
  //   if (DEBUG) {
  //     req.user = { id: "testuser" };
  //     return next();
  //   }
  //   let token = req.header("Authorization");
  //   if (token.startsWith("Bearer ")) {
  //     token = token.slice(7, token.length);
  //   }
  //   if (!token) return res.status(401).send("Access denied");
  //   try {
  //     const verified = jwt.verify(token, "secretKey");
  //     req.user = verified;
  //     next();
  //   } catch (error) {
  //     res.status(400).send("Invalid token");
  //   }
  // };

  app.listen(4000, () => {
    console.log(`Worker ${process.pid} started`);
  });
}
