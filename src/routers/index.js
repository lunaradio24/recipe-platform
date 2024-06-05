import express from 'express';
import { authRouter } from './auth.router.js';
import { userRouter } from './users.router.js';
import { postRouter } from './posts.router.js';
import { commentRouter } from './comments.router.js';
import { likeRouter } from './likes.router.js';
import { followRouter } from './follow.router.js';

const apiRouter = express.Router();

apiRouter.use('/users', [userRouter, followRouter]);
apiRouter.use('/posts', [postRouter, commentRouter, likeRouter]);
apiRouter.use('/auth', authRouter);

export { apiRouter };
