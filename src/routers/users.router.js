import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';

const userRouter = express.Router();

// 프로필 조회 API
userRouter.get('/:email', async (req, res, next) => {
  try {
    const { email } = req.params;

    //유저 이메일로 이름, 이메일, 프로필이미지, 팔로우 숫자, 소개글 가져오기
    const user = await prisma.user.findFirst({
      where: { email: email },
    });

    // 해당 이메일을 가진 유저가 있는지 확인하기
    if (!user) {
      throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 사용자입니다.');
    }

    //프로필 가져오기
    const userProfile = {
      email: user.email,
      username: user.username,
      profileImage: user.profileImage,
      introduction: user.introduction,
      followerCount: user.followerCount, //or 'followers.length'
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: `${email}의 프로필.`,
      userProfile,
    });

    //에러 처리 try,catch
  } catch (error) {
    next(error);
  }
});

// 프로필 수정 API
userRouter.patch('/:email', async (req, res, next) => {
  const { email } = req.params;
  const { username, profileImage, introduction } = req.body;
  try {
    const { userId } = req.user;

    const user = await prisma.user.findFirst({
      where: { email: email },
    });

    if (!user) {
      throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 사용자입니다.');
    }

    if (userId !== user.userId) {
      throw new CustomError(HTTP_STATUS.FORBIDDEN, '프로필 수정 권한이 없습니다.');
    }

    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: {
        username: username || user.username,
        profileImage: profileImage || user.profileImage,
        introduction: introduction || user.introduction,
      },
    });

    return res
      .status(HTTP_STATUS.CREATED)
      .json({ status: HTTP_STATUS.CREATED, message: '프로필을 수정했습니다', updatedUser });
  } catch (error) {
    next(error);
  }
});
export { userRouter };
