import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
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
app.use(cookieParser());
app.use(
  session({
    secure: true, // https 환경에서만 session 정보를 주고받도록처리
    secret: SESSION_SECRET_KEY, // 암호화하는 데 쓰일 키
    resave: false, // 세션을 언제나 저장할지 설정함
    saveUninitialized: true, // 세션에 저장할 내역이 없더라도 처음부터 세션을 생성할지 설정
    cookie: {
      //세션 쿠키 설정 (세션 관리 시 클라이언트에 보내는 쿠키)
      httpOnly: true, // 자바스크립트를 통해 세션 쿠키를 사용할 수 없도록 함
      Secure: true,
    },
    name: 'session-cookie', // 세션 쿠키명 디폴트값은 connect.sid이지만 다른 이름을 줄수도 있다.
  }),
);

// 소셜 로그인 미들웨어
app.use(passport.initialize()); // req 객체에 passport 설정을 심음
app.use(passport.session());
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
