import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { Prisma } from '@prisma/client';

const followRouter = express.Router();

// 팔로우 api
followRouter.post('/:userId/follow', async (req, res, next) => {
  try {
    // const followerId = req.user;
    //테스트용 팔로워 아이디
    const followerId = 3;
    const { userId } = req.params;

    //followId랑 userId가 같으면 에러 띄우기
    if (followerId === +userId) {
      return res
        .status(HTTP_STATUS.BAD_REQUEST)
        .json({ status: HTTP_STATUS.BAD_REQUEST, message: '자기자신을 팔로우할 수 없습니다.' });
    }

    const user = await prisma.user.findUnique({ where: { userId: +userId } });
    if (!user) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ status: HTTP_STATUS.NOT_FOUND, message: '존재하지 않는 사용자입니다.' });
    }

    const savedFollow = await prisma.follow.findFirst({ where: { userId: +userId, followerId } });

    //해당하는 팔로우 데이터가 없을 때
    if (!savedFollow) {
      await prisma.$transaction(
        async (txn) => {
          await txn.follow.create({
            data: {
              userId: +userId,
              followerId,
            },
          });
          await txn.user.update({
            where: { userId: +userId },
            data: { followerCount: user.followerCount + 1 },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );
      return res
        .status(HTTP_STATUS.OK)
        .json({ status: HTTP_STATUS.OK, message: `${user.username}을/를 팔로우 했습니다.` });
    } else if (savedFollow) {
      //해당하는 팔로우 데이터가 있을 때
      await prisma.$transaction(
        async (txn) => {
          await txn.follow.delete({ where: { followId: savedFollow.followId } });
          await txn.user.update({
            where: { userId: +userId },
            data: { followerCount: user.followerCount - 1 },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );
      return res
        .status(HTTP_STATUS.OK)
        .json({ status: HTTP_STATUS.OK, message: `${user.username}을/를 언팔로우 했습니다.` });
    }
  } catch (error) {
    next(error);
  }
});

//팔로워 조회 api
followRouter.get('/:userId/follow', async (req, res, next) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findFirst({ where: { userId: +userId } });
    if (!user) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ status: HTTP_STATUS.NOT_FOUND, message: '존재하지 않는 사용자입니다.' });
    }

    let followers = await prisma.follow.findMany({
      where: { userId: +userId },
      include: { follower: true },
    });

    followers = followers.map((follower) => {
      return {
        followerName: follower.follower.username,
        followerProfileImage: follower.follower.profileImage,
        followerIntroduction: follower.follower.introduction,
      };
    });

    return res.status(HTTP_STATUS.OK).json({ status: HTTP_STATUS.OK, message: `${user.username}의 팔로워`, followers });
  } catch (error) {
    next(error);
  }
});

export { followRouter };
