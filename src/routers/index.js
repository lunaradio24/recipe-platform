import express from 'express';
import { authRouter } from './auth.router.js';
import { userRouter } from './users.router.js';
import { postRouter } from './posts.router.js';
import { commentRouter } from './comments.router.js';
import { likeRouter } from './likes.router.js';
import { followRouter } from './follow.router.js';
import { kakaoStrategy } from '../passport/kakao-strategy.passport.js';

const apiRouter = express.Router();

apiRouter.use('/users', [userRouter, followRouter]);
apiRouter.use('/posts', [postRouter, commentRouter, likeRouter]);
kakaoStrategy(); // kakao-strategy 미들웨어 실행
apiRouter.use('/auth', authRouter);

export { apiRouter };
