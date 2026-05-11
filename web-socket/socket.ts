import { createServer } from "http";
import { Server } from "socket.io";
import express from "express";
import { ClientToServerEvents, ServerToClientEvents } from "@/types/socket.type";

const app = express();
const server = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: "*",
  },
});

// CORE LOGIC
io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join", ({ userId }: { userId: string }) => {
    socket.join(userId);
    console.log("User joined:", userId);
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.id);
  });

  // CHATTING
  socket.on("channel:join", ({ channelId }) => {
    socket.join(`channel:${channelId}`);

    console.log(`Socket ${socket.id} joined channel:${channelId}`);
  });

  socket.on("channel:leave", ({ channelId }) => {
    socket.leave(`channel:${channelId}`);

    console.log(`Socket ${socket.id} left channel:${channelId}`);
  });
});

// HTTP TRIGGER (IMPORTANT)
app.use(express.json());

app.post("/emit", (req, res) => {
  const { userId, event, data } = req.body;
  console.log("EMIT API HIT:", req.body);

  io.to(userId).emit(event, data);

  console.log("Emitting to:", userId);
  res.json({ success: true });
});

server.listen(4000, () => {
  console.log("Socket server running on http://localhost:3000");
});
