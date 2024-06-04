import passport from 'passport';
import { prisma } from '../utils/prisma.util.js';
import { Strategy as LocalStrategy } from 'passport-local';

const localStrategy = () => {
  passport.use(
    'local',
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
      },
      async (email, password, done) => {
        try {
          // users DB의 email중 해당 이메일과 일치 하는 경우
          const existingUser = await prisma.user.findFirst({ where: { email } });
          // 이미 가입된 프로필이면 성공
          if (existingUser) {
            console.log('가입 이력 있음', accessToken);
            done(null, existingUser);
          }
          // 가입되지 않는 유저면 회원가입 시키고 로그인을 시킨다.
          else {
            const newUser = await prisma.user.create({
              data: {
                email: profile._json.kakao_account.email,
                username: profile.displayName ?? undefined,
                profileImage: profile._json.properties.profile_image ?? undefined,
                emailVerified: true,
                socialLoginProvider: 'kakao',
              },
            });
            console.log('가입 이력 없음', accessToken);
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
