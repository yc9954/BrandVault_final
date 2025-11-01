import { prisma } from '../db.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

export const loginCreator = async (): Promise<string> => {
    // 인증로직 추가 필요
    const payload = {
        userId: 1,
    };
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('jwt token이 설정되지 않았습니다.')
    const token = jwt.sign(payload, secret, {expiresIn: '1h'});
    return token;
}

export const loginBrand = async (): Promise<string> => {
    // 인증로직 추가 필요
    const payload = {
        brandId: 1,
    };
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('jwt token이 설정되지 않았습니다.')
    const token = jwt.sign(payload, secret, {expiresIn: '1h'});
    return token;
}

