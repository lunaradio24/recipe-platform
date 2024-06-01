import express from 'express';
import { prisma } from '../utils/prisma.util.js';
import { commentValidator } from '../middlewares/validators/comment-validator.middleware.js';
import { HTTP_STATUS } from '../constants/http-status.constant.js';

const commentRouter = express.Router();

//댓글 작성 api
commentRouter.post('/:postId/comments', commentValidator, async (req, res, next) => {
  try {
    // const { userId } = req.user;
    const userId = 1;
    const { postId } = req.params;
    const { content } = req.body;

    const post = await prisma.post.findFirst({ where: { postId: +postId } });

    if (!post) {
      return res
        .status(HTTP_STATUS.NOT_FOUND)
        .json({ status: HTTP_STATUS.NOT_FOUND, message: '존재하지 않는 게시글입니다.' });
    }

    const comment = await prisma.comment.create({
      data: {
        postId: +postId,
        userId,
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

export { commentRouter };
