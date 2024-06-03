import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { Prisma } from '@prisma/client';
import { authenticateToken } from '../middlewares/require-access-token.middleware.js';
import CustomError from '../utils/custom-error.util.js';

const followRouter = express.Router();

//팔로우 api
followRouter.post('/:userId/follow', authenticateToken, async (req, res, next) => {
  try {
    const followerUserId = req.user.userId;
    const { userId } = req.params;

    // 팔로우 할 user가 자신(follower)과 같은지 확인
    if (followerId === +userId) {
      throw new CustomError(HTTP_STATUS.BAD_REQUEST, '자기 자신을 팔로우할 수 없습니다.');
    }

    // 팔로우 할 user를 DB에서 조회
    const user = await prisma.user.findUnique({ where: { userId: +userId } });
    // 팔로우 할 user가 DB에 없는 경우
    if (!user) {
      throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 사용자입니다.');
    }

    // follows 테이블에서 자신(follower_user)이 팔로우한 기록이 있는지 확인
    const savedFollow = await prisma.follow.findFirst({
      where: {
        followingUserId: +userId,
        followerUserId: followerUserId,
      },
    });

    // 팔로우 한 기록이 없으면
    if (!savedFollow) {
      await prisma.$transaction(
        async (txn) => {
          // follows 테이블에 팔로우 데이터 생성
          await txn.follow.create({
            data: {
              followingUserId: +userId,
              followerUserId: followerUserId,
            },
          });
          // following user의 팔로우 수 +1
          await txn.user.update({
            where: { userId: +userId },
            data: { followerCount: user.followerCount + 1 },
          });
        },
        // 격리 수준 설정
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
      // 반환 정보
      return res
        .status(HTTP_STATUS.OK)
        .json({ status: HTTP_STATUS.OK, message: `${user.username}을/를 팔로우 했습니다.` });
    }
    // 이미 팔로우 중이면
    else {
      await prisma.$transaction(
        async (txn) => {
          // follows 테이블에서 팔로우 데이터 삭제
          await txn.follow.delete({ where: { followId: savedFollow.followId } });
          // following user의 팔로우 수 -1
          await txn.user.update({
            where: { userId: +userId },
            data: { followerCount: user.followerCount - 1 },
          });
        },
        // 격리 수준 설정
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
      // 반환 정보
      return res
        .status(HTTP_STATUS.OK)
        .json({ status: HTTP_STATUS.OK, message: `${user.username}을/를 언팔로우 했습니다.` });
    }
    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 팔로워 조회 api
followRouter.get('/:userId/follow', async (req, res, next) => {
  try {
    const { userId } = req.params;
    // 팔로워 정보를 볼 user가 DB에 있는지 확인
    const user = await prisma.user.findFirst({ where: { userId: +userId } });
    if (!user) {
      throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 사용자입니다.');
    }

    // 해당 user를 팔로우하는 사용자들을 조회
    const follows = await prisma.follow.findMany({
      where: { followingUserId: +userId },
      include: { followerUser: true },
    });

    // 평탄화
    const followers = follows.map((follow) => {
      return {
        followerName: follow.followerUser.username,
        followerProfileImage: follow.followerUser.profileImage,
        followerIntroduction: follow.followerUser.introduction,
      };
    });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: `${user.username}의 팔로워`,
      followers,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 팔로잉 조회 api
followRouter.get('/:userId/follow', async (req, res, next) => {
  try {
    const { userId } = req.params;
    // 팔로잉 정보를 볼 user가 DB에 있는지 조회
    const user = await prisma.user.findFirst({ where: { userId: +userId } });
    if (!user) {
      throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 사용자입니다.');
    }

    // 해당 user가 팔로잉하는 사용자들을 조회
    const follows = await prisma.follow.findMany({
      where: { followerUserId: +userId },
      include: { followingUser: true },
    });

    // 평탄화
    const followings = follows.map((follow) => {
      return {
        followerName: follow.followingUser.username,
        followerProfileImage: follow.followingUser.profileImage,
        followerIntroduction: follow.followingUser.introduction,
      };
    });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: `${user.username}의 팔로워`,
      followings,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

export { followRouter };
