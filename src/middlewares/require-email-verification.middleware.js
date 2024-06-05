import { prisma } from '../utils/prisma.util.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import CustomError from '../utils/custom-error.util.js';

export const requireEmailVerification = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const user = await prisma.user.findUnique({ where: { userId } });

    if (!user) throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '사용자를 찾을 수 없습니다.');
    if (!user.emailVerified) throw new CustomError(HTTP_STATUS.UNAUTHORIZED, '이메일 인증이 필요합니다.');

    next();

    // 에러 처리
  } catch (error) {
    next(error);
  }
};
