import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import * as VideoInsertService from './videoInsertService.js';
import { prisma } from '../db.js';

// 작업 상태 저장 (메모리 기반, 프로덕션에서는 Redis 등 사용 권장)
const jobStatusMap = new Map<string, {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: {
    gcsPath: string;
    outputVideoUrl: string;
  };
}>();

/**
 * 비디오 삽입 작업 시작 (비동기)
 */
export async function startVideoInsertionJob(
  projectId: number,
  videoFile: Express.Multer.File,
  objectImageUrl: string,
  targetX: number,
  targetY: number,
  objectMaskPoints?: number[][]
): Promise<string> {
  const jobId = uuidv4();
  
  // 작업 상태 초기화
  jobStatusMap.set(jobId, {
    status: 'pending',
    progress: 0,
  });

  // 프로젝트 상태 업데이트
  await prisma.project.update({
    where: { project_id: projectId },
    data: {
      status: 'processing',
      job_id: jobId,
      progress: 0,
    },
  });

  // 비동기로 작업 실행
  processVideoInsertionAsync(jobId, projectId, videoFile, objectImageUrl, targetX, targetY, objectMaskPoints)
    .catch((error) => {
      console.error(`Job ${jobId} failed:`, error);
      jobStatusMap.set(jobId, {
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // 프로젝트 상태 업데이트
      prisma.project.update({
        where: { project_id: projectId },
        data: {
          status: 'failed',
          progress: 0,
        },
      }).catch(console.error);
    });

  return jobId;
}

/**
 * 비디오 삽입 작업 실행 (비동기)
 */
async function processVideoInsertionAsync(
  jobId: string,
  projectId: number,
  videoFile: Express.Multer.File,
  objectImageUrl: string,
  targetX: number,
  targetY: number,
  objectMaskPoints?: number[][]
): Promise<void> {
  const tempDir = path.join(process.cwd(), 'temp', uuidv4());
  
  try {
    // 작업 시작
    updateJobStatus(jobId, 'processing', 5);
    await fs.mkdir(tempDir, { recursive: true });

    // 1. 임시 파일 저장 (5%)
    const videoPath = path.join(tempDir, 'input.mp4');
    const objectImagePath = path.join(tempDir, 'object.png');
    await fs.writeFile(videoPath, videoFile.buffer);
    
    // 2. 이미지 다운로드 (10%)
    updateJobStatus(jobId, 'processing', 10);
    const imageResponse = await fetch(objectImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`이미지 다운로드 실패: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    await fs.writeFile(objectImagePath, imageBuffer);

    // 3. 첫 프레임 추출 (15%)
    updateJobStatus(jobId, 'processing', 15);
    const firstFramePath = path.join(tempDir, 'first_frame.png');
    await VideoInsertService.extractFirstFrame(videoPath, firstFramePath);

    // 4. GCS에 임시 파일 업로드 (25%)
    updateJobStatus(jobId, 'processing', 25);
    const uploadedObjectImage = await VideoInsertService.uploadToGCS(objectImagePath, 'temp');
    const uploadedFirstFrame = await VideoInsertService.uploadToGCS(firstFramePath, 'temp');
    const uploadedVideo = await VideoInsertService.uploadToGCS(videoPath, 'temp');

    // 5. 객체 마스크 생성 (35%)
    updateJobStatus(jobId, 'processing', 35);
    let objectMaskUrl: string;
    if (objectMaskPoints) {
      const points = objectMaskPoints;
      objectMaskUrl = await VideoInsertService.generateMaskWithSAM2(uploadedObjectImage, points);
    } else {
      objectMaskUrl = await VideoInsertService.generateFullImageMask(uploadedObjectImage);
    }

    // 6. 타겟 마스크 생성 (40%)
    updateJobStatus(jobId, 'processing', 40);
    const targetMaskUrl = await VideoInsertService.generateTargetMask(
      uploadedFirstFrame,
      targetX,
      targetY
    );

    // 7. Anydoor로 첫 프레임 편집 (50%)
    updateJobStatus(jobId, 'processing', 50);
    const editedFirstFrameUrl = await VideoInsertService.editFrameWithAnydoor({
      referenceImage: uploadedObjectImage,
      referenceMask: objectMaskUrl,
      targetImage: uploadedFirstFrame,
      targetMask: targetMaskUrl,
    });

    // 8. AnyV2V로 전체 비디오 생성 (70%)
    updateJobStatus(jobId, 'processing', 70);
    const outputVideoUrl = await VideoInsertService.generateVideoWithAnyV2V({
      video: uploadedVideo,
      editedFirstFrame: editedFirstFrameUrl,
    });

    // 9. 최종 결과를 GCS에 영구 저장 (90%)
    updateJobStatus(jobId, 'processing', 90);
    const finalVideoPath = await VideoInsertService.downloadFile(outputVideoUrl, tempDir, 'output.mp4');
    const finalGcsPath = await VideoInsertService.uploadToGCS(finalVideoPath, 'processed-videos', false);

    // 임시 파일 정리
    await VideoInsertService.cleanupTempFiles(tempDir);
    await VideoInsertService.cleanupGCSFiles([uploadedObjectImage, uploadedFirstFrame, uploadedVideo, objectMaskUrl, targetMaskUrl, editedFirstFrameUrl]);

    // 작업 완료 (100%)
    updateJobStatus(jobId, 'completed', 100, {
      gcsPath: finalGcsPath,
      outputVideoUrl: finalGcsPath,
    });

    // 프로젝트 상태 업데이트
    await prisma.project.update({
      where: { project_id: projectId },
      data: {
        status: 'completed',
        thumbnail_url: finalGcsPath,
        progress: 100,
      },
    });

    console.log(`Job ${jobId} completed successfully`);
  } catch (error) {
    console.error(`Job ${jobId} error:`, error);
    const errorMessage = error instanceof Error ? error.message : '비디오 처리 중 오류가 발생했습니다.';
    
    updateJobStatus(jobId, 'failed', 0, undefined, errorMessage);
    
    // 프로젝트 상태 업데이트
    await prisma.project.update({
      where: { project_id: projectId },
      data: {
        status: 'failed',
        progress: 0,
      },
    });

    // 임시 파일 정리
    try {
      await VideoInsertService.cleanupTempFiles(tempDir);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    throw error;
  }
}

/**
 * 작업 상태 업데이트
 */
function updateJobStatus(
  jobId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: number,
  result?: { gcsPath: string; outputVideoUrl: string },
  error?: string
): void {
  const current = jobStatusMap.get(jobId) || { status: 'pending', progress: 0 };
  const update: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    error?: string;
    result?: {
      gcsPath: string;
      outputVideoUrl: string;
    };
  } = {
    ...current,
    status,
    progress,
  };
  
  if (result !== undefined) {
    update.result = result;
  }
  
  if (error !== undefined) {
    update.error = error;
  }
  
  jobStatusMap.set(jobId, update);
}

/**
 * 작업 상태 조회
 */
export function getJobStatus(jobId: string): {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: { gcsPath: string; outputVideoUrl: string };
} | null {
  return jobStatusMap.get(jobId) || null;
}

