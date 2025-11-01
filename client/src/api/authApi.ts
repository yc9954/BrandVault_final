import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

/**
 * Creator 로그인 (자동 로그인)
 */
export const loginCreator = async (): Promise<{ message: string }> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/auth/login/creator`,
    {},
    {
      withCredentials: true, // 쿠키를 받기 위해 필요
    }
  );
  return response.data;
};

/**
 * Brand 로그인
 */
export const loginBrand = async (): Promise<{ message: string }> => {
  const response = await axios.post(
    `${API_BASE_URL}/api/auth/login/brand`,
    {},
    {
      withCredentials: true,
    }
  );
  return response.data;
};

