import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();
const jwtRefresh = process.env.JWT_REFRESH;

export const authenticateRefreshToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: '인증 정보가 없습니다.' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '지원하지 않는 인증 방식입니다.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: '지원하지 않는 인증 방식입니다.' });
  }

  try {
    const decoded = jwt.verify(token, jwtRefresh);

    const user = await prisma.user.findUnique({
      where: { userId: decoded.userId },
    });

    if (!user) {
      return res.status(401).json({ message: '인증 정보와 일치하는 사용자가 없습니다.' });
    }

    const storedToken = await prisma.refreshToken.findFirst({
      where: { userId: user.userId },
    });

    if (!storedToken) {
      return res.status(401).json({ message: '폐기 된 인증 정보입니다.' });
    }

    const isTokenValid = await bcrypt.compare(token, storedToken.token);

    if (!isTokenValid) {
      return res.status(401).json({ message: '폐기 된 인증 정보입니다.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '인증 정보가 만료되었습니다.' });
    }
    return res.status(401).json({ message: '인증 정보가 유효하지 않습니다.' });
  }
};
