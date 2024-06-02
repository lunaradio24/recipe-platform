import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';

const likeRouter = express.Router();

// 특정 게시글 좋아요 클릭 및 취소 API <<< TODO: AccessToken 인증 미들웨어 거쳐야함
likeRouter.put('/:postId/likes', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { postId } = req.params;

    // 해당 게시글의 작성자 id 가져오기
    const { userId: authorId } = await prisma.post.findUnique({
      where: {
        postId: +postId,
      },
    });

    // 본인이 작성한 게시글인지 확인
    if (userId === authorId) {
      throw new Error('본인이 작성한 게시글에는 좋아요를 누를 수 없습니다.');
    }

    // likes 테이블에서 해당 유저가 해당 게시글에 남긴 좋아요를 검색
    const like = await prisma.like.findUnique({
      where: {
        userId: userId,
        postId: +postId,
        commentId: null,
      },
    });

    // 없으면 좋아요 생성
    if (!like) {
      await prisma.like.create({
        data: {
          userId: userId,
          postId: +postId,
        },
      });
    }

    // 있으면 좋아요 삭제
    if (like) {
      await prisma.like.delete({
        where: {
          userId: userId,
          postId: +postId,
        },
      });
    }

    // 반환 정보
    return res.status(HTTP_STATUS.CREATED).json({
      status: HTTP_STATUS.CREATED,
      message: `게시글에 좋아요를 ${like ? '눌렀' : '취소했'}습니다`,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 전체 게시글 좋아요 조회 API
likeRouter.get('/likes', async (req, res, next) => {
  try {
    // likes 테이블에서 모든 posts의 좋아요 검색
    const likes = await prisma.like.findMany({
      where: {
        commentId: null,
      },
    });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: '전체 게시글의 좋아요 정보를 성공적으로 불러왔습니다.',
      data: likes,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 특정 게시글 좋아요 조회 API
likeRouter.get('/:postId/likes', async (req, res, next) => {
  try {
    const { postId } = req.params;

    // likes 테이블에서 특정 posts의 좋아요 검색
    const likes = await prisma.like.findMany({
      where: {
        postId: +postId,
        commentId: null,
      },
    });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: '해당 게시글의 좋아요 정보를 성공적으로 불러왔습니다.',
      data: likes,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 댓글 좋아요 클릭 및 취소 API <<< TODO: AccessToken 인증 미들웨어 거쳐야함
likeRouter.put('/:postId/comments/:commentId/likes', async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { postId, commentId } = req.params;

    // 해당 댓글의 작성자 id 가져오기
    const { userId: commenterId } = await prisma.comment.findUnique({
      where: {
        commentId: +commentId,
      },
    });

    // 본인이 작성한 댓글인지 확인
    if (userId === commenterId) {
      throw new Error('본인이 작성한 댓글에는 좋아요를 누를 수 없습니다.');
    }

    // likes 테이블에서 해당 유저가 해당 댓글에 남긴 좋아요를 검색
    const like = await prisma.like.findUnique({
      where: {
        userId: userId,
        postId: +postId,
        commentId: +commentId,
      },
    });

    // 없으면 좋아요 생성
    if (!like) {
      await prisma.like.create({
        data: {
          userId: userId,
          postId: +postId,
          commentId: +commentId,
        },
      });
    }

    // 있으면 좋아요 삭제
    if (like) {
      await prisma.like.delete({
        where: {
          userId: userId,
          postId: +postId,
          commentId: +commentId,
        },
      });
    }

    // 반환 정보
    return res.status(HTTP_STATUS.CREATED).json({
      status: HTTP_STATUS.CREATED,
      message: `댓글에 좋아요를 ${like ? '눌렀' : '취소했'}습니다`,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 특정 게시글의 모든 댓글 좋아요 조회 API
likeRouter.get('/:postId/comments/likes', async (req, res, next) => {
  try {
    const { postId } = req.params;

    // likes 테이블에서 해당 posts의 모든 댓글의 좋아요 검색
    const likes = await prisma.like.findMany({
      where: {
        postId: +postId,
        commentId: {
          not: null,
        },
      },
    });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: '해당 게시글의 모든 댓글 좋아요 정보를 성공적으로 불러왔습니다.',
      data: likes,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

export { likeRouter };
