// services/nodeLogic/types.ts

import { GraphNode, SimulatedGameObject, Connection, Scene, CameraState, GameObjectType, Vector2 } from "../../types";

interface VideoState {
    assetId: string;
    nodeId: string;
    isPlaying: boolean;
    loop: boolean;
    volume: number;
}

export interface CountdownState {
    nodeId: string;
    targetId: string;
    endTime: number;
    duration: number;
    isFinished: boolean;
}

export interface NodeExecutionContext {
    engine: {
        loadScene: (sceneId: string) => void;
        pause: () => void;
        resume: () => void;
        togglePause: () => void;
        spawnGameObject?: (type: GameObjectType, position: Vector2) => SimulatedGameObject;
    },
    nodes: GraphNode[];
    connections: Connection[];
    gameObjects: SimulatedGameObject[];
    keyboardState: Record<string, boolean>;
    audioPlayers: Map<string, HTMLAudioElement>;
    musicChannels: Map<number, HTMLAudioElement>;
    videoState: VideoState | null;
    cameraState: CameraState;
    activeTimers: Map<string, any>;
    activeCountdowns?: Map<string, CountdownState>;
    triggeredOnceNodes: Set<string>;
    deltaTime: number;
    triggeredPinId?: string;
    // Functions to mutate state
    setGameObjects: (action: React.SetStateAction<SimulatedGameObject[]>) => void;
    setVideoState: (action: React.SetStateAction<VideoState | null>) => void;
    setCameraState: (action: React.SetStateAction<CameraState>) => void;
    setPreviewFullscreen?: (action: React.SetStateAction<boolean>) => void;
    addLog: (message: string) => void;
    // For data flow
    evaluateInput: (nodeId: string, pinId: string, context: NodeExecutionContext) => any;
    // For execution flow
    triggerOutput: (nodeId: string, pinId: string, context: NodeExecutionContext) => void;
    // Cache for memoization
    nodeOutputCache: Map<string, any>;
}

export type NodeLogicHandler = (node: GraphNode, context: NodeExecutionContext) => void;