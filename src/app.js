import 'dotenv/config';
import express from 'express';
import { SERVER_PORT } from './constants/env.constant.js';
import { HTTP_STATUS } from './constants/http-status.constant.js';
import { apiRouter } from './routers/index.js';


const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health-check', (req, res) => {
  return res.status(HTTP_STATUS.OK).send(`I'm healthy`);
});

app.use('/', apiRouter);
// app.use(errorHandler);

app.listen(SERVER_PORT, () => {
  console.log(`서버가 ${SERVER_PORT}번 포트에서 실행중입니다.`);
});
