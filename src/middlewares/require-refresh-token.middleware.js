import jwt from 'jsonwebtoken';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { prisma } from '../utils/prisma.util.js';
import bcrypt from 'bcrypt';

import {JWT_REFRESH_KEY} from '../constants/auth.constant.js';


export const authenticateRefreshToken = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    //인증정보가 없을시
    if (!authorization) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: '인증정보가 없습니다',
      });
    }

    const [type, refreshToken] = authorization.split(' ');

    if (type !== 'Bearer' || !refreshToken) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        message: '인증정보가 없습니다',
      });
    }

    let payload;

    try {
      payload = jwt.verify(refreshToken, JWT_REFRESH_KEY);
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

    
    //db에서 리프레시토큰 조회
    const existedRefreshToken = await prisma.refreshToken.findUnique({
      where: {
        userId: userId,
      },
    });
  
    //넘겨 받은 리프레시 토큰과 비교
    const isValidRefreshToken =
    existedRefreshToken?.token && await bcrypt.compare(refreshToken, existedRefreshToken.token);
    
    

      if (!isValidRefreshToken) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          message: '폐기 된 인증입니다',
        });
      }

      
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