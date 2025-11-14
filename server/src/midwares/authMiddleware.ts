import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface JwtPayload {
    userId?: number;
    brandId?: number;
    iat?: number;
    exp?: number;
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.jwt; 
    if (token == null) {
        return res.status(401).json({ message: '인증 토큰(쿠키)이 누락되었습니다.' });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        console.error("JWT_SECRET is not defined.");
        return res.status(500).json({ message: '서버 설정 오류.' });
    }
    jwt.verify(token, secret, (err: any, payload: any) => {
        if (err) {
            return res.status(403).json({ message: '토큰이 유효하지 않거나 만료되었습니다.' });
        }
        const jwtPayload = payload as JwtPayload;
        req.user = {
            ...(jwtPayload.userId !== undefined && { userId: jwtPayload.userId }),
            ...(jwtPayload.brandId !== undefined && { brandId: jwtPayload.brandId }),
        };
        next();
    });
};