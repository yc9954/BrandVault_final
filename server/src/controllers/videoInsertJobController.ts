import type { Request, Response } from 'express';
import multer from 'multer';
import { startVideoInsertionJob, getJobStatus } from '../services/videoInsertJobService.js';

/**
 * [POST] /api/video-insertion/start
 * 비디오 삽입 작업 시작 (비동기)
 */
export const startVideoInsertion = async (req: Request, res: Response) => {
  const videoFile = req.file;
  const { projectId, objectImageUrl, targetX, targetY, objectMaskPoints } = req.body;

  if (!videoFile) {
    return res.status(400).json({
      success: false,
      error: '비디오 파일이 필요합니다.'
    });
  }

  if (!projectId) {
    return res.status(400).json({
      success: false,
      error: '프로젝트 ID가 필요합니다.'
    });
  }

  if (!objectImageUrl) {
    return res.status(400).json({
      success: false,
      error: '객체 이미지 URL이 필요합니다.'
    });
  }

  if (!targetX || !targetY) {
    return res.status(400).json({
      success: false,
      error: '객체 삽입 위치(targetX, targetY)가 필요합니다.'
    });
  }

  try {
    const parsedProjectId = parseInt(projectId);
    const parsedTargetX = parseInt(targetX);
    const parsedTargetY = parseInt(targetY);
    const parsedMaskPoints = objectMaskPoints ? JSON.parse(objectMaskPoints) : undefined;

    const jobId = await startVideoInsertionJob(
      parsedProjectId,
      videoFile,
      objectImageUrl,
      parsedTargetX,
      parsedTargetY,
      parsedMaskPoints
    );

    res.status(202).json({
      success: true,
      jobId,
      message: '비디오 삽입 작업이 시작되었습니다.'
    });
  } catch (error) {
    console.error('Video insertion job start error:', error);
    const errorMessage = error instanceof Error ? error.message : '비디오 삽입 작업 시작에 실패했습니다.';
    
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * [GET] /api/video-insertion/status/:jobId
 * 작업 상태 조회
 */
export const getVideoInsertionStatus = async (req: Request, res: Response) => {
  const { jobId } = req.params;

  if (!jobId) {
    return res.status(400).json({
      success: false,
      error: '작업 ID가 필요합니다.'
    });
  }

  const status = getJobStatus(jobId);

  if (!status) {
    return res.status(404).json({
      success: false,
      error: '작업을 찾을 수 없습니다.'
    });
  }

  res.json({
    success: true,
    jobId,
    status: status.status,
    progress: status.progress,
    error: status.error,
    result: status.result,
  });
};

