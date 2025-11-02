import type { Request, Response} from 'express'
import * as authService from '../services/authService.js'

export const handleCreatorLogin = async(req: Request, res: Response) => {
    // const { email, password } = req.body;
    try {
        const token = await authService.loginCreator();

        res.cookie('jwt', token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 3600000, 
            sameSite: 'none'
        });

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

        res.cookie('jwt', token, {
            httpOnly: true, 
            secure: process.env.NODE_ENV === 'production', 
            maxAge: 3600000, 
            sameSite: 'none'
        });

        res.status(200).json({message: '로그인 성공'});
    } catch (error: any) {
        console.error('로그인 에러:', error);
        res.status(401).json({ mesasge: error.message || '로그인 중 오류 발생'});
    }
};

export const handleLogout = (req: Request, res: Response) => {
    res.cookie('jwt', '', { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 0,
        sameSite: 'lax',
    });
    res.status(200).json({ message: '로그아웃 성공' });
};


