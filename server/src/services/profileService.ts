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