
import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import CloseIcon from './icons/CloseIcon';
import { SimulatedGameObject, Asset, CameraState, Scene, GameObject, EntityType3D, TextRendererBehavior } from '../types';

interface GamePreviewWindowProps {
  onClose: () => void;
  scene: Scene;
  assets: Asset[];
  resolution: { width: number, height: number };
  simulatedObjects: SimulatedGameObject[];
  cameraState: CameraState;
  isFullscreen: boolean;
  showHitboxes: boolean;
  onObjectClicked: (objectId: string) => void;
}

// --- Helper shared between 2D and 3D ---
const findAssetById = (assets: Asset[], id: string): Asset | undefined => {
  for (const asset of assets) {
    if (asset.id === id) return asset;
    if (asset.children) {
      const found = findAssetById(asset.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

// --- 2D Rendering Logic ---
const getZIndex = (go: GameObject): number => {
    const bgController = go.behaviors.find(b => b.type === 'backgroundController');
    if (bgController) return bgController.properties.zIndex || 0;
    return go.zOrder || 0;
};

const resolveGameObjectSpriteSrc = (go: SimulatedGameObject, assets: Asset[]): string | undefined => {
    if (go.currentAnimation && go.animations) {
        const clip = go.animations.find(anim => anim.name === go.currentAnimation);
        if (clip && clip.frames.length > 0) {
            const frame = clip.frames[go.currentFrame ?? 0];
            if (frame?.spriteAssetId) return findAssetById(assets, frame.spriteAssetId)?.data;
        }
    }
    const spriteRenderer = go.behaviors.find(b => b.type === 'spriteRenderer');
    if (spriteRenderer?.properties.assetId) return findAssetById(assets, spriteRenderer.properties.assetId)?.data;
    return go.spriteSrc;
};

const getActiveHitboxesForDraw = (go: SimulatedGameObject) => {
    const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
    if (!transform) return [];

    const getBoundingBox = () => {
        const scale = transform.scale || { x: 1, y: 1 };
        const width = 32 * scale.x;
        const height = 32 * scale.y;
        return { x: go.position.x - width / 2, y: go.position.y - height / 2, width, height };
    };

    if (!go.useCustomHitboxes || !go.animations) {
        return [getBoundingBox()];
    }
    
    const activeClip = go.animations.find(anim => anim.name === go.currentAnimation);
    if (!activeClip || activeClip.frames.length === 0) {
        return [getBoundingBox()];
    }

    const frameIndex = activeClip.syncHitboxes ? 0 : (go.currentFrame || 0);
    const currentFrame = activeClip.frames[frameIndex];
    if (!currentFrame || !currentFrame.hitboxes || currentFrame.hitboxes.length === 0) {
        return [getBoundingBox()];
    }

    const renderedSpriteWidth = 32 * (transform.scale?.x || 1);
    const renderedSpriteHeight = 32 * (transform.scale?.y || 1);
    const sourceSpriteWidth = currentFrame.spriteWidth || 32;
    const sourceSpriteHeight = currentFrame.spriteHeight || 32;

    const scaleX = sourceSpriteWidth > 0 ? renderedSpriteWidth / sourceSpriteWidth : 1;
    const scaleY = sourceSpriteHeight > 0 ? renderedSpriteHeight / sourceSpriteHeight : 1;
    
    return currentFrame.hitboxes.map(hb => {
        if (hb.isLockedToSpriteBounds) {
            return {
                x: go.position.x - renderedSpriteWidth / 2,
                y: go.position.y - renderedSpriteHeight / 2,
                width: renderedSpriteWidth,
                height: renderedSpriteHeight,
            };
        }

        const localHitboxCenterX = hb.x + hb.width / 2 - sourceSpriteWidth / 2;
        const localHitboxCenterY = hb.y + hb.height / 2 - sourceSpriteHeight / 2;

        const worldOffsetX = localHitboxCenterX * scaleX;
        const worldOffsetY = localHitboxCenterY * scaleY;
        
        const worldHitboxWidth = hb.width * scaleX;
        const worldHitboxHeight = hb.height * scaleY;

        const worldHitboxX = go.position.x + worldOffsetX - worldHitboxWidth / 2;
        const worldHitboxY = go.position.y + worldOffsetY - worldHitboxHeight / 2;
        
        return {
            x: worldHitboxX,
            y: worldHitboxY,
            width: worldHitboxWidth,
            height: worldHitboxHeight,
        };
    });
};

const Preview2D: React.FC<{
  simulatedObjects: SimulatedGameObject[];
  cameraState: CameraState;
  assets: Asset[];
  resolution: { width: number; height: number };
  showHitboxes: boolean;
  onObjectClicked: (objectId: string) => void;
}> = ({ simulatedObjects, cameraState, assets, resolution, showHitboxes, onObjectClicked }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  useEffect(() => {
    const preloadPromises: Promise<void>[] = [];
    simulatedObjects.forEach(go => {
      const src = resolveGameObjectSpriteSrc(go, assets);
      if (src && !imageCache.current.has(src)) {
        const promise = new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            imageCache.current.set(src, img);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = src;
        });
        preloadPromises.push(promise);
      }
    });

    const canvas = canvasRef.current;
    if (!canvas) return;

    const handlePointerDown = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        // --- Calculate inverse transform to get world coordinates ---
        const gameRatio = resolution.width / resolution.height;
        const screenRatio = canvas.clientWidth / canvas.clientHeight;
        
        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;

        if (screenRatio > gameRatio) {
            scale = canvas.clientHeight / resolution.height;
            offsetX = (canvas.clientWidth - resolution.width * scale) / 2;
        } else {
            scale = canvas.clientWidth / resolution.width;
            offsetY = (canvas.clientHeight - resolution.height * scale) / 2;
        }

        const mouseInGameScreenX = (screenX - offsetX) / scale;
        const mouseInGameScreenY = (screenY - offsetY) / scale;

        const worldX = (mouseInGameScreenX - resolution.width / 2) / cameraState.zoom + cameraState.position.x;
        const worldY = (mouseInGameScreenY - resolution.height / 2) / cameraState.zoom + cameraState.position.y;
        const clickPoint = { x: worldX, y: worldY };

        const sortedObjects = [...simulatedObjects].sort((a, b) => getZIndex(b) - getZIndex(a));
        for (const go of sortedObjects) {
            if (!(go.isActive ?? true)) continue;
            const hitboxes = getActiveHitboxesForDraw(go);
            for (const box of hitboxes) {
                if (clickPoint.x >= box.x && clickPoint.x <= box.x + box.width &&
                    clickPoint.y >= box.y && clickPoint.y <= box.y + box.height) {
                    onObjectClicked(go.id);
                    return;
                }
            }
        }
    };

    canvas.addEventListener('pointerdown', handlePointerDown);

    Promise.all(preloadPromises).then(() => {
      // Wait for fonts to be ready before drawing, to prevent fallback rendering
      document.fonts.ready.then(() => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const parent = canvas.parentElement!;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;

        const gameRatio = resolution.width / resolution.height;
        const screenRatio = canvas.width / canvas.height;
        
        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;

        if (screenRatio > gameRatio) {
            scale = canvas.height / resolution.height;
            offsetX = (canvas.width - resolution.width * scale) / 2;
        } else {
            scale = canvas.width / resolution.width;
            offsetY = (canvas.height - resolution.height * scale) / 2;
        }
        
        ctx.save();
        
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);
        
        ctx.fillStyle = '#1f2937';
        ctx.fillRect(0, 0, resolution.width, resolution.height);

        ctx.translate(resolution.width / 2, resolution.height / 2);
        ctx.scale(cameraState.zoom, cameraState.zoom);
        ctx.translate(-cameraState.position.x, -cameraState.position.y);
        ctx.imageSmoothingEnabled = false;

        const sortedObjects = [...simulatedObjects].sort((a, b) => getZIndex(a) - getZIndex(b));
        
        sortedObjects.forEach(go => {
          if (go.type === 'platform') {
              const platformController = go.behaviors.find(b => b.type === 'platformController');
              if (platformController && platformController.properties.isVisible === false) {
                  return; // Skip rendering
              }
          }

          const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
          if (!transform) return;

          if (go.type === 'text') {
              const textRenderer = go.behaviors.find(b => b.type === 'textRenderer') as TextRendererBehavior | undefined;
              if (!textRenderer) return;

              const fontAsset = textRenderer.properties.customFontAssetId ? findAssetById(assets, textRenderer.properties.customFontAssetId) : null;
              const fontFamily = fontAsset ? fontAsset.id : textRenderer.properties.font;
              
              ctx.font = `${textRenderer.properties.style || 'normal'} ${textRenderer.properties.size}px ${fontFamily}`;
              ctx.fillStyle = textRenderer.properties.color;
              ctx.textAlign = textRenderer.properties.align;
              ctx.textBaseline = 'middle';

              const lines = String(textRenderer.properties.text).split('\n');
              const totalHeight = lines.length * textRenderer.properties.size;
              const startY = go.position.y - totalHeight / 2 + textRenderer.properties.size / 2;

              lines.forEach((line, index) => {
                  ctx.fillText(line, go.position.x, startY + (index * textRenderer.properties.size));
              });
              return;
          }

          const scale = transform.scale || { x: 1, y: 1 };
          const width = 32 * scale.x;
          const height = 32 * scale.y;
          
          let renderPosition = go.position;
          const bgController = go.behaviors.find(b => b.type === 'backgroundController');
          if (bgController) {
              const p = bgController.properties.parallaxSpeed || { x: 1, y: 1 };
              const offsetX = cameraState.position.x * (1 - p.x);
              const offsetY = cameraState.position.y * (1 - p.y);
              renderPosition = { x: go.position.x + offsetX, y: go.position.y + offsetY };
          }

          const spriteSrc = resolveGameObjectSpriteSrc(go, assets);
          const img = spriteSrc ? imageCache.current.get(spriteSrc) : null;
          
          if (img) {
              const spriteRenderer = go.behaviors.find(b => b.type === 'spriteRenderer');
              if (spriteRenderer?.properties.renderMode === 'tiled') {
                  const pattern = ctx.createPattern(img, 'repeat');
                  if (pattern) {
                    ctx.fillStyle = pattern;
                    ctx.save();
                    ctx.translate(renderPosition.x - width / 2, renderPosition.y - height / 2);
                    ctx.fillRect(0, 0, width, height);
                    ctx.restore();
                  }
              } else {
                  ctx.drawImage(img, renderPosition.x - width / 2, renderPosition.y - height / 2, width, height);
              }
          } else {
              ctx.save();
              ctx.fillStyle = 'rgba(236, 72, 153, 0.5)';
              ctx.strokeStyle = '#f472b6';
              ctx.lineWidth = 2;
              ctx.setLineDash([6, 3]);
              ctx.strokeRect(renderPosition.x - width / 2, renderPosition.y - height / 2, width, height);
              ctx.fillRect(renderPosition.x - width / 2, renderPosition.y - height / 2, width, height);
              ctx.restore();
          }
        });

        // --- Draw Hitboxes (if enabled) ---
        if (showHitboxes) {
          ctx.save();
          sortedObjects.forEach(go => {
              const color = go.hitboxColor || '#00FF00'; // Green fallback
              ctx.fillStyle = color.startsWith('hsl') 
                  ? color.replace(')', ', 0.5)').replace('hsl', 'hsla') // Add 50% alpha to HSL color
                  : '#34d39980'; // Fallback green with 50% alpha

              const hitboxes = getActiveHitboxesForDraw(go);
              hitboxes.forEach(box => {
                  ctx.fillRect(box.x, box.y, box.width, box.height);
              });
          });
          ctx.restore();
        }

        ctx.restore();
      });
    });

    return () => {
        if (canvas) {
            canvas.removeEventListener('pointerdown', handlePointerDown);
        }
    };
  }, [simulatedObjects, cameraState, assets, resolution, showHitboxes, onObjectClicked]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', imageRendering: 'pixelated' }} />;
};

// --- 3D Rendering Logic ---
const Preview3D: React.FC<{
    gameObjects: GameObject[];
    assets: Asset[];
}> = ({ gameObjects, assets }) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const GRID_SIZE = 32;

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1f2937);
        scene.fog = new THREE.Fog(0x1f2937, 100, 500);

        // Camera
        const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
        
        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        mount.appendChild(renderer.domElement);

        const resizeObserver = new ResizeObserver(entries => {
            const entry = entries[0];
            if (entry) {
                const { width, height } = entry.contentRect;
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            }
        });
        resizeObserver.observe(mount);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xcccccc, 0.8);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
        directionalLight.position.set(50, 80, 20);
        scene.add(directionalLight);

        // Player
        const playerStart = gameObjects.find(go => go.entityType3D === 'player_start');
        const playerConfig = playerStart?.player3dConfig;
        
        const playerHeight = playerConfig?.size.y ?? 40;
        const playerRadius = (playerConfig?.size.x ?? 20) / 2;
        const playerGeometry = new THREE.CapsuleGeometry(playerRadius, playerHeight - (playerRadius * 2), 4, 8);
        const playerMaterial = new THREE.MeshLambertMaterial({ color: 0x60a5fa, wireframe: true });
        const playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
        scene.add(playerMesh);

        // Controls
        let controls: PointerLockControls | null = null;
        if (playerConfig?.mouseLook) {
          controls = new PointerLockControls(camera, renderer.domElement);
          mount.addEventListener('click', () => controls?.lock());
          scene.add(controls.object);
        } else {
            scene.add(camera);
        }
        
        // Camera Rig for 3rd person
        const cameraRig = new THREE.Object3D();
        scene.add(cameraRig);
        if (playerConfig?.cameraType === 'third_person') {
            cameraRig.add(camera);
            camera.position.set(0, 50, 100);
            camera.lookAt(cameraRig.position);
        } else {
            // First person
            controls?.object.add(camera);
        }

        // Texture Loading
        const textureLoader = new THREE.TextureLoader();
        const textureCache = new Map<string, THREE.Texture>();

        const getTexture = (assetId: string | undefined): THREE.Texture | null => {
            if (!assetId) return null;
            if (textureCache.has(assetId)) return textureCache.get(assetId)!;
            const asset = findAssetById(assets, assetId);
            if (asset?.data) {
                const texture = textureLoader.load(asset.data);
                texture.magFilter = THREE.NearestFilter;
                texture.minFilter = THREE.NearestFilter;
                textureCache.set(assetId, texture);
                return texture;
            }
            return null;
        }

        // Materials
        const defaultMaterials: Record<EntityType3D, THREE.Material> = {
            wall: new THREE.MeshStandardMaterial({ color: 0x6b7280 }),
            floor: new THREE.MeshStandardMaterial({ color: 0x4b5563 }),
            player_start: new THREE.MeshStandardMaterial({ color: 0x22d3ee, transparent: true, opacity: 0 }),
            prop: new THREE.MeshStandardMaterial({ color: 0xa855f7 }),
            obstacle: new THREE.MeshStandardMaterial({ color: 0xef4444 }),
            light_source: new THREE.MeshBasicMaterial({ color: 0xfde047 }),
            sound_source: new THREE.MeshBasicMaterial({ color: 0xec4899 }),
        };

        const createTexturedMaterialArray = (go: GameObject): THREE.Material[] => {
            const order: (keyof NonNullable<GameObject['textures']>)[] = ['right', 'left', 'top', 'bottom', 'front', 'back'];
            const defaultMaterial = defaultMaterials[go.entityType3D!] || defaultMaterials.prop;
            
            return order.map(face => {
                const textureId = go.textures?.[face];
                const texture = textureId ? getTexture(textureId) : null;
                if (texture) {
                    return new THREE.MeshStandardMaterial({ map: texture });
                }
                return defaultMaterial.clone();
            });
        };

        // Build Scene from GameObjects
        gameObjects.forEach(go => {
            if (!go.gridPosition || !go.entityType3D) return;
            const geometry = new THREE.BoxGeometry(GRID_SIZE, GRID_SIZE, GRID_SIZE);
            const material = (go.entityType3D === 'wall' || go.entityType3D === 'floor' || go.entityType3D === 'obstacle')
                ? createTexturedMaterialArray(go)
                : defaultMaterials[go.entityType3D] || defaultMaterials.prop;
                
            const cube = new THREE.Mesh(geometry, material);
            cube.position.set(
                go.gridPosition.x * GRID_SIZE,
                (go.zIndex ?? 0) * GRID_SIZE,
                 go.gridPosition.y * GRID_SIZE
            );
            scene.add(cube);
        });

        if (playerConfig) {
            controls?.object.position.set(playerConfig.position.x, playerConfig.position.y, playerConfig.position.z);
            controls?.object.rotation.set(playerConfig.rotation.x, playerConfig.rotation.y, playerConfig.rotation.z);
        }
        
        const keyboardState: Record<string, boolean> = {};
        const onKeyDown = (e: KeyboardEvent) => keyboardState[e.key.toLowerCase()] = true;
        const onKeyUp = (e: KeyboardEvent) => keyboardState[e.key.toLowerCase()] = false;
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        
        const clock = new THREE.Clock();
        const moveDirection = new THREE.Vector3();
        
        const animate = () => {
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            const moveSpeed = (playerConfig?.speed ?? 100) * delta;
            
            const controlObject = controls ? controls.object : camera;

            moveDirection.x = (keyboardState['d'] ? 1 : 0) - (keyboardState['a'] ? 1 : 0);
            moveDirection.z = (keyboardState['s'] ? 1 : 0) - (keyboardState['w'] ? 1 : 0);
            moveDirection.normalize();

            if (controls?.isLocked) {
                controlObject.translateX(moveDirection.x * moveSpeed);
                controlObject.translateZ(moveDirection.z * moveSpeed);
            } else if (!controls) { // Keyboard only controls
                 controlObject.translateX(moveDirection.x * moveSpeed);
                 controlObject.translateZ(moveDirection.z * moveSpeed);
                if (keyboardState['q'] || keyboardState['arrowleft']) controlObject.rotateY(2 * delta);
                if (keyboardState['e'] || keyboardState['arrowright']) controlObject.rotateY(-2 * delta);
            }
            
            // Sync player mesh with control object
            if (controls) {
                playerMesh.position.copy(controlObject.position);
                playerMesh.position.y -= playerHeight / 2;
            }

            if(playerConfig?.cameraType === 'third_person') {
                cameraRig.position.copy(playerMesh.position);
                camera.lookAt(cameraRig.position);
            }

            renderer.render(scene, camera);
        };
        animate();

        return () => {
            resizeObserver.disconnect();
            mount.removeChild(renderer.domElement);
            controls?.dispose();
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('keyup', onKeyUp);
        };

    }, [gameObjects, assets]);

    return <div ref={mountRef} className="w-full h-full" />;
};

const GamePreviewWindow: React.FC<GamePreviewWindowProps> = ({ onClose, scene, assets, resolution, simulatedObjects, cameraState, isFullscreen, showHitboxes, onObjectClicked }) => {
  const headerHeight = 53;
  const is3D = scene.type === '3d';

  const wrapperClasses = isFullscreen
    ? "fixed inset-0 z-50 flex items-center justify-center"
    : "fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm";

  const containerClasses = isFullscreen
    ? "bg-black flex flex-col w-full h-full"
    : "bg-gray-900 rounded-lg shadow-2xl border border-gray-700 flex flex-col";

  const containerStyle = isFullscreen
    ? {}
    : {
        width: resolution.width,
        height: resolution.height + headerHeight,
        maxWidth: '95vw',
        maxHeight: '90vh'
      };

  return (
    <div className={wrapperClasses}>
      <div 
        className={containerClasses}
        style={containerStyle}
      >
        <header className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0">
          <h2 className="font-bold text-lg">Game Preview ({is3D ? '3D' : '2D'})</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full">
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>
        <main className="flex-grow bg-black relative overflow-hidden flex items-center justify-center">
            {is3D ? (
                 <Preview3D gameObjects={scene.gameObjects} assets={assets} />
            ) : (
                <Preview2D simulatedObjects={simulatedObjects} cameraState={cameraState} assets={assets} resolution={resolution} showHitboxes={showHitboxes} onObjectClicked={onObjectClicked} />
            )}
        </main>
      </div>
    </div>
  );
};

export default GamePreviewWindow;
