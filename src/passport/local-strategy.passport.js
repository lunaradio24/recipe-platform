import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { prisma } from '../utils/prisma.util.js';

const localStrategy = () => {
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          // users DB의 email중 `해당 이메일과 일치 하는 경우`
          const existingUser = await prisma.user.findFirst({
            where: { email: email },
          });
          // 이미 가입된 카카오 프로필이면 성공
          if (existingUser) {
            done(null, existingUser);
          } else {
            // 가입되지 않는 유저면 회원가입 시키고 로그인을 시킨다.
            const newUser = await prisma.user.create({
              email: email,
              password: password,
            });
            done(null, newUser);
          }
        } catch (error) {
          console.error(error);
          done(error);
        }
      },
    ),
  );
};

export { localStrategy };
