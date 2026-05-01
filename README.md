# -TypeScript-React---
前端使用 React + TypeScript 获取摄像头流，通过 WebSocket 发送帧到 Python 后端。Python 使用 MediaPipe 检测人体关键点（肩膀、躯干等），返回坐标。前端根据坐标在 Canvas 上绘制衣服图片（可使用 C++ 加速渲染，通过 WebAssembly 或单独的 WebSocket 推送合成帧）。C++ 模块可选（用于高性能图像变形）。简化：Python 直接返回关键点，前端进行 2D 纹理映射。实现至少三套衣服切换。输出前端和 Python 代码，C++ 可选。
