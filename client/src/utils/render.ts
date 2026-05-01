import { PoseKeypoints } from '../types';

function mirrorKeypointX(keypoint: { x: number; y: number }): { x: number; y: number } {
  return {
    x: 1 - keypoint.x,
    y: keypoint.y
  };
}

function mirrorPoseKeypoints(keypoints: PoseKeypoints): PoseKeypoints {
  const mirrored = { ...keypoints };

  const pairs = [
    ['left_shoulder', 'right_shoulder'],
    ['left_hip', 'right_hip'],
    ['left_elbow', 'right_elbow'],
    ['left_wrist', 'right_wrist'],
    ['left_eye', 'right_eye'],
    ['left_ear', 'right_ear']
  ];

  pairs.forEach(([leftKey, rightKey]) => {
    const temp = mirrored[leftKey as keyof PoseKeypoints];
    mirrored[leftKey as keyof PoseKeypoints] = mirrorKeypointX(
      mirrored[rightKey as keyof PoseKeypoints] as { x: number; y: number }
    );
    mirrored[rightKey as keyof PoseKeypoints] = mirrorKeypointX(
      temp as { x: number; y: number }
    );
  });

  const singleKeys = [
    'nose',
    'left_eye_inner',
    'right_eye_inner',
    'left_eye_outer',
    'right_eye_outer',
    'mouth_left',
    'mouth_right',
    'left_pinky',
    'right_pinky',
    'left_index',
    'right_index',
    'left_thumb',
    'right_thumb',
    'left_knee',
    'right_knee',
    'left_ankle',
    'right_ankle',
    'left_heel',
    'right_heel',
    'left_foot_index',
    'right_foot_index'
  ];

  singleKeys.forEach((key) => {
    if (key in mirrored) {
      const kp = mirrored[key as keyof PoseKeypoints];
      if (kp) {
        (mirrored as any)[key] = mirrorKeypointX(kp);
      }
    }
  });

  return mirrored;
}

export function calculateShoulderDistance(keypoints: PoseKeypoints): number {
  const leftShoulder = keypoints.left_shoulder;
  const rightShoulder = keypoints.right_shoulder;

  return Math.sqrt(
    Math.pow(rightShoulder.x - leftShoulder.x, 2) +
    Math.pow(rightShoulder.y - leftShoulder.y, 2)
  );
}

export function calculateShoulderMidpoint(keypoints: PoseKeypoints): { x: number; y: number } {
  const leftShoulder = keypoints.left_shoulder;
  const rightShoulder = keypoints.right_shoulder;

  return {
    x: (leftShoulder.x + rightShoulder.x) / 2,
    y: (leftShoulder.y + rightShoulder.y) / 2
  };
}

export function calculateHipMidpoint(keypoints: PoseKeypoints): { x: number; y: number } {
  const leftHip = keypoints.left_hip;
  const rightHip = keypoints.right_hip;

  return {
    x: (leftHip.x + rightHip.x) / 2,
    y: (leftHip.y + rightHip.y) / 2
  };
}

export function calculateTorsoAngle(keypoints: PoseKeypoints): number {
  const leftShoulder = keypoints.left_shoulder;
  const rightShoulder = keypoints.right_shoulder;

  const dx = rightShoulder.x - leftShoulder.x;
  const dy = rightShoulder.y - leftShoulder.y;

  return Math.atan2(dy, dx);
}

export interface ClothesTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export function calculateClothesTransform(
  originalKeypoints: PoseKeypoints,
  canvasWidth: number,
  canvasHeight: number,
  clothesImage: HTMLImageElement
): ClothesTransform {
  const keypoints = mirrorPoseKeypoints(originalKeypoints);
  const shoulderMid = calculateShoulderMidpoint(keypoints);
  const hipMid = calculateHipMidpoint(keypoints);
  const shoulderDistance = calculateShoulderDistance(keypoints);
  const angle = calculateTorsoAngle(keypoints);

  const actualShoulderMid = {
    x: shoulderMid.x * canvasWidth,
    y: shoulderMid.y * canvasHeight
  };

  const actualShoulderDistance = shoulderDistance * canvasWidth;
  const torsoHeight = (hipMid.y - shoulderMid.y) * canvasHeight;

  const aspectRatio = clothesImage.width / clothesImage.height;

  let width: number;
  let height: number;

  if (actualShoulderDistance > 0) {
    width = actualShoulderDistance * 1.8;
    height = width / aspectRatio;
  } else {
    width = 200;
    height = 300;
  }

  const x = actualShoulderMid.x - width / 2;
  const y = actualShoulderMid.y - height * 0.2;

  return {
    x,
    y,
    width,
    height,
    rotation: angle,
    scaleX: 1,
    scaleY: 1
  };
}

export function drawClothes(
  ctx: CanvasRenderingContext2D,
  clothesImage: HTMLImageElement,
  transform: ClothesTransform
): void {
  ctx.save();

  const centerX = transform.x + transform.width / 2;
  const centerY = transform.y + transform.height / 2;

  ctx.translate(centerX, centerY);
  ctx.rotate(transform.rotation);
  ctx.scale(-1, transform.scaleY);
  ctx.translate(-centerX, -centerY);

  ctx.drawImage(
    clothesImage,
    transform.x,
    transform.y,
    transform.width,
    transform.height
  );

  ctx.restore();
}
