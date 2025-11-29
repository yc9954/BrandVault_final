import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getVideoInsertionStatus } from '../../api/videoInsertApi';
import { fetchProjectById } from '../../api/productApi';
import styles from './ProjectProgress.module.css';

function ProjectProgress() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('jobId');
  const navigate = useNavigate();
  
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);

  // 작업 상태 SSE 연결
  useEffect(() => {
    if (!jobId) {
      // jobId가 없으면 DB에서 직접 progress 가져오기
      if (id) {
        const loadProgress = async () => {
          try {
            const response = await fetchProjectById(parseInt(id));
            if (response.data.status && response.data.progress !== undefined) {
              setStatus(response.data.status as 'pending' | 'processing' | 'completed' | 'failed');
              setProgress(response.data.progress || 0);
            }
          } catch (err) {
            console.error('프로젝트 진행률 로드 실패:', err);
          }
        };
        loadProgress();
      }
      return;
    }

    const sseUrl = `${process.env.REACT_APP_API_URL}/api/video-insertion/status/${jobId}`;
    console.log(`[ProjectProgress] SSE 연결 시도: jobId=${jobId}, URL=${sseUrl}`);

    const eventSource = new EventSource(sseUrl, { withCredentials: true });

    eventSource.onopen = () => {
      console.log(`[ProjectProgress] SSE 연결 성공: jobId=${jobId}`);
    };

    eventSource.onmessage = (event) => {
      try {
        console.log(`[ProjectProgress] 메시지 수신:`, event.data);
        const data = JSON.parse(event.data);
        setStatus(data.status);
        setProgress(data.progress || 0);

        if (data.status === 'completed') {
          // 완료 시 프로젝트 상세 페이지로 이동
          setTimeout(() => {
            navigate(`/creator/project/${id}`);
          }, 2000);
        } else if (data.status === 'failed') {
          setError(data.error || '작업이 실패했습니다.');
        }
      } catch (err) {
        console.error('[ProjectProgress] 메시지 파싱 실패:', err, '원본 데이터:', event.data);
      }
    };

    eventSource.onerror = (err) => {
      console.error(`[ProjectProgress] SSE 연결 오류: jobId=${jobId}`, {
        error: err,
        readyState: eventSource.readyState,
      });
      
      // 연결 실패 시 DB에서 직접 가져오기
      if (eventSource.readyState === EventSource.CLOSED && id) {
        const loadProgress = async () => {
          try {
            const response = await fetchProjectById(parseInt(id));
            if (response.data.status && response.data.progress !== undefined) {
              setStatus(response.data.status as 'pending' | 'processing' | 'completed' | 'failed');
              setProgress(response.data.progress || 0);
            }
          } catch (err) {
            console.error('프로젝트 진행률 로드 실패:', err);
          }
        };
        loadProgress();
      }
    };

    return () => {
      console.log(`[ProjectProgress] SSE 연결 종료: jobId=${jobId}`);
      eventSource.close();
    };
  }, [jobId, id, navigate]);

  // 프로젝트 정보 로드 (초기 진행률도 함께)
  useEffect(() => {
    if (!id) return;

    const loadProject = async () => {
      try {
        const response = await fetchProjectById(parseInt(id));
        setProject(response.data);
        
        // 초기 진행률 설정 (jobId가 없거나 SSE 연결 전에 표시)
        if (response.data.status && response.data.progress !== undefined) {
          setStatus(response.data.status as 'pending' | 'processing' | 'completed' | 'failed');
          setProgress(response.data.progress || 0);
        }
      } catch (err) {
        console.error('프로젝트 로드 실패:', err);
      }
    };

    loadProject();
  }, [id]);

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return '대기 중...';
      case 'processing':
        return '처리 중...';
      case 'completed':
        return '완료!';
      case 'failed':
        return '실패';
      default:
        return '알 수 없음';
    }
  };

  const getStatusMessage = () => {
    if (status === 'processing') {
      if (progress < 15) return '비디오 파일 준비 중...';
      if (progress < 25) return '이미지 다운로드 중...';
      if (progress < 35) return '마스크 생성 중...';
      if (progress < 50) return '프레임 편집 중...';
      if (progress < 70) return '비디오 생성 중...';
      if (progress < 90) return '최종 처리 중...';
      return '거의 완료되었습니다...';
    }
    if (status === 'completed') return '비디오 삽입이 완료되었습니다!';
    if (status === 'failed') return error || '작업이 실패했습니다.';
    return '작업을 시작합니다...';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {project?.project_name || '프로젝트 제작 중'}
        </h1>
      </div>

      <div className={styles.content}>
        <div className={styles.progressCard}>
          <div className={styles.progressHeader}>
            <h2 className={styles.progressTitle}>제작 진행 상황</h2>
            <div className={styles.statusBadge} data-status={status}>
              {getStatusText()}
            </div>
          </div>

          <div className={styles.progressBarContainer}>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${progress}%` }}
                data-status={status}
              />
            </div>
            <div className={styles.progressText}>
              {progress}%
            </div>
          </div>

          <p className={styles.statusMessage}>{getStatusMessage()}</p>

          {error && status === 'failed' && (
            <div className={styles.errorBox}>
              <p className={styles.errorText}>{error}</p>
              <button 
                onClick={() => navigate('/creator/projects')}
                className={styles.errorButton}
              >
                프로젝트 목록으로
              </button>
            </div>
          )}

          {status === 'completed' && (
            <div className={styles.successBox}>
              <p className={styles.successText}>제작이 완료되었습니다!</p>
              <p className={styles.redirectText}>잠시 후 프로젝트 상세 페이지로 이동합니다...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProjectProgress;

