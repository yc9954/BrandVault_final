import type { Request, Response} from 'express'
import * as authService from '../services/authService.js'

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
    // const { email, password } = req.body;
    try {
        const token = await authService.loginCreator();

        res.cookie('jwt', token, getCookieOptions());

        res.status(200).json({message: '로그인 성공'});
    } catch (error: any) {
        console.error('로그인 에러:', error);
        res.status(401).json({ mesasge: error.message || '로그인 중 오류 발생'});
    }
};

export const handleBrandLogin = async(req: Request, res: Response) => {
    // const { email, password } = req.body;
    try {
        const token = await authService.loginBrand();

        res.cookie('jwt', token, getCookieOptions());

        res.status(200).json({message: '로그인 성공'});
    } catch (error: any) {
        console.error('로그인 에러:', error);
        res.status(401).json({ mesasge: error.message || '로그인 중 오류 발생'});
    }
};

export const handleLogout = (req: Request, res: Response) => {
    res.cookie('jwt', '', { 
        ...getCookieOptions(),
        maxAge: 0, // 즉시 만료
    });
    res.status(200).json({ message: '로그아웃 성공' });
};


