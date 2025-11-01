import React, { useState, useRef, useEffect } from 'react';
import { uploadImagesAndConvert, getJobStatus, getSplatDownloadUrl } from '../../api/splatApi';
import { loginCreator } from '../../api/authApi';
import './SplatUploader.css';

interface SplatUploaderProps {
  onUploadComplete?: (jobId: string) => void;
}

function SplatUploader({ onUploadComplete }: SplatUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 컴포넌트 마운트 시 자동 로그인 시도
  useEffect(() => {
    const ensureAuthenticated = async () => {
      try {
        await loginCreator();
        setIsAuthenticated(true);
        console.log('Creator 로그인 성공');
      } catch (err: any) {
        console.error('자동 로그인 실패:', err);
        // 로그인 실패해도 업로드 시도는 가능 (401 오류 시 재로그인 시도)
      }
    };
    ensureAuthenticated();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('최소 1개 이상의 이미지를 선택해주세요.');
      return;
    }

    setUploading(true);
    setStatus('uploading');
    setError(null);

    try {
      // 업로드 전 인증 확인 및 로그인 시도
      if (!isAuthenticated) {
        try {
          await loginCreator();
          setIsAuthenticated(true);
          console.log('업로드 전 로그인 성공');
        } catch (loginErr: any) {
          console.error('로그인 실패:', loginErr);
          // 계속 진행 (업로드에서 401 오류 시 재시도)
        }
      }

      const response = await uploadImagesAndConvert(selectedFiles);
      setJobId(response.jobId);
      setStatus('processing');
      
      // ✅ 변경: 작업 상태 폴링 시작 (완료 후 콜백 호출)
      pollJobStatus(response.jobId);
      
      // ❌ 제거: 여기서 바로 호출하지 않음
      // if (onUploadComplete) {
      //   onUploadComplete(response.jobId);
      // }
    } catch (err: any) {
      console.error('Upload error:', err);
      const errorMessage = err.response?.data?.message || err.message || '업로드 중 오류가 발생했습니다.';
      
      // 인증 오류인 경우 로그인 재시도
      if (errorMessage.includes('인증') || errorMessage.includes('토큰') || err.response?.status === 401) {
        setIsAuthenticated(false);
        try {
          await loginCreator();
          setIsAuthenticated(true);
          setError('인증 오류가 발생했습니다. 다시 시도해주세요.');
          console.log('재로그인 성공');
        } catch (loginErr) {
          setError('인증이 필요합니다. 페이지를 새로고침해주세요.');
        }
      } else {
        setError(errorMessage);
      }
      setStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const pollJobStatus = async (id: string) => {
    const maxAttempts = 60; // 최대 5분 (5초 간격)
    let attempts = 0;

    const checkStatus = async () => {
      try {
        console.log(`[Polling] Attempt ${attempts + 1}/${maxAttempts} - Checking job ${id}`);
        const statusData = await getJobStatus(id);
        
        if (statusData.status === 'completed') {
          console.log('✅ Job completed!');
          setStatus('completed');
          setJobId(id);
          
          // ✅ 추가: 변환 완료 후 콜백 호출
          if (onUploadComplete) {
            console.log('Calling onUploadComplete with jobId:', id);
            onUploadComplete(id);
          }
          return;
        } else if (statusData.status === 'failed') {
          setStatus('error');
          setError('변환 중 오류가 발생했습니다.');
          return;
        }

        // 아직 처리 중
        console.log(`⏳ Job still processing... (attempt ${attempts + 1})`);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000); // 5초마다 확인
        } else {
          setStatus('error');
          setError('변환 시간이 초과되었습니다.');
        }
      } catch (err) {
        console.error('Status check error:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        } else {
          setStatus('error');
          setError('상태 확인 중 오류가 발생했습니다.');
        }
      }
    };

    checkStatus();
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setJobId(null);
    setStatus('idle');
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="splat-uploader">
      <h3>2D 이미지를 .splat 파일로 변환</h3>
      
      <div className="upload-section">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        <button 
          type="button" 
          onClick={openFileDialog}
          className="select-files-btn"
          disabled={uploading || status === 'processing'}
        >
          이미지 선택
        </button>

        {selectedFiles.length > 0 && (
          <div className="selected-files">
            <p>선택된 파일: {selectedFiles.length}개</p>
            <ul>
              {selectedFiles.map((file, index) => (
                <li key={index}>{file.name}</li>
              ))}
            </ul>
          </div>
        )}

        {status === 'idle' && selectedFiles.length > 0 && (
          <button 
            type="button" 
            onClick={handleUpload}
            className="upload-btn"
          >
            업로드 및 변환 시작
          </button>
        )}

        {status === 'uploading' && (
          <div className="status-message">
            <p>업로드 중...</p>
          </div>
        )}

        {status === 'processing' && (
          <div className="status-message">
            <p>변환 처리 중... (잠시만 기다려주세요)</p>
            <div className="spinner"></div>
          </div>
        )}

        {status === 'completed' && jobId && (
          <div className="status-message success">
            <p>✅ 변환이 완료되었습니다!</p>
            <p>Job ID: {jobId}</p>
          </div>
        )}

        {status === 'error' && error && (
          <div className="status-message error">
            <p>❌ {error}</p>
          </div>
        )}

        {(status === 'completed' || status === 'error') && (
          <button 
            type="button" 
            onClick={handleReset}
            className="reset-btn"
          >
            새로 시작
          </button>
        )}
      </div>
    </div>
  );
}

export default SplatUploader;