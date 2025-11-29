import type { Request, Response } from 'express';
import multer from 'multer';
import { startVideoInsertionJob, getJobStatus, registerSSEClient } from '../services/videoInsertJobService.js';

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
 * 작업 상태 조회 (SSE)
 */
export const getVideoInsertionStatus = async (req: Request, res: Response) => {
  const { jobId } = req.params;

  console.log(`[SSE] 연결 요청: jobId=${jobId}, IP=${req.ip}`);

  if (!jobId) {
    console.error(`[SSE] jobId가 없습니다.`);
    return res.status(400).json({
      success: false,
      error: '작업 ID가 필요합니다.'
    });
  }

  // SSE 헤더 설정
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx 버퍼링 비활성화
  res.setHeader('Access-Control-Allow-Origin', process.env.CLIENT_URL || 'http://localhost:3001');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  console.log(`[SSE] 헤더 설정 완료: jobId=${jobId}`);

  // SSE 클라이언트 등록
  const unregister = registerSSEClient(jobId, (data: string) => {
    try {
      res.write(data);
      console.log(`[SSE] 데이터 전송 성공: jobId=${jobId}`);
    } catch (err) {
      console.error(`[SSE] 데이터 전송 실패: jobId=${jobId}`, err);
      unregister();
    }
  });

  console.log(`[SSE] 클라이언트 등록 완료: jobId=${jobId}`);

  // 초기 상태 전송
  try {
    const status = await getJobStatus(jobId);
    if (status) {
      const initialData = JSON.stringify({
        status: status.status,
        progress: status.progress,
        error: status.error,
        result: status.result,
      });
      res.write(`data: ${initialData}\n\n`);
      console.log(`[SSE] 초기 상태 전송: jobId=${jobId}, status=${status.status}, progress=${status.progress}`);
    } else {
      console.warn(`[SSE] 작업 상태를 찾을 수 없음: jobId=${jobId}`);
      res.write(`data: ${JSON.stringify({ status: 'not_found', progress: 0 })}\n\n`);
    }
  } catch (error) {
    console.error(`[SSE] 초기 상태 조회 실패: jobId=${jobId}`, error);
    res.write(`data: ${JSON.stringify({ status: 'error', progress: 0, error: '상태 조회 실패' })}\n\n`);
  }

  // 클라이언트 연결 종료 시 정리
  req.on('close', () => {
    console.log(`[SSE] 클라이언트 연결 종료: jobId=${jobId}`);
    unregister();
    res.end();
  });

  req.on('error', (err) => {
    console.error(`[SSE] 요청 에러: jobId=${jobId}`, err);
    unregister();
    res.end();
  });
};

