import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import { Prisma } from '@prisma/client';
import { HTTP_STATUS } from '../constants/http-status.constant.js';

const userRouter = express.Router();

// 1. 요청 파라미터와 바디에서 email과 username을 전달받습니다.
userRouter.get('/users', async (req, res, next) => {
  try {
    const { userId } = req.user;

    // 고유한 이메일로 유저 가저오기
    // const user = await prisma.user.findUnique({
    //     where: { email: +email },
    //   });

    //유저 이메일로 이름, 이메일, 프로필이미지, 팔로우 숫자, 소개글 가져오기
    const user = await prisma.user.findUnique({
      where: { email: +email },
      include: {
        followers: true,
      },
    });

    // 해당 이메일을 가진 유저가 있는지 확인하기
    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: HTTP_STATUS.NOT_FOUND,
        message: '존재하지 않는 회원입니다.',
      });
    } else {
      users = users.map((user) => {
        return {
          //프로필 가져오기
          email: user.email,
          username: user.username,
          profileImage: user.profileImage,
          introduction: user.introduction,
          followCount: user.followCount,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
        };
      });
    }
    //에러 처리 try,catch
  } catch (error) {
    next(error);
  }
});

userRouter.patch('/users', async (req, res, next) => {});
export { userRouter };
