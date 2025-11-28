import type { Request, Response } from 'express';
import * as profileService from '../services/profileService.js';

/**
 * Creator 프로필 데이터를 가져와 응답합니다.
 */
export const fetchProfile = async (req: Request, res: Response): Promise<Response> => {
  const creatorId = req.user?.userId; 

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