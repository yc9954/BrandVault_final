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
 * 비디오에 객체 삽입 처리
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

