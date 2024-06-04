import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import CustomError from '../utils/custom-error.util.js';
import { userProfileValidator } from '../middlewares/validators/user-profile-validator.middleware.js';
import { authenticateToken } from '../middlewares/require-access-token.middleware.js';

const userRouter = express.Router();

// 프로필 조회 API
userRouter.get('/:email', async (req, res, next) => {
  try {
    const { email } = req.params;

    //유저 이메일로 닉네임, 프로필이미지, 팔로우 숫자, 소개글 가져오기
    const user = await prisma.user.findFirst({
      where: { email: email },
      select: {
        username: true,
        profileImage: true,
        introduction: true,
        followerCount: true,
      },
    });

    // 해당 이메일을 가진 유저가 있는지 확인
    if (!user) throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 사용자입니다.');

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: `${email}의 프로필.`,
      user,
    });

    //에러 처리 try,catch
  } catch (error) {
    next(error);
  }
});

// 프로필 수정 API
userRouter.patch('/:email', authenticateToken, userProfileValidator, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { email } = req.params;
    const updatedData = req.body;

    // 존재하는 사용자인지 확인
    const user = await prisma.user.findFirst({ where: { email: email } });
    if (!user) throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 사용자입니다.');

    // 사용자 본인의 프로필을 수정하는지 확인
    if (userId !== user.userId) throw new CustomError(HTTP_STATUS.FORBIDDEN, '프로필 수정 권한이 없습니다.');

    // 사용자 정보 수정
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: updatedData,
    });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: '프로필을 수정했습니다',
      data: updatedData,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});
export { userRouter };
