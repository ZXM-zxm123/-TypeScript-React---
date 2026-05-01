# 虚拟试衣系统

基于 React + TypeScript + Python WebSocket + MediaPipe 的实时虚拟试衣系统。

## 项目结构

```
├── client/                 # 前端 React + TypeScript 项目
│   ├── src/
│   │   ├── components/    # React 组件
│   │   │   ├── CameraPreview.tsx    # 摄像头预览和渲染组件
│   │   │   └── ClothesSelector.tsx  # 衣服选择器组件
│   │   ├── context/        # React Context 状态管理
│   │   │   └── AppContext.tsx
│   │   ├── utils/          # 工具函数
│   │   │   ├── image.ts    # 图像处理工具
│   │   │   ├── render.ts   # 渲染计算工具
│   │   │   └── websocket.ts # WebSocket 客户端
│   │   ├── types.ts        # TypeScript 类型定义
│   │   ├── App.tsx         # 主应用组件
│   │   └── main.tsx        # 入口文件
│   ├── public/
│   │   └── clothes/        # 衣服图片资源
│   │       ├── tshirt-red.svg
│   │       ├── tshirt-blue.svg
│   │       └── tshirt-green.svg
│   └── package.json
│
└── server/                 # 后端 Python 项目
    ├── server.py           # WebSocket 服务器和 MediaPipe 姿态检测
    └── requirements.txt    # Python 依赖
```

## 功能特性

- 实时摄像头画面获取
- WebSocket 实时通信
- MediaPipe 人体姿态关键点检测（33个关键点）
- Canvas 2D 纹理映射渲染衣服
- 三套衣服切换功能
- 响应式设计

## 技术栈

### 前端
- React 18
- TypeScript
- Vite
- CSS Modules

### 后端
- Python 3.8+
- WebSockets (websockets 库)
- MediaPipe
- OpenCV
- NumPy
- Pillow

## 安装和运行

### 前端安装

```bash
cd client
npm install
npm run dev
```

前端将在 http://localhost:3000 启动。

### 后端安装

```bash
cd server
pip install -r requirements.txt
python server.py
```

后端将在 ws://localhost:8765 启动 WebSocket 服务。

## 使用说明

1. 确保后端服务已启动（Python server.py）
2. 启动前端开发服务器
3. 打开浏览器访问 http://localhost:3000
4. 点击"开启摄像头"按钮授权摄像头权限
5. 等待 WebSocket 连接成功后，站立在摄像头前
6. 系统将自动检测人体姿态并渲染衣服
7. 点击下方衣服卡片切换不同款式

## 工作流程

1. 前端通过 `getUserMedia` 获取摄像头视频流
2. 定时将视频帧压缩为 JPEG 格式通过 WebSocket 发送到后端
3. 后端使用 MediaPipe Pose 检测人体 33 个关键点
4. 后端将关键点坐标（归一化 0-1）通过 WebSocket 返回前端
5. 前端根据关键点计算衣服变换参数（位置、宽度、高度、角度）
6. Canvas 渲染层叠画衣服图片，实现虚拟试穿效果

## 关键点说明

MediaPipe 返回的 33 个人体关键点包括：

- 面部：鼻子、眼睛、耳朵、嘴巴
- 上肢：肩膀、手肘、手腕
- 躯干：髋部
- 下肢：膝盖、脚踝、脚跟、脚趾

衣服渲染主要使用肩膀和髋部关键点：
- `left_shoulder` / `right_shoulder`：肩膀位置，决定衣服宽度和位置
- `left_hip` / `right_hip`：髋部位置，决定衣服下边缘

## 添加自定义衣服

将衣服图片放入 `client/public/clothes/` 目录，然后在 `client/src/context/AppContext.tsx` 的 `CLOTHES_LIST` 数组中添加新条目：

```typescript
{
  id: 'clothes-id',
  name: '衣服名称',
  imageUrl: '/clothes/your-image.png'
}
```

## 注意事项

- 衣服图片推荐使用透明背景 PNG 格式以获得最佳效果
- 当前版本衣服为简单的 2D 贴图，未来可升级为更复杂的变形算法
- WebSocket 连接默认每 100ms 发送一帧，可根据网络状况调整
