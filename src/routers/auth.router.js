import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { prisma } from '../utils/prisma.util.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { authenticateToken } from '../middlewares/require-access-token.middleware.js';
import { authenticateRefreshToken } from '../middlewares/require-refresh-token.middleware.js';
import { requireEmailVerification } from '../middlewares/require-email-verification.middleware.js';
import nodemailer from 'nodemailer';

dotenv.config();
const authRouter = express.Router();

const jwtSecret = process.env.JWT_SECRET;
const jwtRefresh = process.env.JWT_REFRESH;
const saltRounds = 10;

const REQUIRED_FIELDS_SIGNUP = ['email', 'password', 'confirmPassword', 'username'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 회원가입 api
authRouter.post('/sign-up', async (req, res, next) => {
  try {
    const { email, password, confirmPassword, username, profileImage, introduction } = req.body;

    const missingFields = REQUIRED_FIELDS_SIGNUP.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: `${missingFields.join(', ')} 를 입력해주세요` });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: '이메일 형식이 옳바르지 않습니다.' });
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: `비밀번호는 ${PASSWORD_MIN_LENGTH}자리 이상이어야 합니다.` });
    }

    if (password !== confirmPassword) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: '입력한 두 비밀번호가 일치하지 않습니다.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({ message: '이미 가입된 사용자입니다.' });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const emailVerificationToken = jwt.sign({ email }, jwtSecret, { expiresIn: '1h' });

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        username,
        profileImage: profileImage || null,
        introduction: introduction || null,
        emailVerificationToken,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '이메일 인증을 완료해주세요',
      html: `<p>이메일 인증을 위해 <a href="${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}">여기</a>를 클릭해주세요.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(HTTP_STATUS.CREATED).json({
      message: '회원가입에 성공했습니다. 이메일 인증을 완료해주세요.',
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
    next(err);
  }
});

// 로그인 API
authRouter.post('/sign-in', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: '인증정보가 유효하지 않습니다.' });
    }

    const payload = { userId: user.userId };

    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '3h' });
    const refreshToken = jwt.sign(payload, jwtRefresh, { expiresIn: '7d' });

    const hashedRefreshToken = bcrypt.hashSync(refreshToken, saltRounds);

    await prisma.refreshToken.upsert({
      where: { userId: user.userId },
      update: { token: hashedRefreshToken },
      create: { userId: user.userId, token: hashedRefreshToken },
    });

    return res.status(HTTP_STATUS.OK).json({
      message: '로그인에 성공했습니다.',
      data: { accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
});

// 유저 확인 api
authRouter.get('/user', authenticateToken, (req, res) => {
  try {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: '인증정보가 유효하지 않습니다.' });
    }

    res.status(HTTP_STATUS.OK).json({
      message: '이곳은 보호된 경로입니다.',
      user: req.user,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// 토큰 재발급 api
authRouter.post('/renew-tokens', authenticateRefreshToken, async (req, res, next) => {
  try {
    const user = req.user;
    const payload = { userId: user.userId };

    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: '3h' });
    const refreshToken = jwt.sign(payload, jwtRefresh, { expiresIn: '7d' });

    const hashedRefreshToken = bcrypt.hashSync(refreshToken, saltRounds);

    await prisma.refreshToken.upsert({
      where: { userId: user.userId },
      update: { token: hashedRefreshToken },
      create: { userId: user.userId, token: hashedRefreshToken },
    });

    return res.status(HTTP_STATUS.OK).json({
      message: '재발급에 성공했습니다.',
      data: { accessToken, refreshToken },
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
      where: { userId: user.userId },
      data: { token: null },
    });

    return res.status(HTTP_STATUS.OK).json({
      message: '로그아웃이 완료되었습니다.',
      data: { userId: user.userId },
    });
  } catch (error) {
    next(error);
  }
});

// 이메일 확인 API
authRouter.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;

    const decoded = jwt.verify(token, jwtSecret);

    const user = await prisma.user.findUnique({
      where: { email: decoded.email },
    });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    if (user.emailVerified) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: '이미 이메일 인증이 완료되었습니다.' });
    }

    await prisma.user.update({
      where: { email: decoded.email },
      data: { emailVerified: true, emailVerificationToken: null },
    });

    res.status(HTTP_STATUS.OK).json({ message: '이메일 인증이 완료되었습니다.' });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: '토큰이 만료되었습니다.' });
    }
    next(error);
  }
});

// 사용자 프로필 조회 with 이메일 인증
authRouter.get('/profile', authenticateToken, requireEmailVerification, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: req.user.userId },
    });

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    res.status(HTTP_STATUS.OK).json({
      message: '이메일 인증까지 한 유저입니다',
      data: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        profileImage: user.profileImage,
        introduction: user.introduction,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});


export { authRouter };
