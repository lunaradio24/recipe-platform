import { prisma } from '../utils/prisma.util.js';
import passport from 'passport';
import { localStrategy } from './local-strategy.passport.js';
import { kakaoStrategy } from './kakao-strategy.passport.js';
import { naverStrategy } from './naver-strategy.passport.js';

export const strategies = () => {
  //시리얼라이즈
  passport.serializeUser((user, done) => {
    done(null, user.userId);
  });

  //디시리얼라이즈
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.user.findFirst({
        where: { userId: id },
      });
      done(null, user);
    } catch (error) {
      console.log(error);
      done(error);
    }
  });

  localStrategy();
  kakaoStrategy();
  naverStrategy();
};
