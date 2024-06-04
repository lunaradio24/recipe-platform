import express from 'express';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { postValidator } from '../middlewares/validators/post-validator.middleware.js';
import { prisma } from '../utils/prisma.util.js';
import CustomError from '../utils/custom-error.util.js';
import { authenticateToken } from '../middlewares/require-access-token.middleware.js';
import { editpostValidator } from '../middlewares/validators/edit-post-validator.middleware.js';
const postRouter = express.Router();

// 게시글 작성 API
// req.user는 accessToken을 통해서 인증받은 얘들 가져 올 것이다.
postRouter.post('/', postValidator, authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.user;
    console.log(userId);
    const { title, content, imageUrl } = req.body;

    const data = await prisma.post.create({
      data: {
        authorId: userId,
        title,
        content,
        imageUrl,
      },
    });

    return res.status(HTTP_STATUS.CREATED).json({
      status: HTTP_STATUS.CREATED,
      message: '게시글을 작성 했습니다.',
      data,
    });
  } catch (error) {
    next(error);
  }
});

// 게시글 목록 조회 API
// req.user는 accessToken을 통해서 인증받은 얘들 가져 올 것이다.
postRouter.get('/', async (req, res, next) => {
  try {
    // 내림차순
    let { sort } = req.query;

    sort = sort?.toLocaleLowerCase();

    if (sort !== 'desc' && sort !== 'asc') {
      sort = 'desc';
    }

    let data = await prisma.post.findMany({
      //where: { authorId },
      orderBy: {
        createdAt: sort,
      },
      include: {
        // user  User @relation(fields: [authorId], references: [userId], onDelete: Cascade)
        user: true,
      },
    });

    data = data.map((post) => {
      return {
        postId: post.postId,
        userName: post.user.username,
        title: post.title,
        content: post.content,
        imageUrl: post.imageUrl,
        likeCount: post.likeCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    });

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: '목록조회를 성공했습니다.',
      data,
    });

    next();
  } catch (error) {
    next(error);
  }
});

// 게시글 상세 조회 API
// req.user는 accessToken을 통해서 인증받은 얘들 가져 올 것이다.
postRouter.get('/:postId', async (req, res, next) => {
  try {
    const { postId } = req.params;

    console.log(postId);

    let data = await prisma.post.findUnique({
      where: { postId: +postId /**authorId: authorId**/ },
      include: { user: true },
    });

    if (!data) {
      throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 게시글입니다.');
    }

    data = {
      postId: data.postId,
      userName: data.user.username,
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      likeCount: data.likeCount,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: '게시글 상세 조회가 완료되었습니다.',
      data,
    });

    next();
  } catch (error) {
    next(error);
  }
});

// 게시글 수정 API
postRouter.patch('/:postId', editpostValidator, authenticateToken, async (req, res, next) => {
  try {
    const user = req.user;
    const authorId = user.id;
    const { postId } = req.params;

    const { title, content, imageUrl } = req.body;

    const existedPost = await prisma.post.findFirst({
      where: { authorId: authorId, postId: +postId },
    });

    if (!existedPost) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: HTTP_STATUS.NOT_FOUND,
        message: '게시글을 찾지 못했습니다.',
        data,
      });
    }

    const data = await prisma.post.update({
      where: {
        postId: +postId, // 수정이니까 작성자가 맞는지 post의 id가 데이터 테이블 속 id랑 맞는지 확인
        authorId: authorId, // 수정이니까 작성자가 맞는지 작성자의 id가 데이터 테이블 속 id랑 맞는지 확인
      },
      data: {
        title: title,
        content: content,
        imageUrl: imageUrl,
      },
    });

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: '게시글 수정이 완료되었습니다.',
      data,
    });

    next();
  } catch (error) {
    next(error);
  }
});

// 게시글 삭제 API
postRouter.delete('/:postId', authenticateToken, async (req, res, next) => {
  try {
    const user = req.user;
    const authorId = user.id;
    const { postId } = req.params;

    const existedPost = await prisma.post.findFirst({
      where: { authorId: authorId, postId: +postId },
    });

    if (!existedPost) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: HTTP_STATUS.NOT_FOUND,
        message: '게시글을 찾지 못했습니다.',
        data,
      });
    }

    const data = await prisma.post.delete({
      where: {
        postId: +postId,
        authorId: authorId,
      },
    });

    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: '게시글 삭제가 완료되었습니다.',
      data,
    });
  } catch (error) {
    next(error);
  }
});

export { postRouter };
