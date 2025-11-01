import { Storage } from '@google-cloud/storage';

const storage = new Storage();
// 'Always Free' 혜택을 위해 설정한 미국 리전의 버킷 이름
const bucketName = 'akasha-bucket'; // 👈 여기에 실제 버킷 이름을 입력하세요

export const bucket = storage.bucket(bucketName);