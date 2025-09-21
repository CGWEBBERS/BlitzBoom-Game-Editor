import React, { useState, useRef, MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent, useCallback, useEffect } from 'react';
import { GameObject, Vector2, SelectedItems, Layer, EntityType3D, Scene } from '../types';
import WallIcon from './icons/WallIcon';
import PlayerStartIcon from './icons/PlayerStartIcon';
import FloorIcon from './icons/FloorIcon';
import CubeIcon from './icons/CubeIcon';
import EraserIcon from './icons/EraserIcon';

const GRID_SIZE = 32;

interface SceneView3DProps {
  gameObjects: GameObject[];
  layers: Layer[];
  activeScene: Scene;
  selectedItems: SelectedItems;
  onSelectionChange: (selection: SelectedItems, options?: { addToSelection: boolean }) => void;
  onGameObjectUpdate: (updatedObject: GameObject) => void;
  onAddGameObject: (entityType: EntityType3D, gridPosition: Vector2, zIndex?: number) => void;
  onDeleteGameObject: (id: string) => void;
}

type InteractionType = 'draw' | 'pan' | null;

interface InteractionState {
  type: InteractionType;
  initialMousePos: Vector2;
  initialPan?: Vector2;
}

type ToolType = EntityType3D | 'delete';

interface Tool {
  type: ToolType;
  name: string;
  icon: React.ReactNode;
}

const tools: Tool[] = [
    { type: 'wall', name: 'Wall', icon: <WallIcon className="w-5 h-5" /> },
    { type: 'floor', name: 'Floor', icon: <FloorIcon className="w-5 h-5" /> },
    { type: 'player_start', name: 'Player Start', icon: <PlayerStartIcon className="w-5 h-5" /> },
    { type: 'obstacle', name: 'Obstacle', icon: <CubeIcon className="w-5 h-5" /> },
    { type: 'delete', name: 'Delete Object', icon: <EraserIcon className="w-5 h-5" /> },
];

const IconFor3D: React.FC<{type?: string, className?: string}> = ({ type, className = "w-6 h-6" }) => {
    switch (type) {
        case 'wall': return <WallIcon className={`${className} text-gray-400`} />;
        case 'floor': return <FloorIcon className={`${className} text-gray-500`} />;
        case 'player_start': return <PlayerStartIcon className={`${className} text-cyan-400`} />;
        default: return <CubeIcon className={`${className} text-purple-400`} />;
    }
}

const SceneView3D: React.FC<SceneView3DProps> = ({ gameObjects, layers, activeScene, selectedItems, onSelectionChange, onGameObjectUpdate, onAddGameObject, onDeleteGameObject }) => {
  const [viewTransform, setViewTransform] = useState({ scale: 1, pan: { x: 0, y: 0 } });
  const [mouseGridPos, setMouseGridPos] = useState<Vector2 | null>(null);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>('wall');
  const drawnOrDeletedCells = useRef(new Set<string>());
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (sceneRef.current) {
      const { width, height } = sceneRef.current.getBoundingClientRect();
      setViewTransform(vt => ({...vt, pan: { x: width/2, y: height/2 }}));
    }
  }, []);

  const screenToWorld = useCallback((screenPos: Vector2): Vector2 => {
    return {
      x: (screenPos.x - viewTransform.pan.x) / viewTransform.scale,
      y: (screenPos.y - viewTransform.pan.y) / viewTransform.scale,
    };
  }, [viewTransform]);

  const worldToGrid = (worldPos: Vector2): Vector2 => {
    return {
      x: Math.floor(worldPos.x / GRID_SIZE),
      y: Math.floor(worldPos.y / GRID_SIZE),
    };
  };

  const handleInteractionAtGridPos = useCallback((gridPos: Vector2) => {
    const cellKey = `${gridPos.x},${gridPos.y}`;
    if (drawnOrDeletedCells.current.has(cellKey)) return;

    const objectsAtPos = gameObjects.filter(go => go.gridPosition?.x === gridPos.x && go.gridPosition?.y === gridPos.y);

    if (activeTool === 'delete') {
      if (objectsAtPos.length > 0) {
        // Find the top-most object (highest zIndex) to delete
        const topObject = objectsAtPos.reduce((top, obj) => ((obj.zIndex ?? 0) > (top.zIndex ?? 0) ? obj : top), objectsAtPos[0]);
        onDeleteGameObject(topObject.id);
        drawnOrDeletedCells.current.add(cellKey); // Mark cell as acted upon
      }
    } else {
      const maxZIndex = objectsAtPos.reduce((max, obj) => Math.max(max, obj.zIndex ?? 0), -1);
      const newZIndex = activeTool === 'floor' ? -1 : maxZIndex + 1;
      onAddGameObject(activeTool, gridPos, newZIndex);
      drawnOrDeletedCells.current.add(cellKey);
    }
  }, [activeTool, gameObjects, onAddGameObject, onDeleteGameObject]);


  const handleMouseDown = (e: ReactMouseEvent) => {
    const rect = sceneRef.current!.getBoundingClientRect();
    const initialMousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    drawnOrDeletedCells.current.clear();

    if (e.button === 0 && mouseGridPos) { // Left click
      setInteraction({ type: 'draw', initialMousePos });
      handleInteractionAtGridPos(mouseGridPos);
    } else if (e.button === 1) { // Middle click
      setInteraction({ type: 'pan', initialMousePos, initialPan: viewTransform.pan });
    }
  };
  
  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!sceneRef.current) return;
    const rect = sceneRef.current.getBoundingClientRect();
    const mousePos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPos = screenToWorld(mousePos);
    const newMouseGridPos = worldToGrid(worldPos);
    setMouseGridPos(newMouseGridPos);
    
    if (!interaction) return;

    if (interaction.type === 'draw') {
        handleInteractionAtGridPos(newMouseGridPos);
    } else if (interaction.type === 'pan' && interaction.initialPan) {
        const dx = mousePos.x - interaction.initialMousePos.x;
        const dy = mousePos.y - interaction.initialMousePos.y;
        setViewTransform(vt => ({ ...vt, pan: { x: interaction.initialPan!.x + dx, y: interaction.initialPan!.y + dy } }));
    }
  };

  const handleMouseUp = (e: ReactMouseEvent) => {
    if (e.button === 0 || e.button === 1) {
        setInteraction(null);
        drawnOrDeletedCells.current.clear();
    }
  };

  const handleMouseLeave = () => {
    setMouseGridPos(null);
    setInteraction(null);
    drawnOrDeletedCells.current.clear();
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
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const rect = sceneRef.current!.getBoundingClientRect();
      const dropPositionWorld = screenToWorld({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
      });
      const dropPositionGrid = worldToGrid(dropPositionWorld);

      if (e.dataTransfer.types.includes('application/blizboom-gameobject-id')) {
          const gameObjectId = e.dataTransfer.getData('application/blizboom-gameobject-id');
          const objectToMove = gameObjects.find(go => go.id === gameObjectId);
          if (objectToMove) {
              onGameObjectUpdate({ ...objectToMove, gridPosition: dropPositionGrid });
          }
      }
  };


  const visibleGameObjects = gameObjects.filter(go => {
    const layer = layers.find(l => l.name === go.layer);
    return layer ? layer.isVisible : true;
  });

  const sortedVisibleGameObjects = [...visibleGameObjects].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

  return (
    <div
      ref={sceneRef}
      className={`h-full w-full bg-gray-700/50 relative overflow-hidden select-none ${interaction?.type === 'pan' ? 'cursor-grabbing' : ''}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
        <div
            className="absolute inset-0"
            style={{
                backgroundSize: `${GRID_SIZE * viewTransform.scale}px ${GRID_SIZE * viewTransform.scale}px`,
                backgroundPosition: `${viewTransform.pan.x}px ${viewTransform.pan.y}px`,
                backgroundImage: `
                    linear-gradient(rgba(107, 114, 128, 0.2) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(107, 114, 128, 0.2) 1px, transparent 1px)
                `,
            }}
        />

      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${viewTransform.pan.x}px, ${viewTransform.pan.y}px) scale(${viewTransform.scale})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Render Game Objects on Grid */}
        {sortedVisibleGameObjects.map(go => {
          if (!go.gridPosition) return null;
          const isSelected = selectedItems?.type === 'gameobject' && selectedItems.ids.includes(go.id);
          return (
            <div
              key={go.id}
              className={`absolute flex items-center justify-center transition-colors cursor-pointer
                          ${isSelected ? 'bg-cyan-500/50' : 'bg-gray-800/50 hover:bg-gray-800/80'}`}
              style={{
                left: go.gridPosition.x * GRID_SIZE,
                top: go.gridPosition.y * GRID_SIZE,
                width: GRID_SIZE,
                height: GRID_SIZE,
              }}
              onClick={() => onSelectionChange({type: 'gameobject', ids: [go.id]})}
            >
              <IconFor3D type={go.entityType3D} />
            </div>
          );
        })}

        {/* Mouse Cursor Highlight */}
        {mouseGridPos && (
          <div
            className="absolute bg-cyan-400/20 pointer-events-none"
            style={{
              left: mouseGridPos.x * GRID_SIZE,
              top: mouseGridPos.y * GRID_SIZE,
              width: GRID_SIZE,
              height: GRID_SIZE,
            }}
          />
        )}
      </div>
        <div className="absolute top-2 left-2 z-10 bg-gray-900/50 p-1 rounded-lg flex space-x-1 backdrop-blur-sm border border-gray-700/50">
            {tools.map(tool => (
                <button
                key={tool.type}
                onClick={() => setActiveTool(tool.type)}
                className={`p-2 rounded-md transition-colors ${activeTool === tool.type ? 'bg-cyan-600' : 'hover:bg-gray-700'}`}
                title={tool.name}
                >
                {tool.icon}
                </button>
            ))}
        </div>
    </div>
  );
};

export default SceneView3D;