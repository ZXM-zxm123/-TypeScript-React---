import React from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { CameraPreview } from './components/CameraPreview';
import { ClothesSelector } from './components/ClothesSelector';
import styles from './App.module.css';

function MainApp(): JSX.Element {
  const { isCameraActive, toggleCamera, isConnected, lastKeypoints } = useAppContext();

  return (
    <div className={styles.app}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>虚拟试衣系统</h1>
          <p className={styles.subtitle}>
            使用 AI 姿态检测技术，实时体验不同衣服的穿搭效果
          </p>
        </header>

        <div className={styles.statusCard}>
          <div className={styles.statusItem}>
            <span
              className={`${styles.statusDot} ${
                isCameraActive ? styles.statusDotActive : styles.statusDotInactive
              }`}
            />
            <span>摄像头: {isCameraActive ? '已开启' : '已关闭'}</span>
          </div>
          <div className={styles.statusItem}>
            <span
              className={`${styles.statusDot} ${
                isConnected ? styles.statusDotActive : styles.statusDotInactive
              }`}
            />
            <span>后端连接: {isConnected ? '已连接' : '未连接'}</span>
          </div>
          <div className={styles.statusItem}>
            <span
              className={`${styles.statusDot} ${
                lastKeypoints ? styles.statusDotActive : styles.statusDotInactive
              }`}
            />
            <span>姿态检测: {lastKeypoints ? '检测中' : '未检测'}</span>
          </div>
        </div>

        <CameraPreview />

        <div className={styles.controls}>
          {!isCameraActive ? (
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={() => toggleCamera(true)}
            >
              <span>📷</span>
              开启摄像头
            </button>
          ) : (
            <button
              className={`${styles.button} ${styles.buttonDanger}`}
              onClick={() => toggleCamera(false)}
            >
              <span>⏹️</span>
              关闭摄像头
            </button>
          )}
        </div>

        <ClothesSelector />

        <footer className={styles.footer}>
          <p>提示：请确保后端服务已启动，并允许浏览器访问摄像头权限</p>
        </footer>
      </div>
    </div>
  );
}

export function App(): JSX.Element {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}

export default App;
