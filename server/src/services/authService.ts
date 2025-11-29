import { prisma } from '../db.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

interface LoginCredentials {
    email: string;
    password: string;
}

export const loginCreator = async (credentials: LoginCredentials): Promise<string> => {
    const { email, password } = credentials;

    // 1. 이메일과 비밀번호가 제공되었는지 확인
    if (!email || !password) {
        throw new Error('이메일과 비밀번호를 입력해주세요.');
    }

    // 2. DB에서 사용자 조회
    console.log(`[로그인 시도] 이메일: ${email}`);
    const creator = await prisma.creator.findUnique({
        where: { email },
    });

    // 3. 사용자가 존재하지 않으면 에러
    if (!creator) {
        console.log(`[로그인 실패] 이메일 '${email}'에 해당하는 Creator를 찾을 수 없습니다.`);
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    console.log(`[로그인 확인] Creator ID: ${creator.creator_id}, 이메일: ${creator.email}`);

    // 4. 비밀번호 검증 (평문 비교)
    if (password !== creator.password) {
        console.log(`[로그인 실패] 비밀번호가 일치하지 않습니다.`);
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    console.log(`[로그인 성공] Creator ID: ${creator.creator_id}`);

    // 5. JWT 토큰 생성
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET이 설정되지 않았습니다.');
    }

    const payload = {
        userId: creator.creator_id,
        email: creator.email,
    };

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    return token;
}

export const loginBrand = async (credentials: LoginCredentials): Promise<string> => {
    const { email, password } = credentials;

    // 1. 이메일과 비밀번호가 제공되었는지 확인
    if (!email || !password) {
        throw new Error('이메일과 비밀번호를 입력해주세요.');
    }

    // 2. DB에서 브랜드 사용자 조회 (Platform_User는 Brand와 연결되어 있음)
    console.log(`[브랜드 로그인 시도] 이메일: ${email}`);
    
    // Brand 테이블에서 contract_email로 조회
    const brand = await prisma.brand.findUnique({
        where: { contract_email: email },
        include: {
            platform_users: true,
        },
    });

    if (!brand) {
        console.log(`[브랜드 로그인 실패] 이메일 '${email}'에 해당하는 Brand를 찾을 수 없습니다.`);
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    // Platform_User에서 비밀번호 확인 (첫 번째 사용자 사용)
    const platformUser = brand.platform_users[0];
    if (!platformUser || password !== platformUser.password) {
        console.log(`[브랜드 로그인 실패] 비밀번호가 일치하지 않습니다.`);
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }

    console.log(`[브랜드 로그인 성공] Brand ID: ${brand.brand_id}`);

    // 3. JWT 토큰 생성
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET이 설정되지 않았습니다.');
    }

    const payload = {
        brandId: brand.brand_id,
        userId: platformUser.user_id,
        email: email,
    };

    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    return token;
}

