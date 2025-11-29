import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import * as VideoInsertService from '../services/videoInsertService.js';

/**
 * [POST] /api/video-insertion/process
 * 비디오에 객체 삽입 처리 컨트롤러
 */
export const processVideoInsertion = async (req: Request, res: Response) => {
  const tempDir = path.join(process.cwd(), 'temp', uuidv4());

  try {
    // 임시 디렉토리 생성
    await fs.mkdir(tempDir, { recursive: true });

    const videoFile = req.file;
    const { objectImageUrl, targetX, targetY, objectMaskPoints } = req.body;

    if (!videoFile) {
      return res.status(400).json({
        success: false,
        error: '비디오 파일이 필요합니다.'
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

    console.log('Processing video insertion...');

    // 1. 임시 파일 저장
    const videoPath = path.join(tempDir, 'input.mp4');
    const objectImagePath = path.join(tempDir, 'object.png');

    await fs.writeFile(videoPath, videoFile.buffer);
    
    // 2. 이미지 URL에서 이미지 다운로드
    console.log('Downloading object image from URL:', objectImageUrl);
    const imageResponse = await fetch(objectImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`이미지 다운로드 실패: ${imageResponse.status} ${imageResponse.statusText}`);
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    await fs.writeFile(objectImagePath, imageBuffer);
    console.log('Object image downloaded successfully');

    // 3. 첫 프레임 추출
    console.log('Extracting first frame...');
    const firstFramePath = path.join(tempDir, 'first_frame.png');
    await VideoInsertService.extractFirstFrame(videoPath, firstFramePath);

    // 4. GCS에 임시 파일 업로드 (Replicate API가 접근할 수 있도록)
    console.log('Uploading files to GCS...');
    const uploadedObjectImage = await VideoInsertService.uploadToGCS(objectImagePath, 'temp');
    const uploadedFirstFrame = await VideoInsertService.uploadToGCS(firstFramePath, 'temp');
    const uploadedVideo = await VideoInsertService.uploadToGCS(videoPath, 'temp');

    // 5. 객체 마스크 생성
    console.log('Generating object mask...');
    let objectMaskUrl: string;

    if (objectMaskPoints) {
      // 사용자가 제공한 포인트로 마스크 생성
      const points = JSON.parse(objectMaskPoints);
      objectMaskUrl = await VideoInsertService.generateMaskWithSAM2(uploadedObjectImage, points);
    } else {
      // objectMaskPoints가 없으면 전체 이미지를 마스크로 사용 (임시 해결책)
      // TODO: Replicate에서 사용 가능한 세그멘테이션 모델 찾아서 교체 필요
      console.log('No objectMaskPoints provided, using full image as mask');
      objectMaskUrl = await VideoInsertService.generateFullImageMask(uploadedObjectImage);
    }

    // 6. 타겟 마스크 생성 (삽입 위치)
    console.log('Generating target mask...');
    const targetMaskUrl = await VideoInsertService.generateTargetMask(
      uploadedFirstFrame,
      parseInt(targetX),
      parseInt(targetY)
    );

    // 7. Anydoor로 첫 프레임 편집
    console.log('Editing first frame with Anydoor...');
    const editedFirstFrameUrl = await VideoInsertService.editFrameWithAnydoor({
      referenceImage: uploadedObjectImage,
      referenceMask: objectMaskUrl,
      targetImage: uploadedFirstFrame,
      targetMask: targetMaskUrl,
    });

    // 8. AnyV2V로 전체 비디오 생성
    console.log('Generating video with AnyV2V...');
    const outputVideoUrl = await VideoInsertService.generateVideoWithAnyV2V({
      video: uploadedVideo,
      editedFirstFrame: editedFirstFrameUrl,
    });

    // 9. 최종 결과를 GCS에 영구 저장 (파일 경로 반환)
    console.log('Downloading and saving final video...');
    const finalVideoPath = await VideoInsertService.downloadFile(outputVideoUrl, tempDir, 'output.mp4');
    const finalGcsPath = await VideoInsertService.uploadToGCS(finalVideoPath, 'processed-videos', false); // 파일 경로 반환

    // 임시 파일 정리
    await VideoInsertService.cleanupTempFiles(tempDir);
    await VideoInsertService.cleanupGCSFiles([uploadedObjectImage, uploadedFirstFrame, uploadedVideo, objectMaskUrl, targetMaskUrl, editedFirstFrameUrl]);

    console.log('Video insertion completed!');

    res.json({
      success: true,
      outputVideoUrl: finalGcsPath,
      gcsPath: finalGcsPath,
    });

  } catch (error) {
    console.error('Video insertion error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // 에러 발생 시 임시 파일 정리
    try {
      await VideoInsertService.cleanupTempFiles(tempDir);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    const errorMessage = error instanceof Error ? error.message : '비디오 처리 중 오류가 발생했습니다.';
    console.error('Sending error response:', errorMessage);
    
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
};

