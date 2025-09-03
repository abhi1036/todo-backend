const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Atlas connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Task Schema
const taskSchema = new mongoose.Schema({
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Task = mongoose.model("Task", taskSchema);

// Routes

// GET all tasks
app.get("/tasks", async (req, res) => {
  const tasks = await Task.find().sort({ createdAt: -1 });
  res.json(tasks);
});

// POST new task
app.post("/tasks", async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim() === "") {
    return res.status(400).json({ message: "Task cannot be empty" });
  }
  const newTask = new Task({ text });
  await newTask.save();
  res.json(newTask);
});

// PUT update task
app.put("/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { text, completed } = req.body;

  const task = await Task.findById(id);
  if (!task) return res.status(404).json({ message: "Task not found" });

  if (text !== undefined) task.text = text;
  if (completed !== undefined) task.completed = completed;

  await task.save();
  res.json(task);
});

// DELETE a task
app.delete("/tasks/:id", async (req, res) => {
  await Task.findByIdAndDelete(req.params.id);
  res.json({ message: "Task deleted successfully" });
});

// Test route
app.get("/", (req, res) => res.send("Todo Backend is running..."));

// Use environment PORT for Render
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
