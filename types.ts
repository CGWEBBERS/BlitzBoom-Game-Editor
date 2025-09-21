// Fix: Populate the types file with necessary definitions used throughout the application.

export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Player3DConfig {
  cameraType: 'first_person' | 'third_person';
  mouseLook: boolean;
  speed: number;
  size: Vector3; // width, height, depth
  position: Vector3;
  rotation: Vector3;
}


export interface CameraState {
    position: Vector2;
    zoom: number;
}

export enum AssetType {
  Folder = 'folder',
  Image = 'image',
  Script = 'script',
  Audio = 'audio',
  // Fix: Add 'Video' to the AssetType enum to support video files.
  Video = 'video',
  Font = 'font',
}

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  children?: Asset[];
  data?: string; 
}

export type SelectedItems = {
  type: 'gameobject' | 'node' | 'scene';
  ids: string[];
} | null;

export type GameObjectType = 
  | 'sprite'
  | 'player'
  | 'enemy'
  | 'platform'
  | 'background'
  | 'sound'
  | 'music'
  | 'tiled'
  | 'bullet'
  | 'empty'
  | 'text'
  | 'hitbox';

// Fix: Add EntityType3D for 3D object types to resolve import errors.
export type EntityType3D = 'wall' | 'floor' | 'player_start' | 'prop' | 'light_source' | 'sound_source' | 'obstacle';

export interface Behavior<T extends Record<string, any>> {
    type: string;
    name: string;
    properties: T;
}

export interface SpriteRendererBehavior extends Behavior<{
  assetId: string | null;
  renderMode: 'normal' | 'tiled';
}> {
  type: 'spriteRenderer';
}

export interface PlatformControllerBehavior extends Behavior<{
    collisionType: 'solid' | 'jumpthrough';
    canGrab: boolean;
    moveDirection: 'None' | 'Horizontal' | 'Vertical';
    moveSpeed: number;
    moveDistance: number;
    isVisible: boolean;
}> {
    type: 'platformController';
}

export interface BackgroundControllerBehavior extends Behavior<{
  zIndex: number;
  parallaxSpeed: Vector2;
}> {
  type: 'backgroundController';
}

export interface TextRendererBehavior extends Behavior<{
  text: string;
  font: string;
  size: number;
  color: string;
  style: 'normal' | 'bold' | 'italic' | 'bold italic';
  align: 'left' | 'center' | 'right';
  customFontAssetId: string | null;
}> {
  type: 'textRenderer';
}


export type AnyBehavior = Behavior<any> | SpriteRendererBehavior | PlatformControllerBehavior | BackgroundControllerBehavior | TextRendererBehavior;

export interface GameObject {
  id: string;
  name: string;
  type: GameObjectType;
  layer: string;
  children?: GameObject[];
  behaviors: AnyBehavior[];
  animations?: AnimationClip[];
  useCustomHitboxes?: boolean;
  hitboxColor?: string;
  color?: string;
  isActive?: boolean;
  isLocked?: boolean;
  // Fix: Add optional properties for 3D view to resolve type errors.
  gridPosition?: Vector2;
  zIndex?: number; // For 3D level height
  zOrder?: number; // For 2D scene render order
  entityType3D?: EntityType3D;
  player3dConfig?: Player3DConfig;
  textures?: {
    top?: string;
    bottom?: string;
    front?: string;
    back?: string;
    left?: string;
    right?: string;
  };
}

// For the live game simulation
export interface SimulatedGameObject extends GameObject {
    position: Vector2;
    velocity: Vector2;
    spriteSrc?: string;
    // For moving platforms
    initialPosition?: Vector2; 
    patrolTime?: number;
    // For platformer collision
    isGrounded?: boolean;
    prevPosition?: Vector2;
    // For animation
    currentAnimation?: string | null;
    animationTime?: number;
    animationSpeed?: number;
    currentFrame?: number;
    // For Enemy AI
    aiState?: {
      // General state machine
      state: 'IDLE' | 'APPROACHING' | 'ATTACKING' | 'RETREATING' | 'BLOCKING' | 'JUMPING' | 'FALLING' | 'HIT_STUN';
      stateTimer: number; // Time until the current state expires
      reactionTimer: number; // Time until the AI can make a new decision
      
      // Combat state
      attackCooldown: number;
      hitStunTimer: number;
      currentAttack?: number; // e.g., 1, 2, or 3
      previousHealth?: number;
      targetPlayerId?: string;
    };
    aiControllerNodeId?: string;
    isActive?: boolean;
}


export interface PinDef {
  id: string;
  name: string;
  type: 'exec' | 'data' | string;
}

export interface GraphNode {
  id:string;
  name: string;
  type: string;
  position: Vector2;
  inputs: PinDef[];
  outputs: PinDef[];
  properties: Record<string, any>;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  fromOutputId: string;
  toNodeId: string;
  toInputId: string;
}

export interface Layer {
    name: string;
    isVisible: boolean;
    isLocked: boolean;
}

export interface ObjectGroup {
    id: string;
    name: string;
}

export interface Hitbox {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isLockedToSpriteBounds?: boolean;
}

export interface AnimationFrame {
  id: string;
  spriteAssetId: string; // From main assets
  spriteSrc?: string; // From local upload (base64 or virtual path)
  hitboxes?: Hitbox[];
  spriteWidth?: number;
  spriteHeight?: number;
}

export interface AnimationClip {
  id: string;
  name: string;
  frames: AnimationFrame[];
  loop: boolean;
  fps: number;
  syncHitboxes?: boolean;
}

export interface Scene {
    id: string;
    name: string;
    type: '2d' | '3d';
    gameObjects: GameObject[];
    layers: Layer[];
    activeLayerName: string;
    nodes: GraphNode[];
    connections: Connection[];
}