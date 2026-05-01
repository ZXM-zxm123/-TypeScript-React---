import { PoseKeypoints } from '../types';

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
  keypoints: PoseKeypoints,
  canvasWidth: number,
  canvasHeight: number,
  clothesImage: HTMLImageElement
): ClothesTransform {
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
  ctx.scale(transform.scaleX, transform.scaleY);
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
