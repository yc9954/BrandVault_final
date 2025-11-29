import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Storage } from '@google-cloud/storage';
import type { GetSignedUrlConfig } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

const execPromise = promisify(exec);

// GCS 스토리지 초기화
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || 'brandvault-bucket';

// Replicate API 설정
const REPLICATE_API_BASE_URL = process.env.REPLICATE_API_BASE_URL || 'https://api.replicate.com/v1';
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

// AI 모델 설정
const REPLICATE_MODELS = {
  SAM2: process.env.REPLICATE_MODEL_SAM2 || 'meta/sam-2:fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83',
  ANYDOOR: process.env.REPLICATE_MODEL_ANYDOOR || 'ali-vilab/anydoor:542c963129c4661ab53a875b1b9a84b2102ca784cf872ef2752a468721c0eb2a',
  ANYV2V: process.env.REPLICATE_MODEL_ANYV2V || 'tiger-ai-lab/anyv2v:3c7b5bc5bcae13a0c945e6f918bb8409f76cc46102c7c9a208bd1531f82c5684',
};

// GCS 설정
const GCS_BASE_URL = process.env.GCS_BASE_URL || 'https://storage.googleapis.com';

/**
 * GCS에 파일 업로드하고 서명된 URL 반환 (비공개 버킷용, Replicate API용)
 * Replicate API가 접근할 수 있도록 충분히 긴 만료 시간(1시간)을 설정합니다.
 * @param filePath 파일 경로
 * @param folder GCS 폴더 경로
 * @param returnSignedUrl true면 서명된 URL 반환, false면 파일 경로 반환
 * @returns 서명된 URL 또는 파일 경로
 */
export async function uploadToGCS(filePath: string, folder: string, returnSignedUrl: boolean = true): Promise<string> {
  const fileName = `${folder}/${uuidv4()}_${path.basename(filePath)}`;
  const bucket = storage.bucket(bucketName);

  // 파일 업로드
  await bucket.upload(filePath, {
    destination: fileName,
    metadata: {
      cacheControl: 'public, max-age=3600',
    },
  });

  // 서명된 URL이 필요한 경우 (Replicate API용)
  if (returnSignedUrl) {
    const file = bucket.file(fileName);
    const options: GetSignedUrlConfig = {
      version: 'v4',
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000, // 1시간 후 만료
    };

    const [signedUrl] = await file.getSignedUrl(options);
    return signedUrl;
  }

  // 파일 경로 반환 (최종 저장용)
  return fileName;
}

/**
 * 서명된 URL에서 GCS 파일 경로 추출
 */
export function extractFilePathFromSignedUrl(signedUrl: string): string | null {
  try {
    const url = new URL(signedUrl);
    // 서명된 URL 형식: https://storage.googleapis.com/bucket-name/path/to/file?X-Goog-Algorithm=...
    // 파일 경로는 버킷 이름 이후부터 ? 이전까지
    const pathMatch = url.pathname.match(/^\/[^\/]+\/(.+)$/);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }
    return null;
  } catch (error) {
    console.error('Failed to extract file path from signed URL:', error);
    return null;
  }
}

/**
 * 모델이 존재하는지 확인
 */
async function checkModelExists(modelName: string): Promise<boolean> {
  try {
    // 버전 해시가 포함된 경우 모델 경로만 추출
    const modelPath = modelName.includes(':') ? modelName.split(':')[0] : modelName;
    
    const response = await fetch(`${REPLICATE_API_BASE_URL}/models/${modelPath}`, {
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn(`Model ${modelPath} check failed: ${response.status} - ${JSON.stringify(errorData)}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn(`Model ${modelName} check error:`, error);
    return false;
  }
}

/**
 * Replicate API를 직접 호출하여 예측 완료까지 대기하는 헬퍼 함수
 */
async function callReplicateModel(modelName: string, input: any): Promise<any> {
  // 모델 존재 여부 확인 (경고만 출력하고 계속 진행)
  const modelExists = await checkModelExists(modelName);
  if (!modelExists) {
    console.warn(`Warning: Model ${modelName} may not exist. Attempting to call anyway...`);
    // 모델이 존재하지 않아도 API 호출을 시도 (실제 에러는 API 응답에서 확인)
  }

  // 버전 해시가 포함된 경우와 아닌 경우를 구분
  let apiUrl: string;
  if (modelName.includes(':')) {
    // 버전 해시가 포함된 경우: model_owner/model_name:version_hash
    const [modelPath, versionHash] = modelName.split(':');
    apiUrl = `${REPLICATE_API_BASE_URL}/models/${modelPath}/versions/${versionHash}/predictions`;
  } else {
    // 버전 해시가 없는 경우: 기본 최신 버전 사용
    apiUrl = `${REPLICATE_API_BASE_URL}/models/${modelName}/predictions`;
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Token ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' })) as { detail?: string };
    const errorMessage = errorData.detail || response.statusText;
    console.error(`Replicate API error for model ${modelName}:`, errorData);
    throw new Error(`Replicate API error: ${response.status} - ${errorMessage}`);
  }

  let prediction = await response.json() as {
    id: string;
    status: string;
    output?: any;
    error?: string;
  };
  
  // 예측이 완료될 때까지 폴링 (최대 15분, AnyV2V는 시간이 오래 걸릴 수 있음)
  const maxWaitTime = 15 * 60 * 1000; // 15분
  const startTime = Date.now();
  let lastStatus = prediction.status;
  let statusCheckCount = 0;
  
  while ((prediction.status === 'starting' || prediction.status === 'processing') && (Date.now() - startTime < maxWaitTime)) {
    // 상태가 변경되지 않으면 더 오래 대기
    const waitTime = prediction.status === lastStatus ? 5000 : 2000; // 상태가 같으면 5초, 다르면 2초
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    statusCheckCount++;
    if (statusCheckCount % 12 === 0) { // 1분마다 로그 출력
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      console.log(`Still processing ${modelName}... (${elapsed}s elapsed, status: ${prediction.status})`);
    }
    
    const statusResponse = await fetch(`${REPLICATE_API_BASE_URL}/predictions/${prediction.id}`, {
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
      }
    });
    
    if (!statusResponse.ok) {
      throw new Error(`Failed to check prediction status: ${statusResponse.status}`);
    }
    
    lastStatus = prediction.status;
    prediction = await statusResponse.json() as {
      id: string;
      status: string;
      output?: any;
      error?: string;
    };
  }

  if (prediction.status === 'failed') {
    throw new Error(`Replicate prediction failed: ${prediction.error || 'Unknown error'}`);
  }

  if (prediction.status !== 'succeeded') {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    throw new Error(`Prediction did not complete within ${Math.floor(maxWaitTime / 1000)}s. Status: ${prediction.status}, Elapsed: ${elapsed}s`);
  }
  
  console.log(`Model ${modelName} completed successfully`);

  return prediction.output;
}

/**
 * SAM2를 사용한 마스크 생성 (포인트 기반)
 * meta/sam-2를 사용하여 자동 세그멘테이션 수행
 */
export async function generateMaskWithSAM2(imageUrl: string, points: number[][]): Promise<string> {
  try {
    // meta/sam-2는 point_coords를 직접 지원하지 않으므로 자동 세그멘테이션 사용
    const output = await callReplicateModel(REPLICATE_MODELS.SAM2, {
      image: imageUrl,
      points_per_side: 32,
      pred_iou_thresh: 0.88,
      stability_score_thresh: 0.95,
    });

    // 개별 마스크 중 첫 번째 반환
    return output?.individual_masks?.[0] || output?.combined_mask || output;
  } catch (error) {
    console.error('SAM2 mask generation error:', error);
    throw new Error(`마스크 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * 전체 이미지를 마스크로 사용 (임시 해결책)
 * Replicate 모델이 사용 불가능할 때 사용
 */
export async function generateFullImageMask(imageUrl: string): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp', uuidv4());
  try {
    await fs.mkdir(tempDir, { recursive: true });

    // 이미지 다운로드
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sharp로 이미지 크기 확인
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 512;
    const height = metadata.height || 512;

    // 전체 이미지를 흰색 마스크로 생성 (전체 영역 선택)
    const maskBuffer = await sharp({
      create: {
        width: width,
        height: height,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    // 마스크 파일 저장
    const maskPath = path.join(tempDir, 'object_mask.png');
    await fs.writeFile(maskPath, maskBuffer);

    // GCS에 업로드
    const maskUrl = await uploadToGCS(maskPath, 'temp');

    // 임시 파일 정리
    await cleanupTempFiles(tempDir);

    return maskUrl;
  } catch (error) {
    await cleanupTempFiles(tempDir).catch(() => {});
    console.error('Full image mask generation error:', error);
    throw new Error(`마스크 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * 타겟 위치에 마스크 생성
 * Sharp를 사용하여 프로그래밍 방식으로 원형 마스크 생성
 */
export async function generateTargetMask(imageUrl: string, x: number, y: number): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp', uuidv4());
  try {
    await fs.mkdir(tempDir, { recursive: true });

    // 이미지 다운로드
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Sharp로 이미지 크기 확인
    const metadata = await sharp(buffer).metadata();
    const width = metadata.width || 512;
    const height = metadata.height || 512;

    // 원형 마스크 생성을 위한 SVG
    const radius = 100;
    const circleSvg = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${width}" height="${height}" fill="black"/>
        <circle cx="${x}" cy="${y}" r="${radius}" fill="white"/>
      </svg>
    `);

    // SVG를 PNG로 변환하여 마스크 생성
    const maskBuffer = await sharp(circleSvg)
      .png()
      .toBuffer();

    // 마스크 파일 저장
    const maskPath = path.join(tempDir, 'target_mask.png');
    await fs.writeFile(maskPath, maskBuffer);

    // GCS에 업로드
    const maskUrl = await uploadToGCS(maskPath, 'temp');

    // 임시 파일 정리
    await cleanupTempFiles(tempDir);

    return maskUrl;
  } catch (error) {
    await cleanupTempFiles(tempDir).catch(() => {});
    console.error('Target mask generation error:', error);
    throw new Error(`타겟 마스크 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * Anydoor로 첫 프레임 편집
 */
export async function editFrameWithAnydoor(params: {
  referenceImage: string;
  referenceMask: string;
  targetImage: string;
  targetMask: string;
}): Promise<string> {
  try {
    const output = await callReplicateModel(REPLICATE_MODELS.ANYDOOR, {
      reference_image_path: params.referenceImage,
      reference_image_mask: params.referenceMask,
      bg_image_path: params.targetImage,
      bg_mask_path: params.targetMask,
      steps: 100,  // 화질 개선: 50 -> 100
      guidance_scale: 7.5,  // 화질 개선: 4.5 -> 7.5
      control_strength: 1.0,
    });

    return Array.isArray(output) ? output[0] : output;
  } catch (error) {
    console.error('Anydoor frame editing error:', error);
    throw new Error(`프레임 편집 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * AnyV2V로 비디오 생성
 */
export async function generateVideoWithAnyV2V(params: {
  video: string;
  editedFirstFrame: string;
}): Promise<string> {
  try {
    const output = await callReplicateModel(REPLICATE_MODELS.ANYV2V, {
      video: params.video,
      edited_first_frame: params.editedFirstFrame,
      num_inference_steps: 100,  // 화질 개선: 50 -> 100
      guidance_scale: 12,  // 화질 개선: 9 -> 12
      ddim_inversion_steps: 200,  // 화질 개선: 100 -> 200
    });

    return Array.isArray(output) ? output[0] : output;
  } catch (error) {
    console.error('AnyV2V video generation error:', error);
    throw new Error(`비디오 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

/**
 * URL에서 파일 다운로드
 */
export async function downloadFile(url: string, destDir: string, filename: string): Promise<string> {
  const destPath = path.join(destDir, filename);
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  await fs.writeFile(destPath, Buffer.from(buffer));
  return destPath;
}

/**
 * 임시 파일 정리
 */
export async function cleanupTempFiles(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    console.error('Failed to cleanup temp files:', error);
  }
}

/**
 * GCS 임시 파일 정리
 * 서명된 URL 또는 일반 URL에서 파일 경로를 추출하여 삭제합니다.
 */
export async function cleanupGCSFiles(urls: string[]): Promise<void> {
  const bucket = storage.bucket(bucketName);

  for (const url of urls) {
    try {
      // 서명된 URL에서 파일 경로 추출
      let fileName = extractFilePathFromSignedUrl(url);
      
      // 추출 실패 시 일반 URL 형식으로 시도
      if (!fileName) {
        const extracted = url.replace(`${GCS_BASE_URL}/${bucketName}/`, '').split('?')[0];
        fileName = extracted || null;
      }
      
      if (fileName) {
        await bucket.file(fileName).delete();
        console.log(`GCS 파일 삭제 성공: ${fileName}`);
      } else {
        console.warn(`파일 경로를 추출할 수 없습니다: ${url}`);
      }
    } catch (error) {
      console.error('Failed to delete GCS file:', error);
    }
  }
}

/**
 * 첫 프레임 추출
 */
/**
 * 비디오의 총 프레임 수를 확인
 */
async function getVideoFrameCount(videoPath: string): Promise<number> {
  const ffprobePaths = [
    '/opt/homebrew/bin/ffprobe',  // Apple Silicon Mac
    '/usr/local/bin/ffprobe',     // Intel Mac
    'ffprobe'                      // 시스템 PATH
  ];

  let ffprobeCmd = 'ffprobe';
  for (const ffprobePath of ffprobePaths) {
    try {
      await fs.access(ffprobePath);
      ffprobeCmd = ffprobePath;
      break;
    } catch {
      // 다음 경로 시도
    }
  }

  try {
    // 프레임 수 확인
    const { stdout } = await execPromise(
      `${ffprobeCmd} -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "${videoPath}"`
    );
    const frameCount = parseInt(stdout.trim());
    return isNaN(frameCount) ? 0 : frameCount;
  } catch (error) {
    console.error('Failed to get frame count, trying alternative method:', error);
    // 대체 방법: fps와 duration으로 계산
    try {
      const { stdout: fpsOutput } = await execPromise(
        `${ffprobeCmd} -v error -select_streams v:0 -show_entries stream=r_frame_rate -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      );
      const { stdout: durationOutput } = await execPromise(
        `${ffprobeCmd} -v error -select_streams v:0 -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`
      );
      
      const fpsStr = fpsOutput.trim();
      const parts = fpsStr.split('/').map(Number);
      const num = parts[0];
      const den = parts[1];
      const fps = (num && den) ? num / den : parseFloat(fpsStr);
      const duration = parseFloat(durationOutput.trim());
      
      return Math.floor(fps * duration);
    } catch (altError) {
      console.error('Failed to get frame count with alternative method:', altError);
      return 0;
    }
  }
}

/**
 * 비디오를 최대 16프레임으로 리샘플링
 * 프레임 수가 16보다 많으면 균등 간격으로 16프레임만 추출하여 새 비디오 생성
 * @returns 원본 프레임 수와 리샘플링 간격 정보
 */
export async function resampleVideoTo16Frames(
  videoPath: string, 
  outputPath: string
): Promise<{ originalFrameCount: number; interval: number }> {
  const ffmpegPaths = [
    '/opt/homebrew/bin/ffmpeg',  // Apple Silicon Mac
    '/usr/local/bin/ffmpeg',     // Intel Mac
    'ffmpeg'                      // 시스템 PATH
  ];

  let ffmpegCmd = 'ffmpeg';
  for (const ffmpegPath of ffmpegPaths) {
    try {
      await fs.access(ffmpegPath);
      ffmpegCmd = ffmpegPath;
      console.log(`Using ffmpeg at: ${ffmpegCmd}`);
      break;
    } catch {
      // 다음 경로 시도
    }
  }

  // 1. 총 프레임 수 확인
  const totalFrames = await getVideoFrameCount(videoPath);
  console.log(`[ResampleVideo] Total frames: ${totalFrames}`);

  // 2. 프레임 수가 16 이하면 그대로 복사
  if (totalFrames <= 16) {
    console.log(`[ResampleVideo] Frame count (${totalFrames}) is already <= 16, copying as is`);
    await execPromise(`${ffmpegCmd} -i "${videoPath}" -c copy "${outputPath}"`);
    return { originalFrameCount: totalFrames, interval: 1 };
  }

  // 3. 16프레임으로 리샘플링
  // 간격 계산: totalFrames / 16
  const interval = Math.floor(totalFrames / 16);
  console.log(`[ResampleVideo] Resampling to 16 frames with interval: ${interval}`);

  // FFmpeg 필터: 특정 프레임만 선택하고 프레임 레이트 조정
  // select='not(mod(n,${interval}))' : interval 간격으로 프레임 선택
  // setpts=N/FRAME_RATE/TB : 타임스탬프 재설정
  // fps=8 : 2초 비디오에 16프레임 = 8fps
  const filter = `select='not(mod(n,${interval}))',setpts=N/FRAME_RATE/TB,fps=8`;
  
  await execPromise(
    `${ffmpegCmd} -i "${videoPath}" -vf "${filter}" -c:v libx264 -preset fast -crf 23 "${outputPath}"`
  );
  
  console.log(`[ResampleVideo] Video resampled successfully to 16 frames`);
  
  return { originalFrameCount: totalFrames, interval };
}

/**
 * 리샘플링된 비디오(16프레임)를 원래 프레임 수로 복구
 * 각 프레임을 interval만큼 복사하여 원래 프레임 수로 재구성
 */
export async function restoreVideoToOriginalFrames(
  resampledVideoPath: string,
  outputPath: string,
  originalFrameCount: number,
  interval: number
): Promise<void> {
  const ffmpegPaths = [
    '/opt/homebrew/bin/ffmpeg',  // Apple Silicon Mac
    '/usr/local/bin/ffmpeg',     // Intel Mac
    'ffmpeg'                      // 시스템 PATH
  ];

  let ffmpegCmd = 'ffmpeg';
  for (const ffmpegPath of ffmpegPaths) {
    try {
      await fs.access(ffmpegPath);
      ffmpegCmd = ffmpegPath;
      console.log(`Using ffmpeg at: ${ffmpegCmd}`);
      break;
    } catch {
      // 다음 경로 시도
    }
  }

  // 프레임 수가 16 이하면 그대로 복사
  if (originalFrameCount <= 16 || interval === 1) {
    console.log(`[RestoreVideo] Frame count (${originalFrameCount}) is already <= 16 or interval is 1, copying as is`);
    await execPromise(`${ffmpegCmd} -i "${resampledVideoPath}" -c copy "${outputPath}"`);
    return;
  }

  console.log(`[RestoreVideo] Restoring video from 16 frames to ${originalFrameCount} frames with interval: ${interval}`);

  // 원본 비디오의 fps 확인
  const ffprobePaths = [
    '/opt/homebrew/bin/ffprobe',
    '/usr/local/bin/ffprobe',
    'ffprobe'
  ];

  let ffprobeCmd = 'ffprobe';
  for (const ffprobePath of ffprobePaths) {
    try {
      await fs.access(ffprobePath);
      ffprobeCmd = ffprobePath;
      break;
    } catch {
      // 다음 경로 시도
    }
  }

  // 원본 fps 계산 (원본 프레임 수 / duration)
  let originalFps = 30; // 기본값
  try {
    const { stdout: durationOutput } = await execPromise(
      `${ffprobeCmd} -v error -select_streams v:0 -show_entries stream=duration -of default=noprint_wrappers=1:nokey=1 "${resampledVideoPath}"`
    );
    const duration = parseFloat(durationOutput.trim());
    if (duration > 0) {
      originalFps = originalFrameCount / duration;
      console.log(`[RestoreVideo] Calculated original FPS: ${originalFps}`);
    }
  } catch (error) {
    console.warn(`[RestoreVideo] Failed to get duration, using default FPS: ${originalFps}`, error);
  }

  // FFmpeg 필터: 각 프레임을 interval만큼 복사하여 원래 프레임 수로 복구
  // minterpolate의 dup 모드를 사용하여 각 프레임을 복사
  // fps를 원래 fps로 설정하면 자동으로 프레임이 복사됨
  const restoreFilter = `minterpolate=fps=${originalFps}:mi_mode=dup`;
  
  await execPromise(
    `${ffmpegCmd} -i "${resampledVideoPath}" -vf "${restoreFilter}" -c:v libx264 -preset fast -crf 23 "${outputPath}"`
  );
  
  console.log(`[RestoreVideo] Video restored successfully to ${originalFrameCount} frames`);
}

export async function extractFirstFrame(videoPath: string, outputPath: string): Promise<void> {
  // ffmpeg 경로 찾기 (Homebrew 경로 우선)
  const ffmpegPaths = [
    '/opt/homebrew/bin/ffmpeg',  // Apple Silicon Mac
    '/usr/local/bin/ffmpeg',     // Intel Mac
    'ffmpeg'                      // 시스템 PATH
  ];
  
  let ffmpegCmd = 'ffmpeg';
  for (const ffmpegPath of ffmpegPaths) {
    try {
      // 파일이 존재하는지 확인
      await fs.access(ffmpegPath);
      ffmpegCmd = ffmpegPath;
      console.log(`Using ffmpeg at: ${ffmpegCmd}`);
      break;
    } catch {
      // 다음 경로 시도
      continue;
    }
  }
  
  // 첫 프레임 추출 시 고해상도 유지
  await execPromise(`${ffmpegCmd} -i "${videoPath}" -vframes 1 -q:v 2 "${outputPath}"`);
}

