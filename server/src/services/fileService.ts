import { Storage } from '@google-cloud/storage';
import {bucket} from '../gcs.js'
import type{ GetSignedUrlConfig } from '@google-cloud/storage';
/**
 * GCS에 파일을 업로드합니다.
 * @param file Multer 파일 객체
 * @param destinationPath GCS 내 저장 경로 (예: 'uploads/images/my-image.jpg')
 */

export const uploadFile = async (
  file: Express.Multer.File,
  destinationPath: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blob = bucket.file(destinationPath);
    const blobStream = blob.createWriteStream({
      resumable: false,
      contentType: file.mimetype,
    });

    blobStream.on('error', (err) => {
      reject(new Error(`GCS 업로드 실패: ${err.message}`));
    });

    blobStream.on('finish', () => {
      resolve(destinationPath);
    });

    blobStream.end(file.buffer);
  });
};

/**
 * GCS에서 파일을 삭제합니다.
 * @param filePath GCS 내 파일 경로 (예: 'uploads/images/my-image.jpg')
 */
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    const file = bucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) {
      console.warn(`삭제할 파일(${filePath})이 GCS에 존재하지 않습니다.`);
      return;
    }
    await file.delete();
    console.log(`GCS 파일 삭제 성공: ${filePath}`);
  } catch (error) {
    throw new Error(`GCS 파일 삭제 실패`);
  }
};

/**
 * GCS 비공개 파일의 임시 URL을 생성합니다.
 * @param filePath GCS 내 파일 경로
 * @param downloadFilename [선택 사항] 이 값을 주면 '다운로드'용 URL이 됩니다.
 */
export const getSignedUrl = async (
  filePath: string,
  downloadFilename?: string 
): Promise<string> => {
  
  // 3. GetSignedUrlConfig 타입으로 옵션 객체 정의
  const options: GetSignedUrlConfig = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // 15분 후 만료
  };

  // 4. downloadFilename 값이 있으면 (다운로드 요청이면)
  if (downloadFilename) {
    options.responseDisposition= `attachment; filename="${downloadFilename}"`;
  }
  // 없으면 보기용 url

  try {
    const [signedUrl] = await bucket.file(filePath).getSignedUrl(options);
    return signedUrl;
  } catch (error) {
    let errorMessage = "알 수 없는 오류";
    if (error instanceof Error) errorMessage = error.message;
    console.error(`Signed URL 생성 실패: ${filePath}`, error);
    throw new Error(`Signed URL 생성 실패: ${errorMessage}`);
  }
};
