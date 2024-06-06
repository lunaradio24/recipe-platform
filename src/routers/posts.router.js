import express from 'express';
import { HTTP_STATUS } from '../constants/http-status.constant.js';
import { prisma } from '../utils/prisma.util.js';
import { requireAccessToken } from '../middlewares/require-access-token.middleware.js';
import { addPostValidator } from '../middlewares/validators/add-post-validator.middleware.js';
import { editPostValidator } from '../middlewares/validators/edit-post-validator.middleware.js';
import CustomError from '../utils/custom-error.util.js';
import { blockRoles } from '../middlewares/block-roles.middleware.js';
import { postUploadImage } from '../utils/multer.util.js';

const postRouter = express.Router();

// 게시글 작성 API
postRouter.post(
  '/',
  requireAccessToken,
  blockRoles(['BLACKLIST']),
  postUploadImage.single('recipeImage'),
  addPostValidator,
  async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { title, content } = req.body;
      const imageUrl = req.file ? req.file.location : undefined;

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
  },
);

// 게시글 목록 조회 API
postRouter.get('/', async (req, res, next) => {
  try {
    // 내림차순
    let { sortBy, sortOption } = req.query;
    sortBy = sortBy?.toLowerCase();
    sortOption = sortOption?.toLowerCase();

    if (sortOption !== 'desc' && sortOption !== 'asc') {
      sortOption = 'desc';
    }

    let sort = {};
    if (sortBy === 'time') sort[createdAt] = sortOption;
    if (sortBy === 'likes') sort[likeCount] = sortOption;

    // 게시글 목록 조회
    let data = await prisma.post.findMany({
      orderBy: sort,
      include: {
        author: true,
      },
    });

    // 평탄화
    data = data.map((post) => {
      return {
        postId: post.postId,
        authorId: post.author.authorId,
        authorName: post.author.username,
        authorProfileImage: post.author.profileImage,
        title: post.title,
        content: post.content,
        imageUrl: post.imageUrl,
        likeCount: post.likeCount,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: '목록조회를 성공했습니다.',
      data,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 게시글 상세 조회 API
postRouter.get('/:postId', async (req, res, next) => {
  try {
    const { postId } = req.params;

    let data = await prisma.post.findUnique({
      where: { postId: +postId },
      include: { author: true, comment: true },
    });

    if (!data) {
      throw new CustomError(HTTP_STATUS.NOT_FOUND, '존재하지 않는 게시글입니다.');
    }

    // 평탄화
    const responseData = {
      postId: data.postId,
      authorId: data.author.userId,
      authorName: data.author.username,
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      likeCount: data.likeCount,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      comment: data.comment,
    };

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: '게시글 상세 조회가 완료되었습니다.',
      data: responseData,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

// 게시글 수정 API
postRouter.patch(
  '/:postId',
  requireAccessToken,
  blockRoles(['BLACKLIST']),
  postUploadImage.single('recipeImage'),
  editPostValidator,
  async (req, res, next) => {
    try {
      const { userId } = req.user;
      const { postId } = req.params;
      const { title, content } = req.body;
      const imageUrl = req.file ? req.file.location : undefined;

      const existedPost = await prisma.post.findFirst({
        where: { authorId: userId, postId: +postId },
      });

      if (!existedPost) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          status: HTTP_STATUS.NOT_FOUND,
          message: '게시글을 찾지 못했습니다.',
          data,
        });
      }

      // 게시글 수정
      const data = await prisma.post.update({
        where: {
          postId: +postId, // 수정이니까 작성자가 맞는지 post의 id가 데이터 테이블 속 id랑 맞는지 확인
          authorId: userId, // 수정이니까 작성자가 맞는지 작성자의 id가 데이터 테이블 속 id랑 맞는지 확인
        },
        data: {
          title: title,
          content: content,
          imageUrl: imageUrl,
        },
      });

      // 반환 정보
      return res.status(HTTP_STATUS.OK).json({
        status: HTTP_STATUS.OK,
        message: '게시글 수정이 완료되었습니다.',
        data,
      });

      // 에러 처리
    } catch (error) {
      next(error);
    }
  },
);

// 게시글 삭제 API
postRouter.delete('/:postId', requireAccessToken, blockRoles(['BLACKLIST']), async (req, res, next) => {
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

    // 게시글 삭제
    const data = await prisma.post.delete({
      where: {
        postId: +postId,
        authorId: authorId,
      },
    });

    // 반환 정보
    return res.status(HTTP_STATUS.OK).json({
      status: HTTP_STATUS.OK,
      message: '게시글 삭제가 완료되었습니다.',
      data,
    });

    // 에러 처리
  } catch (error) {
    next(error);
  }
});

export { postRouter };
