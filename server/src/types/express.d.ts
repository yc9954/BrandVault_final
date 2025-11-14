import { Request } from 'express'

interface JwtPayload {
    userId?: number;
    brandId?: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}