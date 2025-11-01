import axios from 'axios';

// Vercel 배포 시에는 같은 도메인을 사용하므로 상대 경로 사용
// 로컬 개발 시에는 REACT_APP_API_URL이 설정되어 있으면 사용, 없으면 localhost 사용
const API_BASE_URL = process.env.REACT_APP_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');

// 인증 토큰 가져오기 (쿠키에서)
const getAuthHeaders = () => {
  return {
    withCredentials: true,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };
};

export interface UploadResponse {
  message: string;
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
}

export interface JobStatus {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
}

/**
 * 이미지 업로드 및 .splat 변환 시작
 */
export const uploadImagesAndConvert = async (files: File[]): Promise<UploadResponse> => {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await axios.post<UploadResponse>(
    `${API_BASE_URL}/api/splat/convert`,
    formData,
    getAuthHeaders()
  );

  return response.data;
};

/**
 * 작업 상태 확인
 */
export const getJobStatus = async (jobId: string): Promise<JobStatus> => {
  const response = await axios.get<JobStatus>(
    `${API_BASE_URL}/api/splat/status/${jobId}`,
    {
      withCredentials: true,
    }
  );

  return response.data;
};

/**
 * .splat 파일 다운로드 URL 생성
 */
export const getSplatDownloadUrl = (jobId: string): string => {
  return `${API_BASE_URL}/api/splat/stream/${jobId}`;
};

