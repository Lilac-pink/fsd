const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const db = require("./config/db");

const authRoutes = require("./routes/authRoutes");
const authMiddleware = require("./middleware/authMiddleware");
const serviceRoutes = require("./routes/serviceRoutes");
const tokenRoutes = require("./routes/tokenRoutes");
const adminMiddleware = require("./middleware/adminMiddleware");
const adminRoutes = require("./routes/adminRoutes");
const setupSocket = require("./socket/socketHandler");

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/services", serviceRoutes);

app.get("/api/admin/test", authMiddleware, adminMiddleware, (req, res) => {
  res.json({
    message: "Admin access successful!",
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "QueueLess backend is running!",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS result");

    res.json({
      message: "Database connected successfully!",
      result: rows[0].result,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Database connection failed",
    });
  }
});

app.get("/api/protected", authMiddleware, (req, res) => {
  res.json({
    message: "You are authenticated!",
    user: req.user,
  });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
  },
});

app.use("/api/tokens", tokenRoutes(io));
app.use("/api/admin", adminRoutes(io));

setupSocket(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
