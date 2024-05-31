import express from "express";
import "dotenv/config";
import { SERVER_PORT } from "./constants/env.contant.js";

const app = express.Router();

app.use("/", []);

app.listen(SERVER_PORT, () => {
  console.log(`서버가 ${SERVER_PORT}번 포트에서 열렸습니다.`);
});
