
import React, { useState, useRef, MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent, useCallback, useEffect } from 'react';
import { Asset, GameObject, Vector2, SelectedItems, Layer, TextRendererBehavior, Hitbox } from '../types';

// Helper function to recursively find an asset by its ID in the asset tree.
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

const imageCache = new Map<string, { width: number, height: number }>();

const getGameObjectSpriteSrc = (go: GameObject, assets: Asset[]): string | undefined => {
    // Try to get from Idle animation's first frame
    const idleAnimation = go.animations?.find(anim => anim.name.toLowerCase() === 'idle');
    if (idleAnimation && idleAnimation.frames.length > 0) {
        const frame = idleAnimation.frames[0];
        if (frame.spriteAssetId) {
            const asset = findAssetById(assets, frame.spriteAssetId);
            if (asset?.data) return asset.data;
        }
    }

    // Fallback to spriteRenderer's asset
    const spriteRenderer = go.behaviors.find(b => b.type === 'spriteRenderer');
    if (spriteRenderer?.properties.assetId) {
        const asset = findAssetById(assets, spriteRenderer.properties.assetId);
        return asset?.data;
    }

    return undefined;
};

const getZIndex = (go: GameObject): number => {
    const bgController = go.behaviors.find(b => b.type === 'backgroundController');
    if (bgController) {
        return bgController.properties.zIndex || 0;
    }
    return go.zOrder || 0; // Default z-index
};

interface SceneViewProps {
  onCreateSprite: (asset: Asset, position: Vector2) => void;
  gameObjects: GameObject[];
  layers: Layer[];
  assets: Asset[];
  selectedItems: SelectedItems;
  onSelectionChange: (selection: SelectedItems, options?: { addToSelection: boolean }) => void;
  onGameObjectUpdate: (updatedObject: GameObject) => void;
  resolution: { width: number, height: number };
  showHitboxes: boolean;
}

type InteractionType = 'move' | 'resize-tl' | 'resize-tr' | 'resize-l' | 'resize-r' | 'resize-bl' | 'resize-b' | 'resize-br' | 'pan' | 'scroll-x' | 'scroll-y' | 'marquee';

interface InteractionState {
  type: InteractionType;
  gameObjectIds?: string[]; // Store IDs instead of the full object
  anchorGameObjectId?: string;
  initialMousePos: Vector2;
  currentMousePos?: Vector2;
  initialTransforms?: Record<string, { position: Vector2, scale: Vector2 }>;
  initialPan?: Vector2;
}

const WORLD_WIDTH = 5000;
const WORLD_HEIGHT = 5000;

const SceneView: React.FC<SceneViewProps> = ({ onCreateSprite, gameObjects, layers, assets, selectedItems, onSelectionChange, onGameObjectUpdate, resolution, showHitboxes }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const [viewTransform, setViewTransform] = useState({ scale: 1, pan: { x: 0, y: 0 }});
  const [sceneDimensions, setSceneDimensions] = useState({ width: 0, height: 0 });
  const sceneRef = useRef<HTMLDivElement>(null);
  
  // Use refs for immediate access in event handlers to prevent stale state issues.
  const gameObjectsRef = useRef(gameObjects);
  const interactionRef = useRef<InteractionState | null>(null);

  useEffect(() => {
      gameObjectsRef.current = gameObjects;
  }, [gameObjects]);

  useEffect(() => {
    if (sceneRef.current && resolution.width > 0 && resolution.height > 0) {
        const resizeObserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                const { width: viewWidth, height: viewHeight } = entry.contentRect;
                
                setSceneDimensions({ width: viewWidth, height: viewHeight });

                const padding = 0.90; 
                const scaleX = viewWidth / resolution.width;
                const scaleY = viewHeight / resolution.height;
                const newScale = Math.min(scaleX, scaleY) * padding;

                const newPan = {
                    x: viewWidth / 2,
                    y: viewHeight / 2,
                };

                setViewTransform({
                    scale: newScale,
                    pan: newPan,
                });
            }
        });
        resizeObserver.observe(sceneRef.current);
        
        return () => {
            resizeObserver.disconnect();
        };
    }
  }, [resolution.width, resolution.height]);


  const screenToWorld = useCallback((screenPos: Vector2): Vector2 => {
    return {
        x: (screenPos.x - viewTransform.pan.x) / viewTransform.scale,
        y: (screenPos.y - viewTransform.pan.y) / viewTransform.scale
    };
  }, [viewTransform]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const isAsset = e.dataTransfer.types.includes('application/json');
    const isGameObject = e.dataTransfer.types.includes('application/blizboom-gameobject-id');
    if (isAsset || isGameObject) {
      e.dataTransfer.dropEffect = isAsset ? 'copy' : 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const rect = sceneRef.current!.getBoundingClientRect();
    const dropPosition = screenToWorld({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
    });

    if (e.dataTransfer.types.includes('application/blizboom-gameobject-id')) {
        const gameObjectId = e.dataTransfer.getData('application/blizboom-gameobject-id');
        const objectToMove = gameObjects.find(go => go.id === gameObjectId);
        if (!objectToMove || objectToMove.isLocked) return;

        const objectLayer = layers.find(l => l.name === objectToMove.layer);
        if (objectLayer?.isLocked) return;
        
        const updatedObject = {
            ...objectToMove,
            behaviors: objectToMove.behaviors.map(b => 
                b.type === 'transform'
                ? { ...b, properties: { ...b.properties, position: dropPosition } }
                : b
            )
        };
        onGameObjectUpdate(updatedObject);
        return;
    }

    if (e.dataTransfer.types.includes('application/json')) {
        try {
          const assetJson = e.dataTransfer.getData('application/json');
          if (assetJson) {
            const asset: Asset = JSON.parse(assetJson);
            if (asset && asset.type === 'image') {
              onCreateSprite(asset, dropPosition);
            }
          }
        } catch (err) {
          console.error("Failed to parse dropped data", err);
        }
    }
  };
    
    // --- Interaction Helpers ---
    const getGameObjectBoundingBox = (go: GameObject): { x: number; y: number; width: number; height: number; } | null => {
        const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
        if (!transform) return null;
        const size = { width: 32 * (transform.scale.x || 1), height: 32 * (transform.scale.y || 1) };
        return {
            x: transform.position.x - size.width / 2,
            y: transform.position.y - size.height / 2,
            width: size.width,
            height: size.height,
        };
    };

    const getGameObjectWorldHitboxes = (go: GameObject): ({ x: number; y: number; width: number; height: number; } | { x: number; y: number; width: number; height: number; isLockedToSpriteBounds?: boolean; id: string; name: string; })[] => {
        const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
        if (!transform) return [];
    
        const getBoundingBox = () => {
            const scale = transform.scale || { x: 1, y: 1 };
            const width = 32 * Math.abs(scale.x);
            const height = 32 * Math.abs(scale.y);
            return { x: transform.position.x - width / 2, y: transform.position.y - height / 2, width, height };
        };
    
        if (!go.useCustomHitboxes || !go.animations) {
            const box = getGameObjectBoundingBox(go);
            return box ? [box] : [];
        }
    
        // For editor view, use the first frame of the 'Idle' animation as a representative frame
        const idleAnimation = go.animations.find(anim => anim.name.toLowerCase() === 'idle');
        const frame = idleAnimation?.frames[0];
    
        if (!frame || !frame.hitboxes || frame.hitboxes.length === 0) {
            return [getBoundingBox()];
        }
    
        const renderedSpriteWidth = 32 * (transform.scale?.x || 1);
        const renderedSpriteHeight = 32 * (transform.scale?.y || 1);
        const sourceSpriteWidth = frame.spriteWidth || 32;
        const sourceSpriteHeight = frame.spriteHeight || 32;
    
        const scaleX = sourceSpriteWidth > 0 ? renderedSpriteWidth / sourceSpriteWidth : 1;
        const scaleY = sourceSpriteHeight > 0 ? renderedSpriteHeight / sourceSpriteHeight : 1;
    
        return frame.hitboxes.map(hb => {
            const newHb = { ...hb }; // copy hitbox properties
            if (newHb.isLockedToSpriteBounds) {
                return {
                    ...newHb,
                    x: transform.position.x - renderedSpriteWidth / 2,
                    y: transform.position.y - renderedSpriteHeight / 2,
                    width: renderedSpriteWidth,
                    height: renderedSpriteHeight,
                };
            }
    
            const localHitboxCenterX = newHb.x + newHb.width / 2 - sourceSpriteWidth / 2;
            const localHitboxCenterY = newHb.y + newHb.height / 2 - sourceSpriteHeight / 2;
    
            const worldOffsetX = localHitboxCenterX * scaleX;
            const worldOffsetY = localHitboxCenterY * scaleY;
    
            const worldHitboxWidth = newHb.width * scaleX;
            const worldHitboxHeight = newHb.height * scaleY;
    
            const worldHitboxX = transform.position.x + worldOffsetX - worldHitboxWidth / 2;
            const worldHitboxY = transform.position.y + worldOffsetY - worldHitboxHeight / 2;
            
            return {
                ...newHb,
                x: worldHitboxX,
                y: worldHitboxY,
                width: worldHitboxWidth,
                height: worldHitboxHeight,
            };
        });
    };
    
    const isPointInRect = (point: Vector2, rect: { x: number; y: number; width: number; height: number; }): boolean => {
        return point.x >= rect.x && point.x <= rect.x + rect.width &&
               point.y >= rect.y && point.y <= rect.y + rect.height;
    };


  const startMoveInteraction = (e: ReactMouseEvent, go: GameObject, initialMousePos: Vector2) => {
      const isSelected = selectedItems?.type === 'gameobject' && selectedItems.ids.includes(go.id);
      if (!isSelected) {
          onSelectionChange({ type: 'gameobject', ids: [go.id] }, { addToSelection: e.shiftKey });
      }

      if (go.isLocked) return;

      const currentSelectedIds = (e.shiftKey && selectedItems?.type === 'gameobject' && isSelected)
          ? selectedItems.ids
          : isSelected ? selectedItems!.ids : [go.id];
      
      const unlockedSelectedIds = currentSelectedIds.filter(id => {
          const obj = gameObjectsRef.current.find(o => o.id === id);
          return obj && !obj.isLocked;
      });

      if (unlockedSelectedIds.length === 0) return;

      const initialTransforms: Record<string, any> = {};
      
      gameObjectsRef.current.forEach(obj => {
          if (unlockedSelectedIds.includes(obj.id)) {
              const transform = obj.behaviors.find(b => b.type === 'transform');
              if (transform) {
                   initialTransforms[obj.id] = JSON.parse(JSON.stringify(transform.properties));
              }
          }
      });
      
      const newInteraction: InteractionState = {
        type: 'move',
        gameObjectIds: unlockedSelectedIds,
        anchorGameObjectId: go.id,
        initialMousePos,
        initialTransforms,
      };
      
      setInteraction(newInteraction);
      interactionRef.current = newInteraction;
  };
    
  const handleMouseDown = (e: ReactMouseEvent) => {
    e.stopPropagation();
    const rect = sceneRef.current!.getBoundingClientRect();
    const initialMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    
    if (e.button === 1) { // Pan
      const newInteraction: InteractionState = { type: 'pan', initialMousePos, initialPan: viewTransform.pan };
      setInteraction(newInteraction);
      interactionRef.current = newInteraction;
      return;
    }
    
    if (e.button !== 0) return;

    // Hit testing
    const worldMousePos = screenToWorld(initialMousePos);
    let clickedObject: GameObject | null = null;
    const sortedVisibleGameObjects = [...gameObjects.filter(go => {
        const layer = layers.find(l => l.name === go.layer);
        return layer ? layer.isVisible : true;
    })].sort((a, b) => getZIndex(b) - getZIndex(a)); // Reverse order for hit testing (top-most first)

    for (const go of sortedVisibleGameObjects) {
        const layer = layers.find(l => l.name === go.layer);
        if (layer?.isLocked) continue;

        // For editor interactions, always use the main visual bounding box for hit detection.
        const visualBbox = getGameObjectBoundingBox(go);
        if (visualBbox && isPointInRect(worldMousePos, visualBbox)) {
            clickedObject = go;
            break;
        }
    }

    if (clickedObject) {
        startMoveInteraction(e, clickedObject, initialMousePos);
    } else {
        onSelectionChange(null);
        const newInteraction: InteractionState = { type: 'marquee', initialMousePos };
        setInteraction(newInteraction);
        interactionRef.current = newInteraction;
    }
  };


  const handleResizeHandleMouseDown = (e: ReactMouseEvent, go: GameObject, type: InteractionType) => {
    e.stopPropagation();
    if (go.isLocked) return;
    const rect = sceneRef.current!.getBoundingClientRect();
    const initialMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const initialTransforms: Record<string, any> = {};
    const transform = go.behaviors.find(b => b.type === 'transform');
    if (transform) {
         initialTransforms[go.id] = JSON.parse(JSON.stringify(transform.properties));
    }
    
    const newInteraction: InteractionState = {
      type,
      gameObjectIds: [go.id],
      anchorGameObjectId: go.id,
      initialMousePos,
      initialTransforms,
    };

    setInteraction(newInteraction);
    interactionRef.current = newInteraction;
  };

  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!interactionRef.current || !sceneRef.current) return;
    
    const interaction = interactionRef.current;
    const rect = sceneRef.current.getBoundingClientRect();
    const currentMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    
    setInteraction(i => i ? { ...i, currentMousePos } : null);

    const dx = currentMousePos.x - interaction.initialMousePos.x;
    const dy = currentMousePos.y - interaction.initialMousePos.y;

    if (interaction.type === 'pan' && interaction.initialPan) {
        setViewTransform(vt => ({ ...vt, pan: { x: interaction.initialPan!.x + dx, y: interaction.initialPan!.y + dy } }));
        return;
    }
    
    if ((interaction.type === 'scroll-x' || interaction.type === 'scroll-y') && interaction.initialPan) {
        const panDx = -(dx / sceneDimensions.width) * WORLD_WIDTH * viewTransform.scale;
        const panDy = -(dy / sceneDimensions.height) * WORLD_HEIGHT * viewTransform.scale;
        const newPan = { ...interaction.initialPan };
        if (interaction.type === 'scroll-x') newPan.x += panDx;
        if (interaction.type === 'scroll-y') newPan.y += panDy;
        setViewTransform(vt => ({...vt, pan: newPan}));
        return;
    }

    if (!interaction.gameObjectIds || !interaction.initialTransforms) return;
    
    const worldDx = dx / viewTransform.scale;
    const worldDy = dy / viewTransform.scale;

    let totalDeltaX = worldDx;
    let totalDeltaY = worldDy;

    if (interaction.type === 'move' && interaction.anchorGameObjectId && interaction.initialTransforms[interaction.anchorGameObjectId]) {
        const worldMousePos = screenToWorld(currentMousePos);
        const anchorInitialPos = interaction.initialTransforms[interaction.anchorGameObjectId].position;
        totalDeltaX = worldMousePos.x - anchorInitialPos.x;
        totalDeltaY = worldMousePos.y - anchorInitialPos.y;
    }

    interaction.gameObjectIds.forEach(id => {
        const currentGameObject = gameObjectsRef.current.find(go => go.id === id);
        const initialTransform = interaction.initialTransforms![id];
        if (!currentGameObject || !initialTransform) {
            return;
        }
        
        const newTransformProps = JSON.parse(JSON.stringify(initialTransform));
        const BASE_SIZE = 32;

        if (interaction.type === 'move') {
          newTransformProps.position.x = initialTransform.position.x + totalDeltaX;
          newTransformProps.position.y = initialTransform.position.y + totalDeltaY;
        } else { // Resizing
            let newWidth = BASE_SIZE * initialTransform.scale.x;
            let newHeight = BASE_SIZE * initialTransform.scale.y;
            let newPosX = initialTransform.position.x;
            let newPosY = initialTransform.position.y;

            if (interaction.type.includes('l')) {
                newWidth -= worldDx;
                newPosX += worldDx / 2;
            } else if (interaction.type.includes('r')) {
                newWidth += worldDx;
                newPosX += worldDx / 2;
            }

            if (interaction.type.includes('t')) {
                newHeight -= worldDy;
                newPosY += worldDy / 2;
            } else if (interaction.type.includes('b')) {
                newHeight += worldDy;
                newPosY += worldDy / 2;
            }
            
            newTransformProps.scale.x = Math.max(0.1, newWidth / BASE_SIZE);
            newTransformProps.scale.y = Math.max(0.1, newHeight / BASE_SIZE);
            newTransformProps.position.x = newPosX;
            newTransformProps.position.y = newPosY;
        }
        
        const updatedObject = {
          ...currentGameObject,
          behaviors: currentGameObject.behaviors.map(b => b.type === 'transform' ? { ...b, properties: newTransformProps } : b),
        };

        onGameObjectUpdate(updatedObject);
    });
  };

  const handleMouseUp = (e: ReactMouseEvent) => {
    const currentInteraction = interactionRef.current;
    if (currentInteraction?.type === 'marquee' && interaction?.currentMousePos) {
        const start = currentInteraction.initialMousePos;
        const end = interaction.currentMousePos;

        const marqueeRect = {
            minX: Math.min(start.x, end.x),
            minY: Math.min(start.y, end.y),
            maxX: Math.max(start.x, end.x),
            maxY: Math.max(start.y, end.y),
        };

        const worldMarquee = {
            min: screenToWorld({ x: marqueeRect.minX, y: marqueeRect.minY }),
            max: screenToWorld({ x: marqueeRect.maxX, y: marqueeRect.maxY }),
        };

        const selectedIds = gameObjects.filter(go => {
            const layer = layers.find(l => l.name === go.layer);
            if (layer?.isLocked || go.isLocked) return false;
            
            // Use visual bounding box for marquee selection
            const box = getGameObjectBoundingBox(go);
            return box ? (
                box.x + box.width > worldMarquee.min.x && box.x < worldMarquee.max.x &&
                box.y + box.height > worldMarquee.min.y && box.y < worldMarquee.max.y
            ) : false;

        }).map(go => go.id);

        if (selectedIds.length > 0) {
            onSelectionChange({ type: 'gameobject', ids: selectedIds }, { addToSelection: e.shiftKey });
        }
    }
    
    setInteraction(null);
    interactionRef.current = null;
  };
  
  const handleWheel = (e: ReactWheelEvent) => {
    if (!sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    
    const zoomFactor = 1.1;
    const oldScale = viewTransform.scale;
    const newScale = e.deltaY < 0 ? oldScale * zoomFactor : oldScale / zoomFactor;
    
    const newPan = {
        x: mousePos.x - (mousePos.x - viewTransform.pan.x) * (newScale / oldScale),
        y: mousePos.y - (mousePos.y - viewTransform.pan.y) * (newScale / oldScale),
    };

    setViewTransform({ scale: newScale, pan: newPan });
  };
  
  const visibleGameObjects = gameObjects.filter(go => {
      const layer = layers.find(l => l.name === go.layer);
      return layer ? layer.isVisible : true;
  });

  const sortedVisibleGameObjects = [...visibleGameObjects].sort((a, b) => getZIndex(a) - getZIndex(b));

  const selectedObjects = visibleGameObjects.filter(go => selectedItems?.type === 'gameobject' && selectedItems.ids.includes(go.id));
  
  const getScrollbarProps = () => {
    if (!sceneDimensions.width || !sceneDimensions.height) {
        return { horz: { thumbSize: 0, thumbPos: 0 }, vert: { thumbSize: 0, thumbPos: 0 } };
    }

    const visibleWidthWorld = sceneDimensions.width / viewTransform.scale;
    const visibleHeightWorld = sceneDimensions.height / viewTransform.scale;

    const viewCenterXWorld = (sceneDimensions.width / 2 - viewTransform.pan.x) / viewTransform.scale;
    const viewCenterYWorld = (sceneDimensions.height / 2 - viewTransform.pan.y) / viewTransform.scale;

    const viewLeftWorld = viewCenterXWorld - visibleWidthWorld / 2;
    const viewTopWorld = viewCenterYWorld - visibleHeightWorld / 2;
    
    const viewLeftNormalized = (viewLeftWorld + WORLD_WIDTH / 2) / WORLD_WIDTH;
    const viewTopNormalized = (viewTopWorld + WORLD_HEIGHT / 2) / WORLD_HEIGHT;

    const hThumbSize = Math.max(20, (visibleWidthWorld / WORLD_WIDTH) * (sceneDimensions.width - 14));
    const vThumbSize = Math.max(20, (visibleHeightWorld / WORLD_HEIGHT) * (sceneDimensions.height - 14));
    
    const hThumbPos = viewLeftNormalized * (sceneDimensions.width - 14);
    const vThumbPos = viewTopNormalized * (sceneDimensions.height - 14);

    return { horz: { thumbSize: hThumbSize, thumbPos: hThumbPos }, vert: { thumbSize: vThumbSize, thumbPos: vThumbPos } };
  };

  const scrollbarProps = getScrollbarProps();
  
  const renderMarquee = () => {
    if (interaction?.type !== 'marquee' || !interaction.currentMousePos) return null;
    const start = interaction.initialMousePos;
    const end = interaction.currentMousePos;
    const style = {
      left: Math.min(start.x, end.x),
      top: Math.min(start.y, end.y),
      width: Math.abs(start.x - end.x),
      height: Math.abs(start.y - end.y),
    };
    return <div className="absolute bg-cyan-400/20 border border-cyan-400" style={style} />;
  };

  return (
    <div
      ref={sceneRef}
      className={`h-full w-full bg-gray-700/50 relative overflow-hidden transition-all select-none ${interaction?.type === 'pan' ? 'cursor-grabbing' : 'cursor-default'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div 
        className="absolute inset-0"
        style={{
            transform: `translate(${viewTransform.pan.x}px, ${viewTransform.pan.y}px) scale(${viewTransform.scale})`,
            transformOrigin: '0 0',
        }}
      >
        <div className="absolute left-1/2 top-1/2" style={{width: `${WORLD_WIDTH}px`, height: `${WORLD_HEIGHT}px`, transform: 'translate(-50%, -50%)'}}>
            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(107, 114, 128, 0.2)" strokeWidth="0.5"/></pattern>
                <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#smallGrid)"/><path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(107, 114, 128, 0.4)" strokeWidth="1"/></pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
        </div>
        
        <div 
            className="absolute bg-white/10 border border-white"
            style={{
                width: resolution.width,
                height: resolution.height,
                transform: `translate(-50%, -50%)`,
            }}
        />

        {sortedVisibleGameObjects.map(go => {
            const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
            if (!transform) return null;

            if (go.type === 'platform') {
                const platformController = go.behaviors.find(b => b.type === 'platformController');
                if (platformController && platformController.properties.isVisible === false) {
                    return null;
                }
            }
            
            const size = { width: 32 * (transform.scale.x || 1), height: 32 * (transform.scale.y || 1) };

            if (go.type === 'hitbox') {
                const color = go.color || '#34d399';
                const hexColor = (color.startsWith('#') && color.length === 7) ? color : '#34d399';
                const backgroundColor = `${hexColor}80`;

                const style: React.CSSProperties = {
                    left: `${transform.position.x}px`,
                    top: `${transform.position.y}px`,
                    width: `${size.width}px`,
                    height: `${size.height}px`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: backgroundColor,
                    border: `2px solid ${color}`,
                };
                return <div key={go.id} className="absolute pointer-events-none" style={style} />;
            }

            if (go.type === 'text') {
                const textRenderer = go.behaviors.find(b => b.type === 'textRenderer') as TextRendererBehavior | undefined;
                if (!textRenderer) return null;
                const fontAsset = textRenderer.properties.customFontAssetId ? findAssetById(assets, textRenderer.properties.customFontAssetId) : null;
                const textStyle: React.CSSProperties = {
                    fontFamily: fontAsset ? fontAsset.id : textRenderer.properties.font,
                    fontSize: `${textRenderer.properties.size}px`,
                    color: textRenderer.properties.color,
                    fontWeight: textRenderer.properties.style.includes('bold') ? 'bold' : 'normal',
                    fontStyle: textRenderer.properties.style.includes('italic') ? 'italic' : 'normal',
                    textAlign: textRenderer.properties.align,
                    whiteSpace: 'pre-wrap',
                    minWidth: `${size.width}px`,
                    position: 'absolute',
                    left: `${transform.position.x}px`,
                    top: `${transform.position.y}px`,
                    transform: 'translate(-50%, -50%)',
                };
                return <div key={go.id} style={textStyle} className="pointer-events-none">{textRenderer.properties.text}</div>;
            }

            const spriteSrc = getGameObjectSpriteSrc(go, assets);
            const spriteRenderer = go.behaviors.find(b => b.type === 'spriteRenderer');
            const isTiled = spriteRenderer?.properties.renderMode === 'tiled';

            const baseStyle: React.CSSProperties = {
                left: `${transform.position.x}px`,
                top: `${transform.position.y}px`,
                width: `${size.width}px`,
                height: `${size.height}px`,
                transform: 'translate(-50%, -50%)',
                imageRendering: 'pixelated',
            };
            
            return (
              <div key={go.id} className="absolute pointer-events-none" style={baseStyle}>
                {spriteSrc && isTiled && (
                    <div style={{
                      width: '100%', height: '100%',
                      backgroundImage: `url(${spriteSrc})`, backgroundRepeat: 'repeat', backgroundSize: '32px 32px',
                    }} />
                )}
                 {spriteSrc && !isTiled && (
                    <img src={spriteSrc} alt={go.name} style={{ width: '100%', height: '100%' }} onLoad={(e) => {
                        const img = e.currentTarget;
                        if (!imageCache.has(img.src)) {
                            imageCache.set(img.src, { width: img.naturalWidth, height: img.naturalHeight });
                        }
                    }}/>
                 )}
                 {!spriteSrc && (
                    <div className="w-full h-full bg-pink-500/50 border-2 border-dashed border-pink-400" />
                 )}
              </div>
            );
        })}

        {showHitboxes && sortedVisibleGameObjects.map(go => {
            if (!go.useCustomHitboxes) return null;
            const hitboxes = getGameObjectWorldHitboxes(go);
            const color = go.hitboxColor || '#00FF00';
            const backgroundColor = color.startsWith('hsl')
                ? color.replace(')', ', 0.5)').replace('hsl', 'hsla')
                : '#34d39980';

            return hitboxes.map((hb, index) => (
                <div
                    key={`${go.id}-${(hb as Hitbox).id || index}`}
                    className="absolute pointer-events-none"
                    style={{
                        left: hb.x,
                        top: hb.y,
                        width: hb.width,
                        height: hb.height,
                        backgroundColor,
                    }}
                />
            ));
        })}

        {selectedObjects.map(selectedObject => {
            const visualBbox = getGameObjectBoundingBox(selectedObject);
            if (!visualBbox) return null;
        
            const hasValidBbox = isFinite(visualBbox.x);
            // Allow resizing even if custom hitboxes are used.
            const canResize = selectedObjects.length === 1 && !selectedObject.isLocked && selectedObject.type !== 'text' && selectedObject.type !== 'hitbox' && hasValidBbox;
        
            const selectionStyle: React.CSSProperties = {
                left: visualBbox.x,
                top: visualBbox.y,
                width: visualBbox.width,
                height: visualBbox.height,
            };
            
            return (
                <React.Fragment key={`${selectedObject.id}-selection`}>
                    {/* If using custom hitboxes, render their outlines for reference */}
                    {selectedObject.useCustomHitboxes && getGameObjectWorldHitboxes(selectedObject).map((hb, index) => (
                        <div
                            key={`${selectedObject.id}-${(hb as any).id || index}-selection`}
                            className="absolute border-2 border-cyan-400/50 pointer-events-none"
                            style={{
                                left: hb.x,
                                top: hb.y,
                                width: hb.width,
                                height: hb.height,
                            }}
                        />
                    ))}
                    {/* Render the main selection box based on the visual bounds */}
                    <div
                        className="absolute border-2 border-cyan-400 pointer-events-none"
                        style={selectionStyle}
                    />
                    {/* Render resize handles based on the visual bounds */}
                    {canResize && [
                        { type: 'resize-tl', cursor: 'nwse-resize', left: visualBbox.x, top: visualBbox.y },
                        { type: 'resize-tr', cursor: 'nesw-resize', left: visualBbox.x + visualBbox.width, top: visualBbox.y },
                        { type: 'resize-bl', cursor: 'nesw-resize', left: visualBbox.x, top: visualBbox.y + visualBbox.height },
                        { type: 'resize-br', cursor: 'nwse-resize', left: visualBbox.x + visualBbox.width, top: visualBbox.y + visualBbox.height },
                    ].map(h => (
                         <div 
                            key={h.type}
                            className={`absolute w-3 h-3 bg-white rounded-full border-2 border-cyan-500 pointer-events-auto`}
                            style={{ 
                                cursor: h.cursor, 
                                left: h.left, 
                                top: h.top,
                                transform: `translate(-50%, -50%) scale(${1 / viewTransform.scale})` 
                            }}
                            onMouseDown={(e) => handleResizeHandleMouseDown(e, selectedObject, h.type as InteractionType)}
                         />
                    ))}
                </React.Fragment>
            );
        })}
      </div>
      {renderMarquee()}
       <div className={`absolute inset-0 transition-opacity duration-300 pointer-events-none ${isDragOver ? 'bg-cyan-400/10 ring-2 ring-cyan-400 ring-inset' : ''}`}/>
        <div 
            className="absolute bottom-0 left-0 right-[14px] h-3.5 bg-gray-900/50 rounded-md"
            onMouseDown={e => e.stopPropagation()}
        >
            <div 
                className="absolute h-full bg-gray-500/80 rounded-full hover:bg-gray-400 cursor-pointer"
                style={{ width: `${scrollbarProps.horz.thumbSize}px`, left: `${scrollbarProps.horz.thumbPos}px` }}
                onMouseDown={(e) => {
                    const rect = sceneRef.current!.getBoundingClientRect();
                    const initialMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                    const newInteraction: InteractionState = { type: 'scroll-x', initialMousePos, initialPan: viewTransform.pan };
                    setInteraction(newInteraction);
                    interactionRef.current = newInteraction;
                }}
            />
        </div>
        <div 
            className="absolute top-0 right-0 bottom-[14px] w-3.5 bg-gray-900/50 rounded-md"
            onMouseDown={e => e.stopPropagation()}
        >
            <div
                className="absolute w-full bg-gray-500/80 rounded-full hover:bg-gray-400 cursor-pointer"
                style={{ height: `${scrollbarProps.vert.thumbSize}px`, top: `${scrollbarProps.vert.thumbPos}px` }}
                onMouseDown={(e) => {
                    const rect = sceneRef.current!.getBoundingClientRect();
                    const initialMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
                    const newInteraction: InteractionState = { type: 'scroll-y', initialMousePos, initialPan: viewTransform.pan };
                    setInteraction(newInteraction);
                    interactionRef.current = newInteraction;
                }}
            />
        </div>
        <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-gray-800" onMouseDown={e => e.stopPropagation()}/>
    </div>
  );
};

export default SceneView;
