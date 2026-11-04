import express from "express";
import "./config/env.service.js";
import { env } from "./config/env.service.js";
import authRouter from "./module/auth/auth.controller.js";
import messageRouter from "./module/message/message.controller.js";
import { databaseConnection } from "./database/connection.js";
import path from "path";
import { fileURLToPath } from "url";
import { redisConnection } from "./database/redis/connection.js";
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadPath = path.resolve(__dirname, "../uploads");
app.use("/uploads", express.static(uploadPath));

app.use(express.json());
app.use("/auth", authRouter);
app.use("/message", messageRouter);
databaseConnection();
export const client = await redisConnection();
client.set("test", "rana");
app.use((err, req, res, next) => {
  res.status(err.cause?.status || 500).json({
    message: err.message,
  });
});
app.listen(env.port, () => {
  console.log(`server is running on port ${env.port}`);
});
