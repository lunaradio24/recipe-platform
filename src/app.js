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
// 로그인 필요 없는 라우트
app.get('/public', (req, res) => {
  res.send('This is a public route.');
});

// 액세스 토큰 검증 미들웨어
function ensureAuthenticated(req, res, next) {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).send('로그인이 필요합니다.');
  }

  // 토큰 검증 로직 (예: JWT)
  // jwt.verify(token, 'your_secret_key', (err, decoded) => {
  //   if (err) {
  //     return res.status(HTTP_STATUS.UNAUTHORIZED).send('토큰이 유효하지 않습니다.');
  //   }
  //   req.user = decoded;
  //   next();
  // });

  // 여기서는 간단히 다음으로 진행 (실제 구현에서는 위의 로직을 사용)
  next();
}

// 로그인 필요한 라우트
app.get('/protected', ensureAuthenticated, (req, res) => {
  res.send('This is a protected route. You are logged in.');
});

app.use('/', apiRouter);
app.use(errorHandler);

app.listen(SERVER_PORT, () => {
  console.log(`서버가 ${SERVER_PORT}번 포트에서 실행중입니다.`);
});
