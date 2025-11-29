import { Storage } from '@google-cloud/storage';

const storage = new Storage();

// 환경 변수에서 버킷 이름을 가져옵니다.
// server/.env 에서 GCS_BUCKET_NAME=실제버킷이름 으로 설정해야 합니다.
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  throw new Error('GCS_BUCKET_NAME 환경 변수가 설정되어 있지 않습니다.');
}

export const bucket = storage.bucket(bucketName);