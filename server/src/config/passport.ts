import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../db.js';
import jwt from 'jsonwebtoken';

// Google OAuth 전략 설정 (환경 변수가 있을 때만 초기화)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || `${process.env.API_URL || 'http://localhost:3000'}/api/auth/google/callback`,
      },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Google 프로필에서 정보 추출
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const displayName = profile.displayName || profile.name?.givenName || 'User';

        if (!email) {
          return done(new Error('Google 계정에서 이메일을 가져올 수 없습니다.'), false);
        }

        // Creator 찾기 또는 생성
        let creator = await prisma.creator.findUnique({
          where: { email },
        });

        if (!creator) {
          // 새 Creator 생성 (Google 로그인)
          creator = await prisma.creator.create({
            data: {
              email,
              password: '', // Google 로그인은 비밀번호 불필요
              user_name: displayName,
            },
          });
        }

        // JWT 토큰 생성
        const secret = process.env.JWT_SECRET;
        if (!secret) {
          return done(new Error('JWT_SECRET이 설정되지 않았습니다.'), false);
        }

        const token = jwt.sign(
          { userId: creator.creator_id },
          secret,
          { expiresIn: '1h' }
        );

        // 토큰과 사용자 정보를 함께 반환
        return done(null, { creator, token });
      } catch (error) {
        return done(error as Error, false);
      }
    }
  )
  );
} else {
  console.warn('Google OAuth credentials not found. Google login will be disabled.');
}

// JWT 기반이므로 세션 직렬화는 필요 없지만, Passport가 요구할 수 있으므로 추가
passport.serializeUser((user: any, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

export default passport;

