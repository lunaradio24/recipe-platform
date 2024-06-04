import jwt from 'jsonwebtoken';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { JWT_REFRESH_KEY } from '../constants/auth.constant.js';
import { prisma } from '../utils/prisma.util.js';
import bcrypt from 'bcrypt';
import CustomError from '../utils/custom-error.util.js';

export const authenticateRefreshToken = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '인증정보가 없습니다.');

    const [type, refreshToken] = authorization.split(' ');
    if (type !== 'Bearer' || !refreshToken) {
      throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '지원하지 않는 인증 방식입니다.');
    }

    const { userId } = jwt.verify(refreshToken, JWT_REFRESH_KEY);

    // DB에서 리프레시토큰 조회
    const existedRefreshToken = await prisma.refreshToken.findUnique({
      where: { userId: userId },
    });

    // 넘겨 받은 리프레시 토큰과 비교
    const isValidRefreshToken =
      existedRefreshToken?.token && (await bcrypt.compare(refreshToken, existedRefreshToken.token));

    if (!isValidRefreshToken) throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '폐기된 인증 정보입니다.');

    const user = await prisma.user.findUnique({
      where: { userId: userId },
      omit: { password: true },
    });

    if (!user) throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '인증 정보와 일치하는 사용자가 없습니다');

    req.user = user;
    next();

    // 에러 처리
  } catch (error) {
    next(error);
  }
};
