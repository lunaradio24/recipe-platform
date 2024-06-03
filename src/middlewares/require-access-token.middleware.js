import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { prisma } from '../utils/prisma.util.js';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;

export const authenticateToken = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: '인증정보가 없습니다',
      });
    }

    const [type, accessToken] = authorization.split(' ');

    if (type !== 'Bearer') {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: '인증정보가 없습니다',
      });
    }
    if (!accessToken) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: '인증 정보가 없습니다',
      });
    }

    let payload;

    try {
      payload = jwt.verify(accessToken, jwtSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: '인증 정보가 만료되었습니다',
        });
      } else {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: '인증 정보가 유효하지 않습니다',
        });
      }
    }

    const { userId } = payload;
    const user = await prisma.user.findUnique({
      where: { userId: userId },
      omit: { password: true },
    });

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: '인증 정보와 일치하는 사용자가 없습니다',
      });
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};