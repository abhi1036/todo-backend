const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;       // Set in Render dashboard
const SECRET_KEY = process.env.JWT_SECRET;     // Set in Render dashboard

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===== User Schema =====
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: { type: String },
});

const User = mongoose.model("User", userSchema);

// ===== Task Schema =====
const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Task = mongoose.model("Task", taskSchema);

// ===== Register =====
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Missing fields" });

  const existingUser = await User.findOne({ username });
  if (existingUser) return res.status(400).json({ message: "Username already exists" });

  const hashed = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashed });
  await user.save();
  res.json({ message: "User registered successfully" });
});

// ===== Login =====
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Missing fields" });

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid credentials" });

  const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: "1d" });
  res.json({ token });
});

// ===== Auth Middleware =====
const auth = async (req, res, next) => {
  const token = req.headers.authorization;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// ===== Task Routes =====
app.get("/tasks", auth, async (req, res) => {
  const tasks = await Task.find({ userId: req.userId }).sort({ createdAt: -1 });
  res.json(tasks);
});

app.post("/tasks", auth, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: "Task cannot be empty" });

  const task = new Task({ text, userId: req.userId });
  await task.save();
  res.json(task);
});

app.put("/tasks/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { text, completed } = req.body;
  const task = await Task.findOne({ _id: id, userId: req.userId });
  if (!task) return res.status(404).json({ message: "Task not found" });

  if (text !== undefined) task.text = text;
  if (completed !== undefined) task.completed = completed;

  await task.save();
  res.json(task);
});

app.delete("/tasks/:id", auth, async (req, res) => {
  await Task.findOneAndDelete({ _id: req.params.id, userId: req.userId });
  res.json({ message: "Task deleted successfully" });
});

// ===== Start Server =====
app.listen(PORT, () => console.log(`🚀 Server running at port ${PORT}`));
