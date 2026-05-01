import asyncio
import websockets
import json
import cv2
import numpy as np
from io import BytesIO
from PIL import Image
import mediapipe as mp

class PoseDetector:
    def __init__(self):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_draw = mp.solutions.drawing_utils

    def process_frame(self, frame: np.ndarray) -> dict | None:
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb_frame)
        
        if not results.pose_landmarks:
            return None
        
        keypoints = {}
        landmark_names = [
            'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
            'right_eye_inner', 'right_eye', 'right_eye_outer',
            'left_ear', 'right_ear', 'mouth_left', 'mouth_right',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_pinky', 'right_pinky',
            'left_index', 'right_index', 'left_thumb', 'right_thumb',
            'left_hip', 'right_hip', 'left_knee', 'right_knee',
            'left_ankle', 'right_ankle', 'left_heel', 'right_heel',
            'left_foot_index', 'right_foot_index'
        ]
        
        h, w = frame.shape[:2]
        for idx, landmark in enumerate(results.pose_landmarks.landmark):
            if idx < len(landmark_names):
                keypoints[landmark_names[idx]] = {
                    'x': landmark.x,
                    'y': landmark.y,
                    'z': landmark.z,
                    'visibility': landmark.visibility
                }
        
        return keypoints

    def close(self):
        self.pose.close()

async def process_frame(websocket, frame_data: bytes, detector: PoseDetector):
    try:
        image = Image.open(BytesIO(frame_data))
        frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        keypoints = detector.process_frame(frame)
        
        response = {
            'keypoints': keypoints,
            'message': 'Pose detected' if keypoints else 'No pose detected'
        }
        
        await websocket.send(json.dumps(response))
        
    except Exception as e:
        error_response = {
            'keypoints': None,
            'message': f'Error processing frame: {str(e)}'
        }
        await websocket.send(json.dumps(error_response))

async def websocket_handler(websocket, path):
    detector = PoseDetector()
    print(f'Client connected from {websocket.remote_address}')
    
    try:
        async for message in websocket:
            if isinstance(message, bytes):
                await process_frame(websocket, message, detector)
            else:
                response = {
                    'keypoints': None,
                    'message': 'Expected binary frame data'
                }
                await websocket.send(json.dumps(response))
    except websockets.exceptions.ConnectionClosed:
        print(f'Client {websocket.remote_address} disconnected')
    finally:
        detector.close()

async def main():
    host = 'localhost'
    port = 8765
    
    async with websockets.serve(websocket_handler, host, port):
        print(f'WebSocket server started on ws://{host}:{port}')
        print('Waiting for connections...')
        await asyncio.Future()

if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print('\nServer stopped by user')
