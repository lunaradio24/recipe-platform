import express from 'express';
import passport from 'passport';
import axios from 'axios';
import querystring from 'querystring';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import CustomError from '../utils/custom-error.util.js';
import { prisma } from '../utils/prisma.util.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { authenticateToken } from '../middlewares/require-access-token.middleware.js';
import { authenticateRefreshToken } from '../middlewares/require-refresh-token.middleware.js';
import { requireEmailVerification } from '../middlewares/require-email-verification.middleware.js';
import nodemailer from 'nodemailer';
import { signUpValidator } from '../middlewares/validators/sign-up-validator.middleware.js';
import { signInValidator } from '../middlewares/validators/sign-in-validator.middleware.js';
import { isLoggedIn, isNotLoggedIn } from '../middlewares/check-login.middleware.js';
import { JWT_ACCESS_KEY, JWT_REFRESH_KEY, SALT_ROUNDS } from '../constants/auth.constant.js';

const authRouter = express.Router();

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 회원가입 api
authRouter.post('/sign-up', isNotLoggedIn, signUpValidator, async (req, res, next) => {
  try {
    const { email, password, confirmPassword, username, profileImage, introduction } = req.body;

    // 입력한 두 비밀번호가 일치하는지 확인
    if (password !== confirmPassword) {
      throw new CustomError(HTTP_STATUS.BAD_REQUEST, '입력한 두 비밀번호가 일치하지 않습니다.');
    }

    // 이메일 검증
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

    // 이메일 인증 링크 발송 양식
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '이메일 인증을 완료해주세요',
      html: `<p>이메일 인증을 위해 <a href="${process.env.CLIENT_URL}/verify-email?token=${emailVerificationToken}">여기</a>를 클릭해주세요.
      해당 인증은 9시간이 지나면 폐기됩니다.</p>`,
    };

    // 이메일 인증 링크 발송
    await transporter.sendMail(mailOptions);

    // 반환 정보
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

    // 에러 처리
  } catch (err) {
    next(err);
  }
});

// 로그인 API
authRouter.post('/sign-in', isNotLoggedIn, signInValidator, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // 입력한 비밀번호가 DB의 비밀번호와 일치하는지 확인
    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '인증정보가 유효하지 않습니다.');
    }

    // userId 정보를 payload에 넣어 JWT 생성
    const payload = { userId: user.userId };
    const accessToken = jwt.sign(payload, JWT_ACCESS_KEY, { expiresIn: '3h' });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_KEY, { expiresIn: '7d' });

    // 비밀번호는 hash 처리해서 DB에 저장
    const hashedRefreshToken = bcrypt.hashSync(refreshToken, SALT_ROUNDS);

    await prisma.refreshToken.upsert({
      where: { userId: user.userId },
      update: { token: hashedRefreshToken },

      create: {
        userId: user.userId,
        token: hashedRefreshToken,
      },
    });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      message: '로그인에 성공했습니다.',
      data: { accessToken, refreshToken },
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 유저 확인 api
authRouter.get('/user', authenticateToken, (req, res) => {
  try {
    if (!req.user) throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '인증정보가 유효하지 않습니다.');

    // 반환 정보
    res.status(HTTP_STATUS.OK).json({
      message: '이곳은 보호된 경로입니다.',
      user: req.user,
    });

    // 에러 처리
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

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      message: '재발급에 성공했습니다.',
      data: { accessToken, refreshToken },
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 로그아웃 API
authRouter.post('/sign-out', isLoggedIn, authenticateRefreshToken, async (req, res, next) => {
  try {
    const user = req.user;

    // refreshToken 값을 DB에서 삭제
    await prisma.refreshToken.update({
      where: { userId: user.userId },
      data: { token: null },
    });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      message: '로그아웃이 완료되었습니다.',
      data: { userId: user.userId },
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 이메일 인증 링크 클릭시 API
authRouter.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, JWT_ACCESS_KEY);
    const user = await prisma.user.findUnique({ where: { email: decoded.email } });

    // 사용자가 존재하지 않는 경우
    if (!user) throw new CustomError(HTTP_STATUS.NOT_FOUND, '사용자를 찾을 수 없습니다.');

    // 이미 이메일 인증을 완료한 경우
    if (user.emailVerified) throw new CustomError(HTTP_STATUS.BAD_REQUEST, '이미 이메일 인증이 완료되었습니다.');

    // 사용자 DB에 이메일 인증되었음을 업데이트
    await prisma.user.update({
      where: { email: decoded.email },
      data: { emailVerified: true, emailVerificationToken: null },
    });

    // 반환 정보
    res.status(HTTP_STATUS.OK).json({ message: '이메일 인증이 완료되었습니다.' });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 사용자 프로필 조회 with 이메일 인증
authRouter.get('/profile', authenticateToken, requireEmailVerification, async (req, res, next) => {
  try {
    // 현재 로그인된 사용자의 정보를 데이터베이스에서 조회
    const user = await prisma.user.findUnique({ where: { userId: req.user.userId } });

    // 사용자가 존재하지 않는 경우
    if (!user) throw new CustomError(HTTP_STATUS.NOT_FOUND, '사용자를 찾을 수 없습니다.');

    // 반환 정보
    res.status(HTTP_STATUS.OK).json({
      message: '이메일 인증이 완료된 유저입니다',
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

    // 에러 처리
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
    if (!user) throw new CustomError(HTTP_STATUS.NOT_FOUND, '사용자를 찾을 수 없습니다.');

    // 이미 이메일 인증을 완료한 경우
    if (user.emailVerified) throw new CustomError(HTTP_STATUS.BAD_REQUEST, '이미 이메일 인증이 완료되었습니다.');

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

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 카카오 로그인 api
authRouter.get('/kakao', passport.authenticate('kakao')); // 카카오 로그인 페이지로 이동
authRouter.get(
  '/kakao/callback',
  passport.authenticate('kakao', {
    failureRedirect: '/?error=로그인실패', // 로그인에 실패했을 경우 해당 라우터로 이동한다
  }),
  (req, res, next) => {
    res.status(200).redirect('/'); // 로그인에 성공했을 경우, 다음 라우터가 실행된다
  },
);

// 네이버 로그인 api
authRouter.get('/naver', passport.authenticate('naver')); // 네이버 로그인 페이지로 이동
authRouter.get(
  '/naver/callback',
  passport.authenticate('naver', {
    failureRedirect: '/?error=로그인실패', // 로그인에 실패했을 경우 해당 라우터로 이동한다
  }),
  (req, res, next) => {
    res.status(200).redirect('/'); // 로그인에 성공했을 경우, 다음 라우터가 실행된다
  },
);

export { authRouter };
