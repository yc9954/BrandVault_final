import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';
import './SplatViewer.css';

interface SplatViewerProps {
  jobId: string;
  onClose?: () => void;
}

// GLB 파일 로더
async function loadGLBFile(url: string): Promise<THREE.Group | null> {
  try {
    console.log('Loading GLB file from:', url);
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    console.log('GLB file loaded successfully');
    return gltf.scene;
  } catch (error: any) {
    console.error('Failed to load GLB file:', error);
    throw error;
  }
}

// .splat 파일 로더
async function loadSplatFile(url: string): Promise<THREE.BufferGeometry | null> {
  try {
    console.log('Loading splat file from:', url);
    const response = await fetch(url, {
      credentials: 'include',
      mode: 'cors',
    });
    
    console.log('Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error('Failed to load splat file:', response.status, errorText);
      throw new Error(`Failed to load splat file: ${response.status} ${errorText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('File loaded, size:', arrayBuffer.byteLength, 'bytes');
    
    if (arrayBuffer.byteLength === 0) {
      throw new Error('File is empty');
    }
    
    const data = new DataView(arrayBuffer);
    
    // 간단한 .splat 파일 파싱 (실제 형식에 맞게 수정 필요)
    let offset = 0;
    
    // 파일 크기 확인
    if (arrayBuffer.byteLength < 4) {
      throw new Error('File too small to contain header');
    }
    
    const numGaussians = data.getInt32(offset, true);
    console.log('Number of gaussians:', numGaussians);
    offset += 4;
    
    const positions: number[] = [];
    const colors: number[] = [];
    const scales: number[] = [];
    const rotations: number[] = [];
    
    // 각 가우시안 데이터 읽기
    const maxGaussians = Math.min(numGaussians, 10000); // 성능을 위해 제한
    const expectedSize = 4 + (maxGaussians * (12 + 16 + 12 + 16)); // 헤더 + 데이터
    
    if (arrayBuffer.byteLength < expectedSize) {
      console.warn(`File size (${arrayBuffer.byteLength}) is smaller than expected (${expectedSize}). Parsing available data.`);
    }
    
    for (let i = 0; i < maxGaussians; i++) {
      // 파일 끝 체크
      if (offset + 12 > arrayBuffer.byteLength) {
        console.warn(`Reached end of file at gaussian ${i} of ${maxGaussians}`);
        break;
      }
      
      // position (x, y, z)
      positions.push(
        data.getFloat32(offset, true),
        data.getFloat32(offset + 4, true),
        data.getFloat32(offset + 8, true)
      );
      offset += 12;
      
      // rotation (quaternion x, y, z, w)
      rotations.push(
        data.getFloat32(offset, true),
        data.getFloat32(offset + 4, true),
        data.getFloat32(offset + 8, true),
        data.getFloat32(offset + 12, true)
      );
      offset += 16;
      
      // scale (x, y, z)
      scales.push(
        data.getFloat32(offset, true),
        data.getFloat32(offset + 4, true),
        data.getFloat32(offset + 8, true)
      );
      offset += 12;
      
      // color (r, g, b, a)
      colors.push(
        data.getFloat32(offset, true),
        data.getFloat32(offset + 4, true),
        data.getFloat32(offset + 8, true),
        data.getFloat32(offset + 12, true)
      );
      offset += 16;
    }
    
    console.log(`Loaded ${positions.length / 3} gaussians`);
    
    if (positions.length === 0) {
      throw new Error('No gaussian data found in file');
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    
    console.log('Geometry created successfully');
    return geometry;
  } catch (error: any) {
    console.error('Failed to load splat file:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    throw error;
  }
}

// 3D 모델 렌더링 컴포넌트 (GLB 및 Splat 지원)
function ModelViewer({ url }: { url: string }) {
  const [model, setModel] = useState<THREE.Group | THREE.BufferGeometry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const meshRef = useRef<THREE.Group | THREE.Points>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    // URL에서 파일 확장자 확인
    const urlLower = url.toLowerCase();
    const isGLB = urlLower.includes('.glb');
    const isPLY = urlLower.includes('.ply');
    
    console.log('Loading model from:', url, 'Type:', isGLB ? 'GLB' : isPLY ? 'PLY' : 'SPLAT');

    const loadPromise = isGLB 
      ? loadGLBFile(url).then(group => group as any)
      : loadSplatFile(url).then(geom => geom as any);

    loadPromise
      .then((loadedModel) => {
        if (loadedModel) {
          setModel(loadedModel);
          setLoading(false);
        } else {
          setError('모델을 로드할 수 없습니다.');
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading model:', err);
        setError(`모델 로드 실패: ${err.message}`);
        setLoading(false);
      });
  }, [url]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001;
    }
  });

  if (loading) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>
    );
  }

  if (error || !model) {
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="red" />
      </mesh>
    );
  }

  // GLB 파일인 경우
  if (model instanceof THREE.Group) {
    return <primitive object={model} ref={meshRef} />;
  }

  // Splat 파일인 경우 (BufferGeometry)
  return (
    <points ref={meshRef as any} geometry={model}>
      <pointsMaterial
        size={0.05}
        vertexColors
        transparent
        opacity={0.8}
      />
    </points>
  );
}

function SplatViewer({ jobId, onClose }: SplatViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';
    
    // GLB, PLY, SPLAT 순서로 파일 존재 확인
    // 먼저 정적 파일 서빙 경로로 시도 (인증 불필요)
    const fileExtensions = ['glb', 'ply', 'splat'];
    let checkedCount = 0;
    
    const checkFiles = async () => {
      // 1. 정적 파일 서빙 경로 시도 (우선)
      for (const ext of fileExtensions) {
        try {
          const staticUrl = `${apiUrl}/splats/${jobId}.${ext}`;
          console.log(`Checking static file: ${staticUrl}`);
          
          const response = await fetch(staticUrl, {
            method: 'GET',
            credentials: 'include',
          });
          
          if (response.ok) {
            console.log(`Found static file: ${ext}`);
            setUrl(staticUrl);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn(`Failed to check static ${ext} file:`, err);
        }
        checkedCount++;
      }
      
      // 2. API 스트리밍 경로 시도 (폴백)
      checkedCount = 0;
      for (const ext of fileExtensions) {
        try {
          const apiUrl_path = `${apiUrl}/api/splat/stream/${jobId}.${ext}`;
          console.log(`Checking API file: ${apiUrl_path}`);
          
          const response = await fetch(apiUrl_path, {
            method: 'GET',
            credentials: 'include',
          });
          
          if (response.ok) {
            console.log(`Found API file: ${ext}`);
            setUrl(apiUrl_path);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn(`Failed to check API ${ext} file:`, err);
        }
        checkedCount++;
      }
      
      // 모든 파일을 확인했는데 없으면 에러
      if (checkedCount === fileExtensions.length) {
        setError('3D 파일을 찾을 수 없습니다. 변환이 아직 완료되지 않았을 수 있습니다.');
        setLoading(false);
      }
    };
    
    checkFiles();
  }, [jobId]);

  return (
    <div className="splat-viewer-container">
      <div className="viewer-header">
        <h2>Splat Viewer</h2>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </div>
      
      <div className="viewer-content">
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>로딩 중...</p>
          </div>
        )}
        
        {error && (
          <div className="error">
            <p>{error}</p>
          </div>
        )}
        
        {url && !loading && !error && (
          <Canvas
            style={{ width: '100%', height: '100%' }}
            gl={{ antialias: true, alpha: true }}
          >
            <PerspectiveCamera makeDefault position={[0, 0, 5]} />
            <OrbitControls enableDamping dampingFactor={0.05} />
            
            {/* 전체적인 밝기 */}
            <ambientLight intensity={2} />
            
            {/* 앞쪽 조명 */}
            <directionalLight position={[10, 10, 5]} intensity={2} />
            <directionalLight position={[-10, 10, 5]} intensity={1} />
            <directionalLight position={[0, 10, 8]} intensity={1.5} />
            
            {/* 뒤쪽 조명 (강화) */}
            <directionalLight position={[0, 10, -8]} intensity={2} />
            <directionalLight position={[10, 5, -10]} intensity={1.5} />
            <directionalLight position={[-10, 5, -10]} intensity={1.5} />
            <directionalLight position={[0, 0, -15]} intensity={1.2} />
            
            {/* 아래쪽 조명 (바퀴 부분) */}
            <directionalLight position={[0, -10, 0]} intensity={1.5} />
            <directionalLight position={[5, -5, 5]} intensity={1} />
            <directionalLight position={[-5, -5, -5]} intensity={1} />
            
            {/* 측면 조명 */}
            <pointLight position={[10, 0, 10]} intensity={1.5} />
            <pointLight position={[-10, 0, -10]} intensity={1.5} />
            <pointLight position={[0, 0, 10]} intensity={1} />
            <pointLight position={[0, 0, -10]} intensity={1.5} />
            
            {/* 뒤쪽 포인트 조명 추가 */}
            <pointLight position={[5, 3, -8]} intensity={1.5} />
            <pointLight position={[-5, 3, -8]} intensity={1.5} />
            
            {/* 하늘/땅 조명 */}
            <hemisphereLight args={['#ffffff', '#888888', 1.5]} />
            
            <ModelViewer url={url} />
            <gridHelper args={[10, 10]} />
          </Canvas>
        )}
      </div>
    </div>
  );
}

export default SplatViewer;