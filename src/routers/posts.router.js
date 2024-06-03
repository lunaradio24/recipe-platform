import express from 'express';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { postValidator } from '../middlewares/validators/post-validator.middleware.js';
import { prisma } from '../utils/prisma.util.js';
import CustomError from '../utils/custom-error.util.js';

const postRouter = express.Router();

// 게시글 작성 API
// req.user는 accessToken을 통해서 인증받은 얘들 가져 올 것이다.
postRouter.post('/', postValidator, async (req, res, next) => {
  try {
    // const user = req.user;

    const { title, content, imageUrl } = req.body;

    const authorId = 1; //user.id;

    const data = await prisma.post.create({
      data: {
        authorId: authorId,
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
postRouter.get('/', postValidator, async (req, res, next) => {
  try {
    // const user = req.user;

    //const authorId = 1; //user.id;  // 이거 주석처리 한 이유는

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
postRouter.get('/:postId', postValidator, async (req, res, next) => {
  try {
    // const user = req.user;

    // const authorId = 1; //user.id;

    const { postId } = req.params;

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

export { postRouter };
