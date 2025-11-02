import axios from 'axios';
// 로컬 개발 시에는 REACT_APP_API_URL이 설정되어 있으면 사용, 없으면 localhost 사용
const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

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
  console.log(response.data)
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

