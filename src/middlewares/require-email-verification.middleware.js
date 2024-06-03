// middlewares/require-email-verification.middleware.js
import { prisma } from '../utils/prisma.util.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';

export const requireEmailVerification = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: req.user.userId },
    });

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({ message: '사용자를 찾을 수 없습니다.' });
    }

    if (!user.emailVerified) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({ message: '이메일 인증이 필요합니다.' });
    }

    next();
  } catch (error) {
    next(error);
  }
};