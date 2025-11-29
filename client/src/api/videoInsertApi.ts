/**
 * 비디오 삽입 API
 */

export interface VideoInsertRequest {
  video: File;
  objectImageUrl: string; // 이미지 URL (백엔드에서 다운로드)
  targetX: number;
  targetY: number;
  objectMaskPoints?: number[][];
}

export interface VideoInsertResponse {
  success: boolean;
  outputVideoUrl: string;
  gcsPath: string;
  error?: string;
}

/**
 * 비디오에 객체 삽입 처리 (동기, 레거시)
 */
export const processVideoInsertion = async (
  data: VideoInsertRequest
): Promise<VideoInsertResponse> => {
  const formData = new FormData();
  formData.append('video', data.video);
  formData.append('objectImageUrl', data.objectImageUrl); // 이미지 URL 전달
  formData.append('targetX', data.targetX.toString());
  formData.append('targetY', data.targetY.toString());
  
  if (data.objectMaskPoints) {
    formData.append('objectMaskPoints', JSON.stringify(data.objectMaskPoints));
  }

  const response = await fetch(
    `${process.env.REACT_APP_API_URL}/api/video-insertion/process`,
    {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: '비디오 삽입 처리에 실패했습니다.',
    }));
    throw new Error(errorData.error || '비디오 삽입 처리에 실패했습니다.');
  }

  return response.json();
};

/**
 * 비디오 삽입 작업 시작 (비동기)
 */
export interface StartVideoInsertionRequest {
  video: File;
  projectId: number;
  objectImageUrl: string;
  targetX: number;
  targetY: number;
  objectMaskPoints?: number[][];
}

export interface StartVideoInsertionResponse {
  success: boolean;
  jobId: string;
  message: string;
}

export const startVideoInsertion = async (
  data: StartVideoInsertionRequest
): Promise<StartVideoInsertionResponse> => {
  const formData = new FormData();
  formData.append('video', data.video);
  formData.append('projectId', data.projectId.toString());
  formData.append('objectImageUrl', data.objectImageUrl);
  formData.append('targetX', data.targetX.toString());
  formData.append('targetY', data.targetY.toString());
  
  if (data.objectMaskPoints) {
    formData.append('objectMaskPoints', JSON.stringify(data.objectMaskPoints));
  }

  const response = await fetch(
    `${process.env.REACT_APP_API_URL}/api/video-insertion/start`,
    {
      method: 'POST',
      credentials: 'include',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: '비디오 삽입 작업 시작에 실패했습니다.',
    }));
    throw new Error(errorData.error || '비디오 삽입 작업 시작에 실패했습니다.');
  }

  return response.json();
};

/**
 * 비디오 삽입 작업 상태 조회
 */
export interface VideoInsertionStatusResponse {
  success: boolean;
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: {
    gcsPath: string;
    outputVideoUrl: string;
  };
}

export const getVideoInsertionStatus = async (
  jobId: string
): Promise<VideoInsertionStatusResponse> => {
  const response = await fetch(
    `${process.env.REACT_APP_API_URL}/api/video-insertion/status/${jobId}`,
    {
      method: 'GET',
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: '작업 상태 조회에 실패했습니다.',
    }));
    throw new Error(errorData.error || '작업 상태 조회에 실패했습니다.');
  }

  return response.json();
};

