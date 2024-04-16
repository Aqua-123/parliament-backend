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
import http from "http";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

import { Server } from "socket.io";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
import mongoose from "mongoose";

const mongoURI = "mongodb://localhost:27017/parliament";

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connection established"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Optional: In a production environment, you should handle process termination gracefully
process.on("SIGINT", () => {
  mongoose.connection.close(() => {
    console.log("MongoDB connection disconnected due to app termination");
    process.exit(0);
  });
});

const app = express();
app.use(cors());
app.use(express.json());
const client = createClient({ url: "redis://localhost:6379" });

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
  if (!text || !gender || !lang) return res.status(400).send("Invalid request");

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
    console.log(req.body);
    console.log(req.headers);
    const { email, name, constituency, house, motherTongue, password } =
      req.body;

    const user = new User({
      email,
      name,
      constituency,
      house,
      motherTongue,
      password,
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, "secretKey", {
      expiresIn: "12h",
    });
    res.status(201).json({ token, user });
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

const verifyToken = (req, res, next) => {
  if (DEBUG) {
    req.user = { id: "testuser" };
    return next();
  }
  let token = req.header("Authorization");
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }
  if (!token) return res.status(401).send("Access denied");
  try {
    const verified = jwt.verify(token, "secretKey");
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).send("Invalid token");
  }
};

app.get("/user", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

//  SOCKET LOGIC STARTS HERE

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "http://localhost:3000", credentials: true },
});

const port = 4000;
const userList = [];

io.on("connection", (socket) => {
  socket.on("join", (userId) => {
    if (!userList.includes(userId)) userList.push(userId);

    socket.join(userId);
    socket.emit("user-list", userList);
  });
  socket.on("text", (data) => {
    const { username, room, message, gender, data: translated } = data;
    io.to(room).emit("response", { username, message, gender, translated });
  });
});

server.listen(port, () => {
  console.log(`Worker ${process.pid} started`);
});
