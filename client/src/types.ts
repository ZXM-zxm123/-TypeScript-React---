export interface Keypoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseKeypoints {
  nose: Keypoint;
  left_eye_inner: Keypoint;
  left_eye: Keypoint;
  left_eye_outer: Keypoint;
  right_eye_inner: Keypoint;
  right_eye: Keypoint;
  right_eye_outer: Keypoint;
  left_ear: Keypoint;
  right_ear: Keypoint;
  mouth_left: Keypoint;
  mouth_right: Keypoint;
  left_shoulder: Keypoint;
  right_shoulder: Keypoint;
  left_elbow: Keypoint;
  right_elbow: Keypoint;
  left_wrist: Keypoint;
  right_wrist: Keypoint;
  left_pinky: Keypoint;
  right_pinky: Keypoint;
  left_index: Keypoint;
  right_index: Keypoint;
  left_thumb: Keypoint;
  right_thumb: Keypoint;
  left_hip: Keypoint;
  right_hip: Keypoint;
  left_knee: Keypoint;
  right_knee: Keypoint;
  left_ankle: Keypoint;
  right_ankle: Keypoint;
  left_heel: Keypoint;
  right_heel: Keypoint;
  left_foot_index: Keypoint;
  right_foot_index: Keypoint;
}

export interface ClothesItem {
  id: string;
  name: string;
  imageUrl: string;
}

export interface AppState {
  isCameraActive: boolean;
  isConnected: boolean;
  currentClothes: ClothesItem | null;
  clothesList: ClothesItem[];
  lastKeypoints: PoseKeypoints | null;
  isProcessing: boolean;
  cameraError: string | null;
}
