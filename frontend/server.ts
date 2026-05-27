import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  // Basic API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // --- Real-time Chat Logic ---
  
  interface ChatMessage {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    text: string;
    createdAt: string;
  }
  
  const messages: ChatMessage[] = []; // In-memory message store

  let activeUsersCount = 0;

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    activeUsersCount++;
    io.emit("active_users_count", activeUsersCount);
    
    // Send existing messages to the new user
    socket.emit("init_messages", messages.slice(-50)); // Send last 50 messages

    socket.on("send_message", (data: Omit<ChatMessage, "id" | "createdAt">) => {
      // Very basic data validation
      if (!data.text || !data.userName || !data.userId) return;

      const newMessage: ChatMessage = {
        ...data,
        id: Math.random().toString(36).substring(2, 10),
        createdAt: new Date().toISOString()
      };
      
      messages.push(newMessage);
      // Keep only last 100 messages
      if (messages.length > 100) messages.shift();

      // Broadcast to everyone
      io.emit("new_message", newMessage);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      activeUsersCount--;
      io.emit("active_users_count", activeUsersCount);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
