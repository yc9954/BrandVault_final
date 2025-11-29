import type { Request, Response} from 'express'
import * as authService from '../services/authService.js'
import passport from '../config/passport.js'

// 쿠키 설정 헬퍼 함수
const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isHttps = process.env.HTTPS === 'true' || isProduction;
    
    return {
        httpOnly: true,
        secure: isHttps, // HTTPS일 때만 secure 사용
        maxAge: 3600000, // 1시간
        sameSite: (isHttps ? 'none' : 'lax') as 'none' | 'lax' | 'strict', // HTTPS면 none, 아니면 lax
        ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN }), // 도메인은 환경변수로 설정
    };
};

export const handleCreatorLogin = async(req: Request, res: Response) => {
    const { email, password } = req.body;
    
    try {
        // 이메일과 비밀번호가 제공되었는지 확인
        if (!email || !password) {
            return res.status(400).json({ 
                message: '이메일과 비밀번호를 입력해주세요.' 
            });
        }

        const token = await authService.loginCreator({ email, password });

        res.cookie('jwt', token, getCookieOptions());

        res.status(200).json({message: '로그인 성공'});
    } catch (error: any) {
        console.error('로그인 에러:', error);
        res.status(401).json({ 
            message: error.message || '로그인 중 오류 발생'
        });
    }
};

export const handleBrandLogin = async(req: Request, res: Response) => {
    const { email, password } = req.body;
    
    try {
        // 이메일과 비밀번호가 제공되었는지 확인
        if (!email || !password) {
            return res.status(400).json({ 
                message: '이메일과 비밀번호를 입력해주세요.' 
            });
        }

        const token = await authService.loginBrand({ email, password });

        res.cookie('jwt', token, getCookieOptions());

        res.status(200).json({message: '로그인 성공'});
    } catch (error: any) {
        console.error('로그인 에러:', error);
        res.status(401).json({ message: error.message || '로그인 중 오류 발생'});
    }
};

export const handleLogout = (req: Request, res: Response) => {
    res.cookie('jwt', '', { 
        ...getCookieOptions(),
        maxAge: 0, // 즉시 만료
    });
    // Passport 세션 로그아웃 (있는 경우)
    if (req.logout) {
        req.logout((err) => {
            if (err) {
                console.error('로그아웃 에러:', err);
            }
        });
    }
    res.status(200).json({ message: '로그아웃 성공' });
};

/**
 * Google OAuth 로그인 시작
 */
export const handleGoogleLogin = (req: Request, res: Response) => {
    // Google OAuth가 설정되지 않은 경우
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.status(503).json({ 
            message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.' 
        });
    }
    return passport.authenticate('google', {
        scope: ['profile', 'email'],
    })(req, res);
};

/**
 * Google OAuth 콜백 처리
 */
export const handleGoogleCallback = (req: Request, res: Response) => {
    // Google OAuth가 설정되지 않은 경우
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect(
            `${process.env.CLIENT_URL || 'http://localhost:3001'}/login?error=google_auth_not_configured`
        );
    }
    
    passport.authenticate('google', { session: false }, (err: any, user: any) => {
        if (err || !user) {
            return res.redirect(
                `${process.env.CLIENT_URL || 'http://localhost:3001'}/login?error=google_auth_failed`
            );
        }

        // JWT 토큰을 쿠키에 설정
        res.cookie('jwt', user.token, getCookieOptions());

        // 프론트엔드로 리다이렉트
        res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3001'}/dashboard`);
    })(req, res);
};


