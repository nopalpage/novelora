var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_http = require("http");
var import_socket = require("socket.io");
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  const httpServer = (0, import_http.createServer)(app);
  const io = new import_socket.Server(httpServer, {
    cors: { origin: "*" }
  });
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  const messages = [];
  let activeUsersCount = 0;
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    activeUsersCount++;
    io.emit("active_users_count", activeUsersCount);
    socket.emit("init_messages", messages.slice(-50));
    socket.on("send_message", (data) => {
      if (!data.text || !data.userName || !data.userId) return;
      const newMessage = {
        ...data,
        id: Math.random().toString(36).substring(2, 10),
        createdAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      messages.push(newMessage);
      if (messages.length > 100) messages.shift();
      io.emit("new_message", newMessage);
    });
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      activeUsersCount--;
      io.emit("active_users_count", activeUsersCount);
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
