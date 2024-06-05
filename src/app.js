import 'dotenv/config';
import express from 'express';
import passport from 'passport';
import { strategies } from './passport/index.js';
import { SERVER_PORT } from './constants/env.constant.js';
import { HTTP_STATUS } from './constants/http-status.constant.js';
import { apiRouter } from './routers/index.js';
import { fileURLToPath } from 'url'; // 추가: fileURLToPath 모듈
import errorHandler from './middlewares/error-handler.middleware.js';
import path from 'path'; // 추가: path 모듈
import { SESSION_SECRET_KEY } from './constants/auth.constant.js';

// __dirname 정의
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 소셜 로그인 미들웨어
app.use(passport.initialize()); // req 객체에 passport 설정을 심음
strategies();

// 정적 파일 제공 미들웨어
app.use(express.static(path.join(__dirname, '../public')));

app.get('/health-check', (req, res) => {
  return res.status(HTTP_STATUS.OK).send(`I'm healthy`);
});

// api 라우터
app.use('/', apiRouter);

// 에러 핸들러
app.use(errorHandler);

app.listen(SERVER_PORT, () => {
  console.log(`서버가 ${SERVER_PORT}번 포트에서 실행중입니다.`);
});
