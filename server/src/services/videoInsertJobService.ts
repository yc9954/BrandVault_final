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

// SSE 클라이언트 저장 (jobId별로 여러 클라이언트 가능)
const sseClients = new Map<string, Set<{ send: (data: string) => void }>>();

/**
 * 서버 시작 시 진행 중인 작업들을 삭제 (서버 재시작으로 중단된 작업 정리)
 */
export async function cleanupInterruptedJobs(): Promise<void> {
  try {
    const interruptedProjects = await prisma.project.findMany({
      where: {
        status: 'processing',
        job_id: { not: null },
      },
      select: {
        project_id: true,
        job_id: true,
        thumbnail_url: true,
      },
    });

    if (interruptedProjects.length > 0) {
      console.log(`[VideoInsertJob] 서버 재시작으로 중단된 ${interruptedProjects.length}개 작업을 삭제합니다.`);
      
      for (const project of interruptedProjects) {
        try {
          // GCS 파일 삭제
          if (project.thumbnail_url) {
            const { deleteFile } = await import('./fileService.js');
            try {
              await deleteFile(project.thumbnail_url);
              console.log(`[VideoInsertJob] GCS 파일 삭제 성공: ${project.thumbnail_url}`);
            } catch (gcsError) {
              console.error(`[VideoInsertJob] GCS 파일 삭제 실패: ${project.thumbnail_url}`, gcsError);
            }
          }

          // 프로젝트 삭제 (관계된 데이터는 CASCADE로 자동 삭제)
          await prisma.project.delete({
            where: { project_id: project.project_id },
          });
          
          console.log(`[VideoInsertJob] 프로젝트 ${project.project_id} (jobId: ${project.job_id}) 삭제 완료`);
        } catch (deleteError) {
          console.error(`[VideoInsertJob] 프로젝트 ${project.project_id} 삭제 실패:`, deleteError);
        }
      }
    }
  } catch (error) {
    console.error('[VideoInsertJob] 중단된 작업 정리 실패:', error);
  }
}

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
  console.log(`[VideoInsertJob] Starting job ${jobId} for project ${projectId}`);
  processVideoInsertionAsync(jobId, projectId, videoFile, objectImageUrl, targetX, targetY, objectMaskPoints)
    .catch((error) => {
      console.error(`[VideoInsertJob] Job ${jobId} failed:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      const failedStatus = {
        status: 'failed' as const,
        progress: 0,
        error: errorMessage,
      };
      
      jobStatusMap.set(jobId, failedStatus);
      
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
    console.log(`[VideoInsertJob] Job ${jobId} - Starting processing...`);
    // 작업 시작
    updateJobStatus(jobId, 'processing', 5);
    await fs.mkdir(tempDir, { recursive: true });
    console.log(`[VideoInsertJob] Job ${jobId} - Temp directory created: ${tempDir}`);

    // 1. 임시 파일 저장 (5%)
    updateJobStatus(jobId, 'processing', 5);
    await updateProjectProgress(projectId, jobId, 'processing', 5);
    const videoPath = path.join(tempDir, 'input.mp4');
    const objectImagePath = path.join(tempDir, 'object.png');
    await fs.writeFile(videoPath, videoFile.buffer);
    
    // 2. 이미지 다운로드 (10%)
    updateJobStatus(jobId, 'processing', 10);
    await updateProjectProgress(projectId, jobId, 'processing', 10);
    const imageResponse = await fetch(objectImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`이미지 다운로드 실패: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    await fs.writeFile(objectImagePath, imageBuffer);

    // 3. 첫 프레임 추출 (15%)
    updateJobStatus(jobId, 'processing', 15);
    await updateProjectProgress(projectId, jobId, 'processing', 15);
    const firstFramePath = path.join(tempDir, 'first_frame.png');
    await VideoInsertService.extractFirstFrame(videoPath, firstFramePath);

    // 4. GCS에 임시 파일 업로드 (25%)
    updateJobStatus(jobId, 'processing', 25);
    await updateProjectProgress(projectId, jobId, 'processing', 25);
    const uploadedObjectImage = await VideoInsertService.uploadToGCS(objectImagePath, 'temp');
    const uploadedFirstFrame = await VideoInsertService.uploadToGCS(firstFramePath, 'temp');
    const uploadedVideo = await VideoInsertService.uploadToGCS(videoPath, 'temp');
    // GCS 업로드 완료 후 진행률 업데이트
    await updateProjectProgress(projectId, jobId, 'processing', 30);

    // 5. 객체 마스크 생성 (35%)
    updateJobStatus(jobId, 'processing', 35);
    await updateProjectProgress(projectId, jobId, 'processing', 35);
    let objectMaskUrl: string;
    if (objectMaskPoints) {
      const points = objectMaskPoints;
      objectMaskUrl = await VideoInsertService.generateMaskWithSAM2(uploadedObjectImage, points);
    } else {
      objectMaskUrl = await VideoInsertService.generateFullImageMask(uploadedObjectImage);
    }
    // SAM2 API 완료 후 진행률 업데이트
    await updateProjectProgress(projectId, jobId, 'processing', 38);

    // 6. 타겟 마스크 생성 (40%)
    updateJobStatus(jobId, 'processing', 40);
    await updateProjectProgress(projectId, jobId, 'processing', 40);
    const targetMaskUrl = await VideoInsertService.generateTargetMask(
      uploadedFirstFrame,
      targetX,
      targetY
    );
    // 타겟 마스크 생성 완료 후 진행률 업데이트
    await updateProjectProgress(projectId, jobId, 'processing', 43);

    // 7. Anydoor로 첫 프레임 편집 (50%)
    updateJobStatus(jobId, 'processing', 50);
    await updateProjectProgress(projectId, jobId, 'processing', 50);
    const editedFirstFrameUrl = await VideoInsertService.editFrameWithAnydoor({
      referenceImage: uploadedObjectImage,
      referenceMask: objectMaskUrl,
      targetImage: uploadedFirstFrame,
      targetMask: targetMaskUrl,
    });
    // Anydoor API 완료 후 진행률 업데이트
    await updateProjectProgress(projectId, jobId, 'processing', 60);

    // 8. AnyV2V로 전체 비디오 생성 (70%)
    updateJobStatus(jobId, 'processing', 70);
    await updateProjectProgress(projectId, jobId, 'processing', 70);
    const outputVideoUrl = await VideoInsertService.generateVideoWithAnyV2V({
      video: uploadedVideo,
      editedFirstFrame: editedFirstFrameUrl,
    });
    // AnyV2V API 완료 후 진행률 업데이트 (가장 오래 걸리는 단계)
    await updateProjectProgress(projectId, jobId, 'processing', 85);

    // 9. 최종 결과를 GCS에 영구 저장 (90%)
    updateJobStatus(jobId, 'processing', 90);
    await updateProjectProgress(projectId, jobId, 'processing', 90);
    const finalVideoPath = await VideoInsertService.downloadFile(outputVideoUrl, tempDir, 'output.mp4');
    const finalGcsPath = await VideoInsertService.uploadToGCS(finalVideoPath, 'processed-videos', false);
    // 최종 파일 저장 완료 후 진행률 업데이트
    await updateProjectProgress(projectId, jobId, 'processing', 95);

    // 임시 파일 정리
    await VideoInsertService.cleanupTempFiles(tempDir);
    await VideoInsertService.cleanupGCSFiles([uploadedObjectImage, uploadedFirstFrame, uploadedVideo, objectMaskUrl, targetMaskUrl, editedFirstFrameUrl]);

    // 작업 완료 (100%)
    updateJobStatus(jobId, 'completed', 100, {
      gcsPath: finalGcsPath,
      outputVideoUrl: finalGcsPath,
    });

    // 프로젝트가 여전히 존재하는지 확인 후 상태 업데이트
    const projectExists = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { project_id: true },
    });

    if (projectExists) {
      // 프로젝트 상태 업데이트 (job_id는 null로 설정하여 작업 완료 표시)
      await prisma.project.update({
        where: { project_id: projectId },
        data: {
          status: 'completed',
          thumbnail_url: finalGcsPath,
          progress: 100,
          job_id: null, // 작업 완료 후 job_id 제거
        },
      });
      
      // SSE로 완료 알림 (thumbnail_url 포함)
      await updateProjectProgress(projectId, jobId, 'completed', 100, finalGcsPath);
      
      // 작업 완료 후 jobStatusMap에서 제거 (더 이상 상태 조회 불필요)
      jobStatusMap.delete(jobId);
      
      // SSE 클라이언트 정리
      sseClients.delete(jobId);
      
      console.log(`Job ${jobId} completed successfully and removed from status map`);
    } else {
      // 프로젝트가 삭제된 경우 결과 파일도 삭제
      console.log(`[VideoInsertJob] Job ${jobId} completed but project ${projectId} was deleted. Cleaning up result file.`);
      try {
        await VideoInsertService.cleanupGCSFiles([finalGcsPath]);
        // jobStatusMap에서도 제거
        jobStatusMap.delete(jobId);
      } catch (cleanupError) {
        console.error(`[VideoInsertJob] Failed to cleanup result file for deleted project:`, cleanupError);
      }
    }
  } catch (error) {
    console.error(`Job ${jobId} error:`, error);
    const errorMessage = error instanceof Error ? error.message : '비디오 처리 중 오류가 발생했습니다.';
    
    updateJobStatus(jobId, 'failed', 0, undefined, errorMessage);
    
    // 프로젝트가 여전히 존재하는지 확인 후 상태 업데이트
    const projectExists = await prisma.project.findUnique({
      where: { project_id: projectId },
      select: { project_id: true },
    });

    if (projectExists) {
      // 프로젝트 상태 업데이트 (job_id는 null로 설정)
      await prisma.project.update({
        where: { project_id: projectId },
        data: {
          status: 'failed',
          progress: 0,
          job_id: null, // 작업 실패 후 job_id 제거
        },
      });
      
      // SSE로 실패 알림
      await updateProjectProgress(projectId, jobId, 'failed', 0);
      
      // 작업 실패 후 jobStatusMap에서 제거
      jobStatusMap.delete(jobId);
      
      // SSE 클라이언트 정리
      sseClients.delete(jobId);
    } else {
      console.log(`[VideoInsertJob] Job ${jobId} failed but project ${projectId} was deleted.`);
      // 프로젝트가 삭제되었어도 jobStatusMap에서 제거
      jobStatusMap.delete(jobId);
      // SSE 클라이언트 정리
      sseClients.delete(jobId);
    }

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
/**
 * 메모리 맵만 업데이트 (빠른 조회용)
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
 * DB의 progress 업데이트 및 SSE로 진행률 푸시 (각 단계 완료 시 호출)
 */
async function updateProjectProgress(
  projectId: number,
  jobId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  progress: number,
  thumbnailUrl?: string
): Promise<void> {
  try {
    // DB 업데이트
    const updateData: { status: string; progress: number; thumbnail_url?: string } = {
      status,
      progress,
    };
    if (thumbnailUrl) {
      updateData.thumbnail_url = thumbnailUrl;
    }
    
    await prisma.project.update({
      where: { project_id: projectId },
      data: updateData,
    });

    // SSE로 진행률 푸시
    const clients = sseClients.get(jobId);
    if (clients && clients.size > 0) {
      const messageData: { status: string; progress: number; projectId: number; thumbnail_url?: string } = {
        status,
        progress,
        projectId,
      };
      if (thumbnailUrl) {
        messageData.thumbnail_url = thumbnailUrl;
      }
      
      const message = JSON.stringify(messageData);
      clients.forEach(client => {
        try {
          client.send(`data: ${message}\n\n`);
        } catch (err) {
          console.error(`[VideoInsertJob] Failed to send SSE to client for job ${jobId}:`, err);
        }
      });
    }
  } catch (dbError) {
    // DB 업데이트 실패는 로그만 남기고 계속 진행
    console.error(`[VideoInsertJob] Failed to update DB progress for project ${projectId}:`, dbError);
  }
}

/**
 * SSE 클라이언트 등록
 */
export function registerSSEClient(jobId: string, send: (data: string) => void): () => void {
  if (!sseClients.has(jobId)) {
    sseClients.set(jobId, new Set());
  }
  sseClients.get(jobId)!.add({ send });

  // 클라이언트 제거 함수 반환
  return () => {
    const clients = sseClients.get(jobId);
    if (clients) {
      clients.delete({ send });
      if (clients.size === 0) {
        sseClients.delete(jobId);
      }
    }
  };
}

/**
 * 작업 취소 (프로젝트 삭제 시 호출)
 */
export function cancelJob(jobId: string): void {
  // jobStatusMap에서 제거하여 상태 조회 불가능하게 함
  jobStatusMap.delete(jobId);
  console.log(`[VideoInsertJob] Job ${jobId} cancelled (removed from status map)`);
}

/**
 * 작업 상태 조회
 */
export async function getJobStatus(jobId: string): Promise<{
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: { gcsPath: string; outputVideoUrl: string };
} | null> {
  // 먼저 메모리 맵에서 조회
  const memoryStatus = jobStatusMap.get(jobId);
  if (memoryStatus) {
    return memoryStatus;
  }

  // 메모리에 없으면 DB에서 조회
  try {
    const project = await prisma.project.findFirst({
      where: { job_id: jobId },
      select: {
        status: true,
        progress: true,
        thumbnail_url: true,
      },
    });

    if (!project) {
      return null;
    }

    // DB 상태를 메모리 맵에 복원
    const dbStatus: {
      status: 'pending' | 'processing' | 'completed' | 'failed';
      progress: number;
      error?: string;
      result?: { gcsPath: string; outputVideoUrl: string };
    } = {
      status: (project.status as 'pending' | 'processing' | 'completed' | 'failed') || 'pending',
      progress: project.progress || 0,
    };

    if (project.thumbnail_url && dbStatus.status === 'completed') {
      dbStatus.result = {
        gcsPath: project.thumbnail_url,
        outputVideoUrl: project.thumbnail_url,
      };
    }


    // 메모리 맵에 저장 (다음 조회 시 빠르게 접근)
    jobStatusMap.set(jobId, dbStatus);

    return dbStatus;
  } catch (error) {
    console.error(`[VideoInsertJob] Error fetching job status from DB for ${jobId}:`, error);
    return null;
  }
}

