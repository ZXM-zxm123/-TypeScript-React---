import React, { useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { WebSocketClient } from '../utils/websocket';
import { canvasToBlob, resizeImage, loadImage } from '../utils/image';
import { calculateClothesTransform, drawClothes } from '../utils/render';
import styles from './CameraPreview.module.css';

const WS_URL = 'ws://localhost:8765';
const FRAME_INTERVAL = 100;
const MAX_FRAME_WIDTH = 640;
const MAX_FRAME_HEIGHT = 480;

type CameraErrorType = 'denied' | 'hardware' | 'in_use' | 'unknown';

interface CameraErrorInfo {
  type: CameraErrorType;
  message: string;
  suggestion: string;
}

function getCameraErrorInfo(error: Error): CameraErrorInfo {
  const errorName = error.name || error.constructor.name;
  const errorMessage = error.message || String(error);

  if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
    return {
      type: 'denied',
      message: '摄像头权限被拒绝',
      suggestion: '请在浏览器设置中允许访问摄像头，然后刷新页面重试'
    };
  }

  if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
    return {
      type: 'hardware',
      message: '未找到摄像头设备',
      suggestion: '请确保设备已正确连接，然后刷新页面重试'
    };
  }

  if (errorName === 'NotReadableError' || errorName === 'TrackStartError' || errorMessage.includes('in use')) {
    return {
      type: 'in_use',
      message: '摄像头被其他应用占用',
      suggestion: '请关闭其他正在使用摄像头的应用（如其他浏览器标签、视频通话软件等），然后重试'
    };
  }

  return {
    type: 'unknown',
    message: `摄像头初始化失败: ${errorMessage}`,
    suggestion: '请检查摄像头是否正常工作，或尝试刷新页面重试'
  };
}

export function CameraPreview(): JSX.Element {
  const {
    isCameraActive,
    isConnected,
    setConnected,
    setKeypoints,
    setProcessing,
    setCameraError,
    toggleCamera,
    currentClothes,
    lastKeypoints,
    cameraError
  } = useAppContext();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const clothesImageRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const initializeWebSocket = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
    }

    wsClientRef.current = new WebSocketClient(WS_URL, {
      onOpen: () => {
        setConnected(true);
        console.log('WebSocket connected');
      },
      onClose: () => {
        setConnected(false);
        console.log('WebSocket disconnected');
      },
      onError: (error) => {
        console.error('WebSocket error:', error);
      },
      onMessage: (data) => {
        setProcessing(false);
        if (data.keypoints) {
          setKeypoints(data.keypoints);
        }
      }
    });

    wsClientRef.current.connect();
  }, [setConnected, setKeypoints, setProcessing]);

  const loadClothesImage = useCallback(async () => {
    if (!currentClothes) {
      clothesImageRef.current = null;
      return;
    }

    try {
      const img = await loadImage(currentClothes.imageUrl);
      clothesImageRef.current = img;
    } catch (error) {
      console.error('Failed to load clothes image:', error);
      clothesImageRef.current = null;
    }
  }, [currentClothes]);

  const cleanupCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const cleanupWebSocket = useCallback(() => {
    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }
  }, []);

  const cleanupIntervals = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    cleanupCamera();
    cleanupWebSocket();
    cleanupIntervals();
    setCameraError(null);
    setConnected(false);
    setKeypoints(null);
  }, [cleanupCamera, cleanupWebSocket, cleanupIntervals, setCameraError, setConnected, setKeypoints]);

  const startCamera = useCallback(async () => {
    setCameraError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const errorInfo: CameraErrorInfo = {
        type: 'unknown',
        message: '您的浏览器不支持摄像头访问',
        suggestion: '请使用现代浏览器（如 Chrome、Firefox、Edge、Safari）并确保访问的是 HTTPS 或 localhost'
      };
      setCameraError(errorInfo.message);
      toggleCamera(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error('Video element not found'));
            return;
          }

          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().then(() => {
              resolve();
            }).catch(reject);
          };

          videoRef.current.onerror = () => {
            reject(new Error('Video element error'));
          };

          setTimeout(() => {
            if (videoRef.current && videoRef.current.readyState < 2) {
              reject(new Error('Video loading timeout'));
            }
          }, 5000);
        });
      }

      initializeWebSocket();
    } catch (error) {
      const errorInfo = getCameraErrorInfo(error as Error);
      console.error('Camera initialization failed:', errorInfo);
      setCameraError(errorInfo.message);
      cleanupCamera();
      toggleCamera(false);
    }
  }, [initializeWebSocket, cleanupCamera, setCameraError, toggleCamera]);

  const sendFrame = useCallback(() => {
    if (!videoRef.current || !wsClientRef.current || !isConnected) {
      return;
    }

    if (videoRef.current.readyState < 2) {
      return;
    }

    try {
      const resizedCanvas = resizeImage(
        videoRef.current,
        MAX_FRAME_WIDTH,
        MAX_FRAME_HEIGHT
      );

      canvasToBlob(resizedCanvas).then((blob) => {
        if (wsClientRef.current?.isConnected()) {
          setProcessing(true);
          wsClientRef.current.sendFrame(blob);
        }
      });
    } catch (error) {
      console.error('Failed to send frame:', error);
    }
  }, [isConnected, setProcessing]);

  const renderLoop = useCallback(() => {
    if (!canvasRef.current || !videoRef.current) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    const video = videoRef.current;

    if (video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(renderLoop);
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (lastKeypoints && clothesImageRef.current && currentClothes) {
      try {
        const transform = calculateClothesTransform(
          lastKeypoints,
          canvas.width,
          canvas.height,
          clothesImageRef.current
        );

        ctx.save();
        const centerX = canvas.width / 2;
        ctx.translate(centerX, 0);
        ctx.scale(-1, 1);
        ctx.translate(-centerX, 0);
        drawClothes(ctx, clothesImageRef.current, transform);
        ctx.restore();
      } catch (error) {
        console.error('Failed to render clothes:', error);
      }
    }

    animationFrameRef.current = requestAnimationFrame(renderLoop);
  }, [lastKeypoints, currentClothes]);

  useEffect(() => {
    loadClothesImage();
  }, [loadClothesImage]);

  useEffect(() => {
    if (isCameraActive) {
      startCamera().then(() => {
        frameIntervalRef.current = window.setInterval(sendFrame, FRAME_INTERVAL);
        animationFrameRef.current = requestAnimationFrame(renderLoop);
      }).catch(() => {
        stopCamera();
      });
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isCameraActive, startCamera, stopCamera, sendFrame, renderLoop]);

  return (
    <div className={styles.container}>
      <div className={styles.videoContainer}>
        <video
          ref={videoRef}
          className={styles.videoElement}
          playsInline
          muted
          style={{ display: 'none' }}
        />

        <canvas
          ref={canvasRef}
          className={styles.canvasElement}
        />

        {!isCameraActive && !cameraError && (
          <div className={styles.overlay}>
            点击下方按钮开启摄像头
          </div>
        )}

        {cameraError && (
          <div className={styles.errorOverlay}>
            <div className={styles.errorIcon}>⚠️</div>
            <div className={styles.errorMessage}>{cameraError}</div>
            <div className={styles.errorSuggestion}>
              {cameraError.includes('权限') && '请在浏览器设置中允许摄像头权限，然后刷新页面'}
              {cameraError.includes('占用') && '请关闭其他使用摄像头的应用后刷新重试'}
              {cameraError.includes('不支持') && '请使用 Chrome、Firefox 等现代浏览器'}
              {(!cameraError.includes('权限') && !cameraError.includes('占用') && !cameraError.includes('不支持')) && '请检查摄像头连接后刷新页面重试'}
            </div>
            <button
              className={styles.retryButton}
              onClick={() => {
                toggleCamera(true);
              }}
            >
              重试
            </button>
          </div>
        )}

        {isCameraActive && !cameraError && (
          <div className={styles.statusBar}>
            <div className={styles.statusItem}>
              <span
                className={`${styles.statusDot} ${
                  isConnected ? styles.statusDotConnected : styles.statusDotDisconnected
                }`}
              />
              <span>{isConnected ? '已连接' : '未连接'}</span>
            </div>
            <div className={styles.statusItem}>
              <span
                className={`${styles.statusDot} ${
                  isConnected && lastKeypoints ? styles.statusDotProcessing : styles.statusDotDisconnected
                }`}
              />
              <span>{lastKeypoints ? '检测中' : '等待检测'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}