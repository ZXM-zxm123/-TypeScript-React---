import React, { createContext, useContext, useReducer, ReactNode, useCallback } from 'react';
import { AppState, ClothesItem, PoseKeypoints } from '../types';

const CLOTHES_LIST: ClothesItem[] = [
  {
    id: 'tshirt-red',
    name: '红色T恤',
    imageUrl: '/clothes/tshirt-red.svg'
  },
  {
    id: 'tshirt-blue',
    name: '蓝色T恤',
    imageUrl: '/clothes/tshirt-blue.svg'
  },
  {
    id: 'tshirt-green',
    name: '绿色T恤',
    imageUrl: '/clothes/tshirt-green.svg'
  }
];

const INITIAL_STATE: AppState = {
  isCameraActive: false,
  isConnected: false,
  currentClothes: CLOTHES_LIST[0],
  clothesList: CLOTHES_LIST,
  lastKeypoints: null,
  isProcessing: false,
  cameraError: null
};

type Action =
  | { type: 'TOGGLE_CAMERA'; payload: boolean }
  | { type: 'SET_CONNECTED'; payload: boolean }
  | { type: 'SET_CURRENT_CLOTHES'; payload: ClothesItem }
  | { type: 'SET_KEYPOINTS'; payload: PoseKeypoints | null }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_CAMERA_ERROR'; payload: string | null };

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'TOGGLE_CAMERA':
      return { ...state, isCameraActive: action.payload };
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.payload };
    case 'SET_CURRENT_CLOTHES':
      return { ...state, currentClothes: action.payload };
    case 'SET_KEYPOINTS':
      return { ...state, lastKeypoints: action.payload };
    case 'SET_PROCESSING':
      return { ...state, isProcessing: action.payload };
    case 'SET_CAMERA_ERROR':
      return { ...state, cameraError: action.payload };
    default:
      return state;
  }
}

interface AppContextType extends AppState {
  toggleCamera: (active: boolean) => void;
  setConnected: (connected: boolean) => void;
  setCurrentClothes: (clothes: ClothesItem) => void;
  setKeypoints: (keypoints: PoseKeypoints | null) => void;
  setProcessing: (processing: boolean) => void;
  setCameraError: (error: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE);

  const toggleCamera = useCallback((active: boolean) => {
    dispatch({ type: 'TOGGLE_CAMERA', payload: active });
  }, []);

  const setConnected = useCallback((connected: boolean) => {
    dispatch({ type: 'SET_CONNECTED', payload: connected });
  }, []);

  const setCurrentClothes = useCallback((clothes: ClothesItem) => {
    dispatch({ type: 'SET_CURRENT_CLOTHES', payload: clothes });
  }, []);

  const setKeypoints = useCallback((keypoints: PoseKeypoints | null) => {
    dispatch({ type: 'SET_KEYPOINTS', payload: keypoints });
  }, []);

  const setProcessing = useCallback((processing: boolean) => {
    dispatch({ type: 'SET_PROCESSING', payload: processing });
  }, []);

  const setCameraError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_CAMERA_ERROR', payload: error });
  }, []);

  const value: AppContextType = {
    ...state,
    toggleCamera,
    setConnected,
    setCurrentClothes,
    setKeypoints,
    setProcessing,
    setCameraError
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
