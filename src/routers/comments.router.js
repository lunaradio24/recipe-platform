import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import { commentValidator } from '../middlewares/validators/comment-validator.middleware.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { authenticateToken } from '../middlewares/require-access-token.middleware.js';
import CustomError from '../utils/custom-error.util.js';

const commentRouter = express.Router();

//댓글 작성 api
commentRouter.post('/:postId/comments', authenticateToken, commentValidator, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { postId } = req.params;
    const { content } = req.body;

    const post = await prisma.post.findFirst({ where: { postId: +postId } });

    if (!post) {
      throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 게시글입니다.');
    }

    const comment = await prisma.comment.create({
      data: {
        commenterId: userId,
        postId: +postId,
        content,
      },
    });

    return res
      .status(HTTP_STATUS.CREATED)
      .json({ status: HTTP_STATUS.CREATED, message: '댓글을 등록했습니다.', comment });
  } catch (error) {
    next(error);
  }
});

//댓글 조회 api
commentRouter.get('/:postId/comments', async (req, res, next) => {
  try {
    const { postId } = req.params;

    const post = await prisma.post.findFirst({ where: { postId: +postId } });
    if (!post) {
      throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 게시글입니다.');
    }

    let comments = await prisma.comment.findMany({
      where: { postId: +postId },
      include: {
        user: true,
      },
    });

    comments = comments.map((comment) => {
      return {
        postId: comment.postId,
        commentId: comment.commentId,
        username: comment.user.username,
        profileImage: comment.user.profileImage,
        content: comment.content,
        likeCount: comment.likeCount,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      };
    });

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: `${postId}번 게시글 댓글.`,
      comments,
    });
  } catch (error) {
    next(error);
  }
});

//댓글 수정 api
commentRouter.patch('/:postId/comments/:commentId', authenticateToken, commentValidator, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { commentId } = req.params;
    const { content } = req.body;

    const comment = await prisma.comment.findFirst({
      where: { commentId: +commentId },
    });

    if (!comment) {
      throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 댓글입니다.');
    }

    if (userId !== comment.commenterId) {
      throw new CustomError(HTTP_STATUS.FORBIDDEN, '수정 권한이 없는 댓글입니다.');
    }

    const updatedComment = await prisma.comment.update({
      where: { commenterId: userId, commentId: +commentId },
      data: { content },
    });

    return res
      .status(HTTP_STATUS.CREATED)
      .json({ status: HTTP_STATUS.CREATED, message: '댓글을 수정했습니다.', updatedComment });
  } catch (error) {
    next(error);
  }
});

//댓글 삭제 api
commentRouter.delete('/:postId/comments/:commentId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
      where: { commentId: +commentId },
    });

    if (!comment) {
      throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 댓글입니다.');
    }

    if (userId !== comment.commenterId) {
      throw new CustomError(HTTP_STATUS.FORBIDDEN, '삭제 권한이 없는 댓글입니다.');
    }

    await prisma.comment.delete({
      where: { commenterId: userId, commentId: +commentId },
    });

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: `${commentId}번 댓글을 삭제했습니다.`,
    });
  } catch (error) {
    next(error);
  }
});

export { commentRouter };
