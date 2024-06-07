import passport from 'passport';
import { prisma } from '../utils/prisma.util.js';
import { Strategy as NaverStrategy } from 'passport-naver';
import { NAVER_CLIENT_ID, NAVER_CLIENT_SECRET, NAVER_CALLBACK_URI } from '../constants/auth.constant.js';

const naverStrategy = () => {
  passport.use(
    'naver',
    new NaverStrategy(
      {
        clientID: NAVER_CLIENT_ID,
        clientSecret: NAVER_CLIENT_SECRET,
        callbackURL: NAVER_CALLBACK_URI,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // 사용자 정보 가져오기
          const { id, nickname, profile_image, age, gender, email, name } = profile._json;

          // 사용자 정보 저장 또는 업데이트
          let user = await prisma.user.findFirst({ where: { socialId: +id } });

          // DB에 해당 social id로 회원가입한 이력이 없는 경우
          if (!user) {
            user = await prisma.user.create({
              data: {
                socialId: +id,
                username: nickname,
                profileImage: profile_image,
                email: email,
                emailVerified: true,
                socialLoginProvider: 'naver',
              },
            });
          }
          // DB에 해당 social id로 회원가입이 되어있는 경우
          else {
            await prisma.user.update({
              where: { socialId: +id },
              data: {
                username: nickname,
                profileImage: profile_image,
                email: email,
                mailVerified: true,
                socialLoginProvider: 'naver',
              },
            });
          }
          done(null, user);
        } catch (error) {
          console.error(error);
          done(error);
        }
      },
    ),
  );
};

export { naverStrategy };
