import React, { useRef, useEffect, useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { WebSocketClient } from '../utils/websocket';
import { canvasToBlob, resizeImage, loadImage } from '../utils/image';
import { calculateClothesTransform, drawClothes } from '../utils/render';
import { PoseKeypoints } from '../types';
import styles from './CameraPreview.module.css';

const WS_URL = 'ws://localhost:8765';
const FRAME_INTERVAL = 100;
const MAX_FRAME_WIDTH = 640;
const MAX_FRAME_HEIGHT = 480;

interface CameraPreviewProps {
  // 组件属性
}

export function CameraPreview(_props: CameraPreviewProps): JSX.Element {
  const {
    isCameraActive,
    isConnected,
    setConnected,
    setKeypoints,
    setProcessing,
    currentClothes,
    lastKeypoints
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

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      initializeWebSocket();
    } catch (error) {
      console.error('Failed to start camera:', error);
      alert('无法访问摄像头，请确保已授权摄像头权限。');
    }
  }, [initializeWebSocket]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (wsClientRef.current) {
      wsClientRef.current.disconnect();
      wsClientRef.current = null;
    }

    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setConnected(false);
    setKeypoints(null);
  }, [setConnected, setKeypoints]);

  const sendFrame = useCallback(() => {
    if (!videoRef.current || !wsClientRef.current || !isConnected) {
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
    
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (lastKeypoints && clothesImageRef.current && currentClothes) {
      try {
        const transform = calculateClothesTransform(
          lastKeypoints,
          canvas.width,
          canvas.height,
          clothesImageRef.current
        );
        drawClothes(ctx, clothesImageRef.current, transform);
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

        {!isCameraActive && (
          <div className={styles.overlay}>
            点击下方按钮开启摄像头
          </div>
        )}

        {isCameraActive && (
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
