import express from 'express';
import { authenticateToken } from '../middlewares/require-access-token.middleware.js';
import { prisma } from '../utils/prisma.util.js';
import { Prisma } from '@prisma/client';
import { HTTP_STATUS } from '../constants/http-status.constant.js';

const likeRouter = express.Router();

// 게시글에 좋아요/취소 API
likeRouter.put('/:postId/likes', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { postId } = req.params;

    // 해당 게시글 가져오기
    const post = await prisma.post.findFirst({
      where: { postId: +postId },
    });

    // 해당 게시글이 존재하는지 확인
    if (!post) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: HTTP_STATUS.NOT_FOUND,
        message: '존재하지 않는 게시글입니다.',
      });
    }

    // 본인이 작성한 게시글인지 확인
    if (userId === post.authorId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        status: HTTP_STATUS.FORBIDDEN,
        message: '본인이 작성한 게시글에는 좋아요를 누를 수 없습니다.',
      });
    }

    // post_likes 테이블에서 해당 유저가 해당 게시글에 남긴 좋아요를 검색
    const like = await prisma.postLike.findFirst({
      where: {
        userId: userId,
        postId: +postId,
      },
    });

    // 없으면
    if (!like) {
      await prisma.$transaction(
        async (txn) => {
          // post_likes 테이블에 데이터 생성
          await txn.postLike.create({
            data: {
              userId: userId,
              postId: +postId,
            },
          });
          // posts 테이블의 해당 post의 like_count를 +1
          await txn.post.update({
            where: { postId: +postId },
            data: { likeCount: post.likeCount + 1 },
          });
        },
        //격리 수준 설정
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    }

    // 있으면
    else {
      await prisma.$transaction(
        async (txn) => {
          // post_likes 테이블에서 데이터 삭제
          await txn.postLike.delete({ where: { post_like_id: like.post_like_id } });
          // posts 테이블의 해당 post의 like_count를 -1
          await txn.post.update({
            where: { postId: +postId },
            data: { likeCount: post.likeCount - 1 },
          });
        },
        //격리 수준 설정
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    }

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: `게시글에 좋아요를 ${like ? '눌렀' : '취소했'}습니다`,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 게시글의 좋아요 조회 API
likeRouter.get('/:postId/likes', async (req, res, next) => {
  try {
    const { postId } = req.params;

    // 해당 게시글 가져오기
    const post = await prisma.post.findFirst({ where: { postId: +postId } });

    // 해당 게시글이 존재하는지 확인
    if (!post) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: HTTP_STATUS.NOT_FOUND,
        message: '존재하지 않는 게시글입니다.',
      });
    }

    // likes 테이블에서 특정 posts의 좋아요 검색
    const likes = await prisma.postLike.findMany({
      where: { postId: +postId },
    });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: `${post.postId}번 게시글의 좋아요 정보`,
      data: likes,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 댓글에 좋아요/취소 API
likeRouter.put('/:postId/comments/:commentId/likes', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { commentId } = req.params;

    // 해당 댓글 가져오기
    const comment = await prisma.comment.findFirst({
      where: { commentId: +commentId },
    });

    // 해당 댓글이 존재하는지 확인
    if (!comment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: HTTP_STATUS.NOT_FOUND,
        message: '존재하지 않는 댓글입니다.',
      });
    }

    // 본인이 작성한 댓글인지 확인
    if (userId === comment.commenterId) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        status: HTTP_STATUS.FORBIDDEN,
        message: '본인이 작성한 댓글에는 좋아요를 누를 수 없습니다.',
      });
    }

    // comment_likes 테이블에서 해당 유저가 해당 댓글에 남긴 좋아요를 검색
    const like = await prisma.commentLike.findFirst({
      where: {
        userId: userId,
        commentId: +commentId,
      },
    });

    // 없으면 좋아요
    if (!like) {
      await prisma.$transaction(
        async (txn) => {
          // comment_likes 테이블에 데이터 생성
          await txn.commentLike.create({
            data: {
              userId: userId,
              commentId: +commentId,
            },
          });
          // comments 테이블의 해당 comment의 like_count를 +1
          await txn.comment.update({
            where: { commentId: +commentId },
            data: { likeCount: comment.likeCount + 1 },
          });
        },
        //격리 수준 설정
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
    }

    // 있으면 좋아요 취소
    else {
      await prisma.$transaction(
        async (txn) => {
          // comment_likes 테이블에서 데이터 삭제
          await txn.commentLike.delete({ where: { comment_like_id: like.comment_like_id } });
          // comments 테이블의 해당 comment의 like_count를 -1
          await txn.comment.update({
            where: { commentId: +commentId },
            data: { likeCount: comment.likeCount - 1 },
          });
        },
        //격리 수준 설정
        { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
      );
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

// 댓글의 좋아요 조회 API
likeRouter.get('/:postId/comments/:commentId/likes', async (req, res, next) => {
  try {
    const { commentId } = req.params;

    // 해당 댓글 가져오기
    const comment = await prisma.comment.findFirst({ where: { commentId: +commentId } });

    // 해당 댓글이 존재하는지 확인
    if (!comment) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: HTTP_STATUS.NOT_FOUND,
        message: '해당 댓글이 존재하지 않습니다.',
      });
    }

    // likes 테이블에서 해당 댓글의 좋아요 검색
    const likes = await prisma.commentLike.findMany({ where: { commentId: +commentId } });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: `${comment.commentId}번 댓글의 좋아요 정보`,
      data: likes,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

export { likeRouter };
