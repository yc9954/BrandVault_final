import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import Replicate from 'replicate';

// process.cwd()를 사용하여 프로젝트 루트 기준으로 경로 설정
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const SPLAT_DIR = path.join(process.cwd(), 'splats');

async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Replicate File/URL 다운로더
 * - Replicate FileOutput 객체 또는 문자열 URL 모두 지원
 * - 가능하면 replicate.files.download() 사용, 실패 시 fetch로 폴백
 */
async function downloadReplicateFile(
  replicate: Replicate,
  fileOrUrl: any
): Promise<Buffer> {
  // 1) 공식 파일 다운로드 헬퍼가 있으면 우선 사용
  try {
    const filesAny = (replicate as any).files;
    if (filesAny?.download) {
      const data = await filesAny.download(fileOrUrl);
      if (Buffer.isBuffer(data)) return data;
      if (data instanceof ArrayBuffer) return Buffer.from(data);
      if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer);
      if (typeof data === 'string') {
        const res = await fetch(data);
        if (!res.ok) throw new Error(`파일 다운로드 실패: ${res.status} ${res.statusText}`);
        return Buffer.from(await res.arrayBuffer());
      }
    }
  } catch {
    // 헬퍼 실패 시 아래 수동 경로로 폴백
  }

  // 2) 문자열 URL이면 바로 fetch
  if (typeof fileOrUrl === 'string') {
    const res = await fetch(fileOrUrl);
    if (!res.ok) throw new Error(`파일 다운로드 실패: ${res.status} ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }

  // 3) FileOutput 객체면 .url() 호출로 실제 URL 획득
  if (fileOrUrl && typeof fileOrUrl.url === 'function') {
    const u = await fileOrUrl.url(); // URL | string
    const urlStr = u?.toString?.() ?? String(u);
    const res = await fetch(urlStr);
    if (!res.ok) throw new Error(`파일 다운로드 실패: ${res.status} ${res.statusText}`);
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error('지원하지 않는 파일 출력 타입입니다.');
}

/**
 * Gaussian Splatting 변환 실행
 * 단일 이미지를 입력받아 GLB/PLY를 받아 .splat(또는 실제 확장자)로 저장
 */
export async function convertToSplat(
  imagePaths: string[],
  jobId: string,
): Promise<string> {
  await ensureDirectoryExists(UPLOAD_DIR);
  await ensureDirectoryExists(SPLAT_DIR);

  console.log(`[Job ${jobId}] SPLAT_DIR: ${SPLAT_DIR}`);

  // 기본은 .splat로 저장하지만 실제 확장자를 알면 바꿀 예정
  let outputPath = path.join(SPLAT_DIR, `${jobId}.splat`);

  const tempDir = path.join(UPLOAD_DIR, jobId);
  await ensureDirectoryExists(tempDir);

  // 이미지들을 임시 디렉토리에 복사(트러블슈팅용)
  for (let i = 0; i < imagePaths.length; i++) {
    const src = imagePaths[i];
    if (!src) continue;
    const dest = path.join(tempDir, `image_${i}.jpg`);
    await fs.copyFile(src, dest);
  }

  try {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      throw new Error('REPLICATE_API_TOKEN이 설정되지 않았습니다.');
    }
    const replicate = new Replicate({ auth: token });

    if (imagePaths.length === 0) {
      throw new Error('최소 1개의 이미지가 필요합니다.');
    }
    const firstImagePath = imagePaths[0];
    if (!firstImagePath) {
      throw new Error('이미지 경로가 유효하지 않습니다.');
    }

    // 첫 이미지 base64 → data URI
    const buffer = await fs.readFile(firstImagePath);
    const dataUri = `data:image/jpeg;base64,${buffer.toString('base64')}`;

    if (imagePaths.length > 1) {
      console.warn(`[Job ${jobId}] 경고: ${imagePaths.length}개 중 첫 번째 이미지만 사용합니다.`);
    }

    // 동작 확인된 버전 (2025-11 기준)
    const versionId = 'e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c';

    const output: any = await replicate.run(`firtoz/trellis:${versionId}`, {
      input: {
        images: [dataUri],
        seed: 0,
        texture_size: 1024,
        mesh_simplify: 0.95,
        generate_model: true,     // GLB
        generate_color: true,
        generate_normal: true,
        randomize_seed: true,
        ss_sampling_steps: 12,
        slat_sampling_steps: 12,
        ss_guidance_strength: 7.5,
        slat_guidance_strength: 3,
        save_gaussian_ply: true,  // PLY
      },
    });

    // 출력 로깅(디버그)
    console.log(`[Job ${jobId}] 출력 타입:`, typeof output);
    if (output && typeof output === 'object') {
      console.log(`[Job ${jobId}] 출력 필드:`, Object.keys(output));
    }

    // GLB > PLY > 기타 우선순위
    let fileOrUrl: any =
      output?.model_file ??
      output?.gaussian_ply ??
      output?.splat ??
      output?.ply ??
      output?.file ??
      output?.output ??
      output?.url;

    if (!fileOrUrl) {
      const fields = output && typeof output === 'object' ? Object.keys(output).join(', ') : 'none';
      throw new Error(
        `3D 파일을 찾을 수 없습니다. 사용 가능한 필드: ${fields}\n` +
        `전체 출력: ${JSON.stringify(output, null, 2)}`
      );
    }

    // 확장자 결정: GLB 있으면 .glb, 아니면 PLY 있으면 .ply, 그 외 .splat
    if (output?.model_file) {
      outputPath = path.join(SPLAT_DIR, `${jobId}.glb`);
    } else if (output?.gaussian_ply) {
      outputPath = path.join(SPLAT_DIR, `${jobId}.ply`);
    } // 아니면 기본 .splat 유지

    console.log(`[Job ${jobId}] 파일 다운로드 시작...`);
    const fileBuf = await downloadReplicateFile(replicate, fileOrUrl);

    await fs.writeFile(outputPath, fileBuf);
    console.log(`[Job ${jobId}] ✅ 파일 저장 완료: ${outputPath} (${fileBuf.byteLength} bytes)`);

    // 임시 디렉토리 정리
    await fs.rm(tempDir, { recursive: true, force: true });
    return outputPath;
  } catch (error: any) {
    console.error(`[Job ${jobId}] ❌ 오류:`, error);

    // 결제/크레딧 오류 메시지 보정
    if (error?.message && (
      error.message.includes('402') ||
      error.message.toLowerCase().includes('insufficient') ||
      error.message.toLowerCase().includes('billing') ||
      error.message.toLowerCase().includes('credit')
    )) {
      throw new Error(
        'Replicate 계정 크레딧이 부족합니다. https://replicate.com/account/billing 에서 크레딧을 충전하세요.'
      );
    }

    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

/** .splat/.glb/.ply 파일 경로 조회 */
export async function getSplatFile(jobId: string): Promise<string | null> {
  console.log('=== getSplatFile 호출 ===');
  console.log('입력된 jobId:', jobId);
  console.log('검색 디렉토리:', SPLAT_DIR);
  
  // 확장자 후보(.glb, .ply, .splat) 순서로 검사
  const candidates = [
    path.join(SPLAT_DIR, `${jobId}.glb`),
    path.join(SPLAT_DIR, `${jobId}.ply`),
    path.join(SPLAT_DIR, `${jobId}.splat`),
  ];
  
  for (const p of candidates) {
    console.log('확인 중:', p);
    try {
      await fs.access(p);
      console.log('✅ 파일 찾음:', p);
      return p;
    } catch {
      console.log('❌ 파일 없음');
    }
  }
  
  // 디렉토리 내용 출력 (디버깅용)
  try {
    const files = await fs.readdir(SPLAT_DIR);
    console.log('splats 디렉토리 내용:', files);
  } catch (err) {
    console.log('디렉토리 읽기 실패:', err);
  }
  
  console.log('❌ 어떤 확장자로도 파일을 찾을 수 없음');
  return null;
}

/** 간단 상태 조회 */
export async function getJobStatus(
  jobId: string,
): Promise<'processing' | 'completed'> {
  const p = await getSplatFile(jobId);
  return p ? 'completed' : 'processing';
}