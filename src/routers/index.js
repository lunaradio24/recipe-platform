import express from "express";
import { authRouter } from "./auth.router.js";
import { userRouter } from "./users.router.js";
import { postRouter } from "./posts.router.js";
import { commentRouter } from "./comments.router.js";

const apiRouter = express.Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/users", userRouter);
apiRouter.use("/posts", postRouter);
apiRouter.use("/posts/:postId/comments", commentRouter);

export { apiRouter };
