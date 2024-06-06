import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import CustomError from '../utils/custom-error.util.js';
import { userProfileValidator } from '../middlewares/validators/user-profile-validator.middleware.js';
import { requireAccessToken } from '../middlewares/require-access-token.middleware.js';
import { profileUploadImage } from '../utils/multer.util.js';

const userRouter = express.Router();

// 프로필 조회 API
userRouter.get('/mypage', requireAccessToken, async (req, res, next) => {
  try {
    const { userId } = req.user;

    // 유저 아이디로 닉네임, 프로필 이미지, 팔로우 숫자, 소개글 가져오기
    const user = await prisma.user.findFirst({
      where: { userId: userId },
      select: {
        username: true,
        email: true,
        profileImage: true,
        introduction: true,
        followerCount: true,
      },
    });

    // 해당 데이터가 있는지 확인
    if (!user) throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 사용자입니다.');

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: `${user.username}의 프로필.`,
      user,
    });
  } catch (error) {
    next(error);
  }
});

// 프로필 수정 API
userRouter.patch(
  '/mypage',
  requireAccessToken,
  profileUploadImage.single('image'),
  userProfileValidator,
  async (req, res, next) => {
    try {
      const { userId } = req.user;
      const updatedData = req.body;
      const imageUrl = req.file ? req.file.location : null;

      // 존재하는 사용자인지 확인
      const user = await prisma.user.findFirst({ where: { userId: userId } });
      if (!user) throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 사용자입니다.');

      // 사용자 정보 수정
      const updatedUser = await prisma.user.update({
        where: { userId: userId },
        data: {
          ...updatedData,
          profileImage: imageUrl,
        },
      });

      // 반환 정보
      return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: '프로필을 수정했습니다',
        data: {
          ...updatedUser,
          profileImage: imageUrl,
        },
      });

      // 에러 처리
    } catch (error) {
      next(error);
    }
  },
);
export { userRouter };
