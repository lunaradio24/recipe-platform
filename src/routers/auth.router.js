// routers/authRouter.js
import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { authenticateToken } from '../middlewares/require-access-token.middleware.js';
import { authenticateRefreshToken } from '../middlewares/require-refresh-token.middleware.js';

dotenv.config();
const authRouter = express.Router();

const jwtSecret = process.env.JWT_SECRET;
const jwtRefresh = process.env.JWT_REFRESH;
const saltRounds = 10;

const REQUIRED_FIELDS_SIGNUP = ['email', 'password', 'confirmPassword', 'username'];
const REQUIRED_FIELDS_SIGNIN = ['email', 'password'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

// 회원가입 api
authRouter.post('/sign-up', async (req, res, next) => {
  try {
    const { email, password, confirmPassword, username, profileImage, introduction } = req.body;

    // 유효성 검증
    const missingFields = REQUIRED_FIELDS_SIGNUP.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: `${missingFields.join(', ')} 를 입력해주세요` });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: '이메일 형식이 옳바르지 않습니다.' });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ message: `비밀번호는 ${PASSWORD_MIN_LENGTH}자리 이상이어야 합니다.` });
    }

    if (password !== confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: '입력한 두 비밀번호가 일치하지 않습니다.' });
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({ message: '이미 가입된 사용자입니다.' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        profileImage: profileImage || null,
        introduction: introduction || null,
      },
    });

    // 생성된 사용자 반환
    res.status(HTTP_STATUS.CREATED).json({
      message: '회원가입에 성공했습니다.',
      data: {
        userid: newUser.userId,
        email: newUser.email,
        username: newUser.username,
        profileImage: newUser.profileImage,
        introduction: newUser.introduction,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    });
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

// 로그인 API
authRouter.post('/sign-in', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 유효성 검증
    const missingFields = REQUIRED_FIELDS_SIGNIN.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: `${missingFields.join(', ')} 를 입력해주세요` });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: '이메일 형식이 올바르지 않습니다.' });
    }

    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: '존재하지 않는 이메일입니다.' });
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: '비밀번호가 일치하지 않습니다.' });
    }

    // 액세스 토큰 생성
    const accessToken = jwt.sign({ userId: user.userId }, jwtSecret, { expiresIn: '3h' });
    const refreshToken = jwt.sign({ userId: user.userId }, jwtRefresh, { expiresIn: '7d' });

    // 리프레시 토큰 해싱 및 저장
    const hashedRefreshToken = await bcrypt.hash(refreshToken, saltRounds);

    const existingToken = await prisma.refreshToken.findFirst({
      where: { userId: user.userId },
    });

    if (existingToken) {
      await prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { token: hashedRefreshToken },
      });
    } else {
      await prisma.refreshToken.create({
        data: {
          userId: user.userId,
          token: hashedRefreshToken,
        },
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: '로그인에 성공했습니다.',
      data: {
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err); // 에러 핸들러로 에러 전달
  }
});

//유저 확인 api
authRouter.get('/user', authenticateToken, (req, res) => {
  res.status(200).json({ message: '이곳은 보호된 경로입니다.', user: req.user });
});

//토큰 재발급 api
authRouter.post('/renew-tokens', authenticateRefreshToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // 새로운 액세스 토큰과 리프레시 토큰 생성
    const newAccessToken = jwt.sign({ userId }, jwtSecret, { expiresIn: '12h' });
    const newRefreshToken = jwt.sign({ userId }, jwtRefresh, { expiresIn: '7d' });

    // 새로운 리프레시 토큰 해싱
    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, saltRounds);

    // 기존 리프레시 토큰 조회
    const existingToken = await prisma.refreshToken.findFirst({
      where: { userId },
    });

    if (existingToken) {
      // 기존 리프레시 토큰이 있을 경우 업데이트
      await prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { token: hashedRefreshToken },
      });
    } else {
      // 기존 리프레시 토큰이 없을 경우 생성
      await prisma.refreshToken.create({
        data: {
          userId,
          token: hashedRefreshToken,
        },
      });
    }

    res.status(HTTP_STATUS.OK).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error); // 에러를 다음 미들웨어로 전달
  }
});


// 로그아웃 API
authRouter.post('/sign-out', authenticateRefreshToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;

    // 리프레시 토큰 삭제
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // 유저 정보 조회
    const user = await prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.status(HTTP_STATUS.OK).json({
      message: '로그아웃에 성공했습니다.',
      data: {
        userId: user.userId,
        email: user.email,
      },
    });
  } catch (error) {
    next(error); // 에러를 다음 미들웨어로 전달
  }
});


export { authRouter };
