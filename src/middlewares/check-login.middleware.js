import { HTTP_STATUS } from '../constants/http-status.constant.js';

export const isLoggedIn = (req, res, next) => {
  try {
    // isAuthenticated()로 검사해 로그인이 되어있으면 다음 미들웨어
    if (req.isAuthenticated()) next();
    // 로그인이 안 되어있으면 에러 메시지
    else res.status(HTTP_STATUS.FORBIDDEN).send('로그인이 필요합니다.');

    // 에러 처리
  } catch (error) {
    next(error);
  }
};

export const isNotLoggedIn = (req, res, next) => {
  try {
    // 로그인 안되어있으면 다음 미들웨어
    if (!req.isAuthenticated()) next();
    // 로그인이 되어있으면 에러 메시지와 함께 홈 화면으로 리다이렉트
    else {
      const message = encodeURIComponent('로그인한 상태입니다.');
      res.redirect(`/?error=${message}`);
    }

    // 에러 처리
  } catch (error) {
    next(error);
  }
};
