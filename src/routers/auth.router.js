import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import CustomError from '../utils/custom-error.util.js';
import { prisma } from '../utils/prisma.util.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { authenticateToken } from '../middlewares/require-access-token.middleware.js';
import { authenticateRefreshToken } from '../middlewares/require-refresh-token.middleware.js';
import { requireEmailVerification } from '../middlewares/require-email-verification.middleware.js';
import nodemailer from 'nodemailer';
import { signUpValidator } from '../middlewares/validators/signUp-validator.middleware.js';
import { signInValidator } from '../middlewares/validators/signIn-validator.middleware.js';

import {
  JWT_ACCESS_KEY,
  JWT_REFRESH_KEY,
  SALT_ROUNDS,
  REQUIRED_FIELDS_SIGNUP,
  EMAIL_REGEX,
  PASSWORD_MIN_LENGTH,
} from '../constants/auth.constant.js';

const authRouter = express.Router();

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 회원가입 api
authRouter.post('/sign-up', signUpValidator, async (req, res, next) => {
  try {
    const { email, password, confirmPassword, username, profileImage, introduction } = req.body;

    // const missingFields = REQUIRED_FIELDS_SIGNUP.filter((field) => !req.body[field]);
    // if (missingFields.length > 0) {
    //   throw new CustomError(HTTP_STATUS.BAD_REQUEST, `${missingFields.join(', ')} 를 입력해주세요`);
    // }

    // if (!EMAIL_REGEX.test(email)) {
    //   throw new CustomError(HTTP_STATUS.BAD_REQUEST, '이메일 형식이 옳바르지 않습니다.');
    // }

    // if (password.length < PASSWORD_MIN_LENGTH) {
    //   throw new CustomError(HTTP_STATUS.BAD_REQUEST, `비밀번호는 ${PASSWORD_MIN_LENGTH}자리 이상이어야 합니다.`);
    // }

    if (password !== confirmPassword) {
      throw new CustomError(HTTP_STATUS.BAD_REQUEST, '입력한 두 비밀번호가 일치하지 않습니다.');
    }




    const emailVerificationToken = jwt.sign({ email }, JWT_ACCESS_KEY, { expiresIn: '9h' });


    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new CustomError(HTTP_STATUS.CONFLICT, '이미 가입된 사용자입니다.');

    // 비밀번호 해시화
    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

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
      html: `<p>이메일 인증을 위해 <a href="${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}">여기</a>를 클릭해주세요.
      해당 인증은 9시간이 지나면 폐기됩니다.</p>`,
    };

    await transporter.sendMail(mailOptions);

    res.status(HTTP_STATUS.CREATED).json({
      message: '회원가입에 성공했습니다. 이메일 인증을 완료해주세요.',
      data: {
        userId: newUser.userId,
        email: newUser.email,
        username: newUser.username,
        profileImage: newUser.profileImage,
        one_liner: newUser.introduction,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    });
    // 에러 핸들러로 에러 전달
  } catch (err) {
    next(err);
  }
});

// 로그인 API
authRouter.post('/sign-in', signInValidator, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '인증정보가 유효하지 않습니다.');
    }

    const payload = { userId: user.userId };

    const accessToken = jwt.sign(payload, JWT_ACCESS_KEY, { expiresIn: '3h' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_KEY, { expiresIn: '7d' });

    const hashedRefreshToken = bcrypt.hashSync(refreshToken, SALT_ROUNDS);

    await prisma.refreshToken.upsert({
      where: { userId: user.userId },
      update: { token: hashedRefreshToken },

      create: {
        userId: user.userId,
        token: hashedRefreshToken,
      },
    });

    return res.status(HTTP_STATUS.OK).json({
      message: '로그인에 성공했습니다.',
      data: { accessToken, refreshToken},
    });
  } catch (error) {
    next(error);
  }
});

// 유저 확인 api
authRouter.get('/user', authenticateToken, (req, res) => {
  try {
    if (!req.user) {
      throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '인증정보가 유효하지 않습니다.');
    }

    res.status(HTTP_STATUS.OK).json({
      message: '이곳은 보호된 경로입니다.',
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
});

// 토큰 재발급 api
authRouter.post('/renew-tokens', authenticateRefreshToken, async (req, res, next) => {
  try {
    const user = req.user;
    const payload = { userId: user.userId };

    // 새로운 accessToken과 refreshToken 생성
    const accessToken = jwt.sign(payload, JWT_ACCESS_KEY, { expiresIn: '3h' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_KEY, { expiresIn: '7d' });

    const hashedRefreshToken = bcrypt.hashSync(refreshToken, SALT_ROUNDS);

    // refreshToken 갱신
    await prisma.refreshToken.upsert({
      where: { userId: user.userId },
      update: { token: hashedRefreshToken },
      create: {
        userId: user.userId,
        token: hashedRefreshToken,
      },
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

// 이메일 확인시 인증 API 해당api는 인증메일을 읽는api?입니다
authRouter.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;

    const decoded = jwt.verify(token, JWT_ACCESS_KEY);

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


// 인증 이메일 재발급 api
authRouter.post('/send-verification-email', authenticateToken, async (req, res, next) => {
  try {
    // 현재 로그인된 사용자의 정보를 데이터베이스에서 조회
    const user = await prisma.user.findUnique({ where: { userId: req.user.userId } });

    // 사용자가 존재하지 않는 경우
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    // 이미 이메일 인증을 완료한 경우
    if (user.emailVerified) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: '이미 이메일 인증이 완료되었습니다.' });
    }

    // 새로운 이메일 인증 토큰 생성
    const emailVerificationToken = jwt.sign({ email: user.email }, JWT_ACCESS_KEY, { expiresIn: '9h' });

    // 데이터베이스에 이메일 인증 토큰 업데이트
    await prisma.user.update({
      where: { userId: user.userId },
      data: { emailVerificationToken },
    });

    // 이메일 옵션 설정
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: '이메일 인증을 완료해주세요',
      html: `<p>이메일 인증을 위해 <a href="${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}">여기</a>를 클릭해주세요.
      해당 인증은 9시간이 지나면 폐기됩니다.</p>`,
    };

    // 이메일 전송
    await transporter.sendMail(mailOptions);

    // 성공 메시지 반환
    res.status(HTTP_STATUS.OK).json({
      message: '이메일 인증 요청을 성공적으로 전송했습니다.',
    });
  } catch (error) {
    next(error);
  }
});

export { authRouter };
