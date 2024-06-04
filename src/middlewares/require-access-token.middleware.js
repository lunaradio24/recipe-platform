import jwt from 'jsonwebtoken';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { JWT_ACCESS_KEY } from '../constants/auth.constant.js';
import { prisma } from '../utils/prisma.util.js';
import CustomError from '../utils/custom-error.util.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '인증정보가 없습니다');

    const [type, accessToken] = authorization.split(' ');
    if (type !== 'Bearer') throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '지원하지 않는 인증 방식입니다.');
    if (!accessToken) throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '인증정보가 없습니다.');

    const payload = jwt.verify(accessToken, JWT_ACCESS_KEY);

    const user = await prisma.user.findUnique({
      where: { userId: payload.userId },
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
