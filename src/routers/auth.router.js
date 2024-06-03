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
        one_liner: newUser.introduction,
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
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: '인증정보가 유효하지 않습니다.',
      });
    }

    const payload = { userId: user.userId };


    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '3h' });
    const refreshToken = jwt.sign(payload, jwtRefresh,{expiresIn: '7d'});

    const hashedRefreshToken = bcrypt.hashSync(refreshToken,saltRounds);

    await prisma.refreshToken.upsert({
      where:{
        userId: user.userId,
      },
      update: {
        token: hashedRefreshToken,
      },
      create: {
        userId: user.userId,
        token: hashedRefreshToken,
      },
    });

    return res.status(HTTP_STATUS.OK).json({
      message: '로그인에 성공했습니다.',
      data: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
});

//유저 확인 api
authRouter.get('/user', authenticateToken, (req, res) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: '인증정보가 유효하지 않습니다.',
      });
    }

    res.status(HTTP_STATUS.OK).json({
      message: '이곳은 보호된 경로입니다.',
      user: req.user,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      message: '서버 오류가 발생했습니다.',
    });
  }
});


// 토큰 재발급 api
authRouter.post('/renew-tokens', authenticateRefreshToken, async (req, res, next) => {
  try {
    const user = req.user;
    const payload = { userId: user.userId };

    // 새로운 accessToken과 refreshToken 생성
    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '3h' });
    const refreshToken = jwt.sign(payload, jwtRefresh, { expiresIn: '7d' });

    const hashedRefreshToken = bcrypt.hashSync(refreshToken, saltRounds);

    console.log(refreshToken);
    console.log(req.headers.authorization);
    console.log(hashedRefreshToken);
    const result = await prisma.refreshToken.upsert({
      where: {
        userId: user.userId,
      },
      update: {
        token: hashedRefreshToken,
      },
      create: {
        userId: user.userId,
        token: hashedRefreshToken,
      },
    });
    console.log(result);
    return res.status(HTTP_STATUS.OK).json({
      message: '재발급에 성공했습니다.',
      data: {
        accessToken,
        refreshToken,
      },
    });

  } catch (error) {
    next(error);
  }
});


// 로그아웃 API
authRouter.post('/sign-out', authenticateRefreshToken, async (req, res, next) => {
  try {
    const user = req.user;
    await prisma.refreshToken.update({
      where:{
        userId : user.userId
      },
      data:{
        token: null,
      }
    });

    return res.status(HTTP_STATUS.OK).json({
      message: '로그아웃이 완료되었습니다.',
      data: {
        userId : user.userId
      },
    });
    
  } catch (error) {
    next(error); // 에러를 다음 미들웨어로 전달
  }
});

export { authRouter };