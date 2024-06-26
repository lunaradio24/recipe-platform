import express from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import CustomError from '../utils/custom-error.util.js';
import { prisma } from '../utils/prisma.util.js';
import { Prisma } from '@prisma/client';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { requireAccessToken } from '../middlewares/require-access-token.middleware.js';
import { requireRefreshToken } from '../middlewares/require-refresh-token.middleware.js';
import { requireEmailVerification } from '../middlewares/require-email-verification.middleware.js';
import { sendVerificationEmail } from '../utils/email.util.js';
import { signUpValidator } from '../middlewares/validators/sign-up-validator.middleware.js';
import { signInValidator } from '../middlewares/validators/sign-in-validator.middleware.js';
import {
  JWT_ACCESS_KEY,
  JWT_REFRESH_KEY,
  JWT_EMAIL_KEY,
  SALT_ROUNDS,
  HUNTER_API_KEY,
  SESSION_SECRET_KEY,
} from '../constants/auth.constant.js';

const authRouter = express.Router();

async function verifyEmailWithHunter(email) {
  const url = `https://api.hunter.io/v2/email-verifier?email=${email}&api_key=${HUNTER_API_KEY}`;
  const response = await axios.get(url);
  return response.data.data.result === 'deliverable';
}

// 회원가입 api
authRouter.post('/sign-up', signUpValidator, async (req, res, next) => {
  try {
    const { email, password, confirmPassword, username, profileImage, introduction } = req.body;

    // 입력한 두 비밀번호가 일치하는지 확인
    if (password !== confirmPassword) {
      throw new CustomError(HTTP_STATUS.BAD_REQUEST, '입력한 두 비밀번호가 일치하지 않습니다.');
    }

    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new CustomError(HTTP_STATUS.CONFLICT, '이미 가입된 사용자입니다.');

    // 이메일 존재 여부 확인
    const isEmailValid = await verifyEmailWithHunter(email);
    if (!isEmailValid) {
      throw new CustomError(HTTP_STATUS.BAD_REQUEST, '존재하지 않는 이메일 주소입니다.');
    }

    // 이메일 인증 링크 발송
    const emailVerificationToken = jwt.sign({ email }, JWT_EMAIL_KEY, { expiresIn: '9h' });
    await sendVerificationEmail(email, emailVerificationToken);

    // 비밀번호 해시화
    const hashedPassword = bcrypt.hashSync(password, SALT_ROUNDS);

    // user 데이터 생성과 email 인증 토큰 생성을 transaction으로 처리
    const newUser = await prisma.$transaction(
      async (txn) => {
        // user 데이터 생성
        const newUser = await txn.user.create({
          data: {
            email,
            password: hashedPassword,
            username,
            profileImage: profileImage || null,
            introduction: introduction || null,
          },
        });

        // 이메일 인증 코드 토큰 생성
        await txn.emailCode.upsert({
          where: { userId: newUser.userId },
          update: {
            emailCode: emailVerificationToken,
            expiredAt: new Date(Date.now() + 9 * 60 * 60 * 1000),
          },
          create: {
            userId: newUser.userId,
            emailCode: emailVerificationToken,
            expiredAt: new Date(Date.now() + 9 * 60 * 60 * 1000),
          },
        });
        return newUser;
      },
      //격리 수준 설정
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    // 반환 정보
    res.status(HTTP_STATUS.CREATED).json({
      status: HTTP_STATUS.CREATED,
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

// 로그인 api
authRouter.post('/sign-in', signInValidator, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    // 입력한 이메일 계정이 존재하는지 확인
    if (!user) throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '존재하지 않는 계정입니다.');

    // 입력한 비밀번호가 DB의 비밀번호와 일치하는지 확인
    if (!bcrypt.compareSync(password, user.password)) {
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
      status: HTTP_STATUS.OK,
      message: '로그인에 성공했습니다.',
      data: { accessToken, refreshToken },
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 프론트엔드에서 Access Token으로 userId 가져오는 api
authRouter.get('/get-userId', requireAccessToken, async (req, res, next) => {
  try {
    const userId = req.user.userId;
    return res.status(200).json({ data: { userId: userId } });
  } catch (error) {
    next(error);
  }
});

// 토큰 재발급 api
authRouter.post('/renew-tokens', requireRefreshToken, async (req, res, next) => {
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
      status: HTTP_STATUS.OK,
      message: '재발급에 성공했습니다.',
      data: { accessToken, refreshToken },
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 로그아웃 API
authRouter.post('/sign-out', requireRefreshToken, async (req, res, next) => {
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

// 이메일 인증 완료 API
authRouter.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    const decoded = jwt.verify(token, JWT_EMAIL_KEY);
    const user = await prisma.user.findUnique({ where: { email: decoded.email } });

    // 사용자가 존재하지 않는 경우
    if (!user) throw new CustomError(HTTP_STATUS.NOT_FOUND, '사용자를 찾을 수 없습니다.');

    // 이미 이메일 인증을 완료한 경우
    if (user.emailVerified) {
      return res.redirect('/reverified.html');
    }
    // 이메일 인증 완료
    await prisma.$transaction(
      async (txn) => {
        // user DB에 이메일 인증되었음을 업데이트
        const verifiedUser = await txn.user.update({
          where: { email: decoded.email },
          data: { emailVerified: true },
        });
        // email_verification_codes DB에서 데이터 삭제
        await txn.emailCode.delete({
          where: { userId: verifiedUser.userId },
        });
      },
      //격리 수준 설정
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
    );

    // 반환 정보
    return res.redirect('/verified.html');

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 인증 이메일 재발급 api
authRouter.post('/send-verification-email', requireAccessToken, async (req, res, next) => {
  try {
    // 현재 로그인된 사용자의 정보를 데이터베이스에서 조회
    const user = await prisma.user.findUnique({ where: { userId: req.user.userId } });

    // 사용자가 존재하지 않는 경우
    if (!user) throw new CustomError(HTTP_STATUS.NOT_FOUND, '사용자를 찾을 수 없습니다.');

    // 이미 이메일 인증을 완료한 경우
    if (user.emailVerified) throw new CustomError(HTTP_STATUS.BAD_REQUEST, '이미 이메일 인증이 완료되었습니다.');

    // 이메일 인증 링크 발송
    const emailVerificationToken = jwt.sign({ email: user.email }, JWT_EMAIL_KEY, { expiresIn: '9h' });
    await sendVerificationEmail(user.email, emailVerificationToken);

    // 데이터베이스에 이메일 인증 토큰 업데이트
    await prisma.emailCode.upsert({
      where: { userId: user.userId },
      update: {
        emailCode: emailVerificationToken,
        expiredAt: new Date(Date.now() + 9 * 60 * 60 * 1000),
      },
      create: {
        userId: user.userId,
        emailCode: emailVerificationToken,
        expiredAt: new Date(Date.now() + 9 * 60 * 60 * 1000),
      },
    });

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
  async (req, res, next) => {
    // 로그인에 성공했을 경우 반환 정보
    console.log(req.user);
    res.redirect('/');
  },
);

// 네이버 로그인 api
authRouter.get('/naver', passport.authenticate('naver')); // 네이버 로그인 페이지로 이동
authRouter.get(
  '/naver/callback',
  passport.authenticate('naver', {
    failureRedirect: '/?error=로그인실패', // 로그인에 실패했을 경우 해당 라우터로 이동한다
  }),
  async (req, res, next) => {
    // 로그인에 성공했을 경우 반환 정보
    console.log(req.user);
    res.redirect('/');
  },
);

// 소셜 로그인 인증 api
// authRouter.get('/social-login', (req, res, next) => {
//   if (!req.isAuthenticated()) {
//     return res.redirect('/');
//   }
//   res.json(req.user);
// });

export { authRouter };
