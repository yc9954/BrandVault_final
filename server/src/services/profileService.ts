import { prisma } from '../db.js'

/**
 * Creator ID를 사용하여 프로필 정보를 조회합니다.
 * @param creatorId - 인증된 Creator의 고유 ID
 * @returns 조회된 Creator 프로필 정보
 */
export const getProfile = async (creatorId: number) => {
  if (isNaN(creatorId)) {
    throw new Error('Invalid Creator ID provided');
  }
  
  const creator = await prisma.creator.findUnique({
    where: {
      creator_id: creatorId,
    },
    select: {
      creator_id: true,
      user_name: true,
      email: true,
      subscription_type: true,
      created_at: true,
    },
  });

  if (!creator) {
    return null; 
  }

  return creator;
};

/**
 * Creator 프로필 정보를 업데이트합니다.
 * @param creatorId - 인증된 Creator의 고유 ID
 * @param data - 업데이트할 데이터 (user_name, email)
 * @returns 업데이트된 Creator 프로필 정보
 */
export const updateProfile = async (
  creatorId: number,
  data: { user_name?: string; email?: string }
) => {
  if (isNaN(creatorId)) {
    throw new Error('Invalid Creator ID provided');
  }

  // 이메일 중복 체크 (다른 사용자가 이미 사용 중인지)
  if (data.email) {
    const existingCreator = await prisma.creator.findUnique({
      where: { email: data.email },
    });

    if (existingCreator && existingCreator.creator_id !== creatorId) {
      throw new Error('이미 사용 중인 이메일입니다.');
    }
  }

  const updatedCreator = await prisma.creator.update({
    where: {
      creator_id: creatorId,
    },
    data: {
      ...(data.user_name && { user_name: data.user_name }),
      ...(data.email && { email: data.email }),
    },
    select: {
      creator_id: true,
      user_name: true,
      email: true,
      subscription_type: true,
      created_at: true,
    },
  });

  return updatedCreator;
};

/**
 * Creator의 요금제를 변경합니다.
 * @param creatorId - 인증된 Creator의 고유 ID
 * @param subscriptionType - 변경할 요금제 타입 ('free', 'pro', 'plus')
 * @returns 업데이트된 Creator 프로필 정보
 */
export const updateSubscription = async (
  creatorId: number,
  subscriptionType: string | null
) => {
  if (isNaN(creatorId)) {
    throw new Error('Invalid Creator ID provided');
  }

  // 유효한 요금제 타입인지 확인
  const validTypes = ['free', 'pro', 'plus', 'enterprise'];
  if (subscriptionType && !validTypes.includes(subscriptionType.toLowerCase())) {
    throw new Error('유효하지 않은 요금제 타입입니다.');
  }

  const updatedCreator = await prisma.creator.update({
    where: {
      creator_id: creatorId,
    },
    data: {
      subscription_type: subscriptionType || 'free',
    },
    select: {
      creator_id: true,
      user_name: true,
      email: true,
      subscription_type: true,
      created_at: true,
    },
  });

  return updatedCreator;
};