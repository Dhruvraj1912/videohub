require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const videoRoutes = require("./routes/videoRoutes");
const commentRoutes = require("./routes/commentRoutes");
const downloadRoutes = require("./routes/downloadRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const authRoutes = require("./routes/authRoutes");
const translateRoutes = require("./routes/translateRoutes");

const app = express();
// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

const callRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  createdBy: { type: String, default: "unknown" },
  participants: { type: [String], default: [] },
  messages: [
    {
      from: String,
      text: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: 0 }, // in seconds
  isActive: { type: Boolean, default: true },
});

const CallRoom = mongoose.model("CallRoom", callRoomSchema);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/pages/:page", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/pages", req.params.page));
});

app.use(express.static(path.join(__dirname, "../client")));

app.use(
  "/uploads/videos",
  express.static(path.join(__dirname, "uploads/videos")),
);
app.use(
  "/uploads/thumbnails",
  express.static(path.join(__dirname, "uploads/thumbnails")),
);
const fs   = require("fs");

// Create upload directories on startup
const dirs = [
  path.join(__dirname, "uploads/videos"),
  path.join(__dirname, "uploads/thumbnails"),
];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});
// Existing API Routes
app.use("/api/videos", videoRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/downloads", downloadRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/translate", translateRoutes);

app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

app.get("/api/calls", async (req, res) => {
  try {
    const rooms = await CallRoom.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, rooms });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get("/api/calls/:roomId", async (req, res) => {
  try {
    const room = await CallRoom.findOne({ roomId: req.params.roomId });
    if (!room)
      return res
        .status(404)
        .json({ success: false, message: "Room not found" });
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/calls/create", async (req, res) => {
  try {
    const { roomId, createdBy } = req.body;
    if (!roomId)
      return res
        .status(400)
        .json({ success: false, message: "roomId is required" });

    const existing = await CallRoom.findOne({ roomId });
    if (existing)
      return res.json({ success: true, room: existing, alreadyExists: true });

    const room = await CallRoom.create({
      roomId,
      createdBy: createdBy || "unknown",
    });
    res.status(201).json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post("/api/calls/end", async (req, res) => {
  try {
    const { roomId, duration } = req.body;
    const room = await CallRoom.findOneAndUpdate(
      { roomId },
      { endedAt: new Date(), duration: duration || 0, isActive: false },
      { new: true },
    );
    if (!room)
      return res
        .status(404)
        .json({ success: false, message: "Room not found" });
    res.json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Root page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/pages/index.html"));
});

// HTTP  Socket.io Server
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
const activeRooms = {};

// Socket.io Room-based WebRTC Signaling
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  //Join Room
  socket.on("join-room", async ({ roomId, userName }) => {
    if (!roomId || !userName) return;

    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;

    // Track in memory
    if (!activeRooms[roomId]) activeRooms[roomId] = new Map();
    activeRooms[roomId].set(socket.id, userName);

    // Upsert room in MongoDB + add participant
    try {
      await CallRoom.findOneAndUpdate(
        { roomId },
        { $addToSet: { participants: userName }, isActive: true },
        { upsert: true, new: true },
      );
    } catch (err) {
      console.error("DB join-room error:", err.message);
    }

    socket.emit("room-info", {
      roomId,
      participants: [...activeRooms[roomId].values()],
    });

    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      userName,
      participants: [...activeRooms[roomId].values()],
    });

    console.log(
      `${userName} joined room: ${roomId} | total: ${activeRooms[roomId].size}`,
    );
  });

  //WebRTC – Offer
  socket.on("offer", (data) => {
    const roomId = data.roomId || socket.roomId;
    const payload = { ...data, fromSocketId: socket.id };

    if (data.targetSocketId) {
      io.to(data.targetSocketId).emit("offer", payload);
    } else {
      socket.to(roomId).emit("offer", payload);
    }
  });

  // WebRTC – Answer
  socket.on("answer", (data) => {
    const roomId = data.roomId || socket.roomId;
    const payload = { ...data, fromSocketId: socket.id };

    if (data.targetSocketId) {
      io.to(data.targetSocketId).emit("answer", payload);
    } else {
      socket.to(roomId).emit("answer", payload);
    }
  });

  //WebRTC – ICE Candidate
  socket.on("candidate", (data) => {
    const roomId = data.roomId || socket.roomId;
    const payload = { ...data, fromSocketId: socket.id };

    if (data.targetSocketId) {
      io.to(data.targetSocketId).emit("candidate", payload);
    } else {
      socket.to(roomId).emit("candidate", payload);
    }
  });

  //In-Call Chat
  socket.on("chat-message", async ({ roomId, from, text }) => {
    if (!roomId || !from || !text) return;

    const msg = { from, text, timestamp: new Date() };
    io.to(roomId).emit("chat-message", msg);
    try {
      await CallRoom.findOneAndUpdate({ roomId }, { $push: { messages: msg } });
    } catch (err) {
      console.error("DB chat-message error:", err.message);
    }
  });

  //Screen Share Events
  socket.on("screen-share-started", ({ roomId, userName }) => {
    socket
      .to(roomId)
      .emit("screen-share-started", { userName, socketId: socket.id });
  });

  socket.on("screen-share-stopped", ({ roomId, userName }) => {
    socket
      .to(roomId)
      .emit("screen-share-stopped", { userName, socketId: socket.id });
  });

  // Manual Leave
  socket.on("leave-room", async ({ roomId, duration }) => {
    await handleLeave(socket, roomId, duration || 0);
  });

  //Disconnect (tab close / network drop)
  socket.on("disconnect", async () => {
    console.log("Socket disconnected:", socket.id);
    if (socket.roomId) {
      await handleLeave(socket, socket.roomId, 0);
    }
  });
});

async function handleLeave(socket, roomId, duration) {
  const userName = socket.userName || "Unknown";

  if (activeRooms[roomId]) {
    activeRooms[roomId].delete(socket.id);

    if (activeRooms[roomId].size === 0) {
      // Last person left – close the room
      delete activeRooms[roomId];
      try {
        await CallRoom.findOneAndUpdate(
          { roomId },
          { endedAt: new Date(), duration, isActive: false },
        );
      } catch (err) {
        console.error("DB handleLeave error:", err.message);
      }
    }
  }

  socket.leave(roomId);

  // Notify remaining participants
  socket.to(roomId).emit("user-left", {
    socketId: socket.id,
    userName,
    participants: activeRooms[roomId] ? [...activeRooms[roomId].values()] : [],
  });

  console.log(`${userName} left room: ${roomId}`);
}

// Start Server
server.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
