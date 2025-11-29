import type { Request, Response } from 'express';
import * as profileService from '../services/profileService.js';

/**
 * Creator 프로필 데이터를 가져와 응답합니다.
 */
export const fetchProfile = async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as { userId?: number; brandId?: number } | undefined;
  const creatorId = user?.userId; 

  if (!creatorId) {
    // userId가 없으면 401 Unauthorized 응답
    return res.status(401).json({ message: 'Authentication required: User ID missing from token.' });
  }

  try {
    // Service 계층에는 여전히 creatorId로 전달합니다.
    const profileData = await profileService.getProfile(creatorId);

    if (!profileData) {
      // 404 Not Found 응답
      return res.status(404).json({ message: 'Creator profile not found.' });
    }

    // 200 OK 응답
    return res.status(200).json(profileData);
  } catch (error) {
    console.error('Profile Controller Error:', error);
    // 500 Internal Server Error 응답
    return res.status(500).json({ message: 'Failed to fetch profile data.' });
  }
};

/**
 * Creator 프로필 정보를 업데이트합니다.
 */
export const updateProfile = async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as { userId?: number; brandId?: number } | undefined;
  const creatorId = user?.userId;

  if (!creatorId) {
    return res.status(401).json({ message: 'Authentication required: User ID missing from token.' });
  }

  try {
    const { user_name, email } = req.body;

    if (!user_name && !email) {
      return res.status(400).json({ message: '수정할 정보를 제공해주세요.' });
    }

    const updatedProfile = await profileService.updateProfile(creatorId, {
      user_name,
      email,
    });

    return res.status(200).json(updatedProfile);
  } catch (error) {
    console.error('Update Profile Controller Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update profile.';
    
    if (errorMessage.includes('이미 사용 중인 이메일')) {
      return res.status(409).json({ message: errorMessage });
    }

    return res.status(500).json({ message: errorMessage });
  }
};

/**
 * Creator의 요금제를 변경합니다.
 */
export const updateSubscription = async (req: Request, res: Response): Promise<Response> => {
  const user = req.user as { userId?: number; brandId?: number } | undefined;
  const creatorId = user?.userId;

  if (!creatorId) {
    return res.status(401).json({ message: 'Authentication required: User ID missing from token.' });
  }

  try {
    const { subscription_type } = req.body;

    if (subscription_type === undefined) {
      return res.status(400).json({ message: '요금제 타입을 제공해주세요.' });
    }

    const updatedProfile = await profileService.updateSubscription(
      creatorId,
      subscription_type === 'free' ? null : subscription_type
    );

    return res.status(200).json(updatedProfile);
  } catch (error) {
    console.error('Update Subscription Controller Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update subscription.';
    
    if (errorMessage.includes('유효하지 않은')) {
      return res.status(400).json({ message: errorMessage });
    }

    return res.status(500).json({ message: errorMessage });
  }
};