import React, { useState, useRef } from 'react';
import { GameObject, SelectedItems, Scene } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import WallIcon from './icons/WallIcon';
import FloorIcon from './icons/FloorIcon';
import PlayerStartIcon from './icons/PlayerStartIcon';
import CubeIcon from './icons/CubeIcon';
import LightIcon from './icons/LightIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import LockIcon from './icons/LockIcon';


interface ObjectsPanelProps {
  scenes: Scene[];
  activeSceneId: string;
  gameObjects: GameObject[];
  selectedItems: SelectedItems;
  onSelect: (selection: SelectedItems, options?: { addToSelection: boolean }) => void;
  onAddGameObject: () => void;
  onNewScene: () => void;
  onSelectScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  onRenameScene: (sceneId: string, newName: string) => void;
  onReorderScenes: (dragIndex: number, hoverIndex: number) => void;
}

const IconFor3D: React.FC<{type?: string, className?: string}> = ({ type, className = "w-4 h-4" }) => {
    switch (type) {
        case 'wall': return <WallIcon className={`${className} text-gray-400`} />;
        case 'floor': return <FloorIcon className={`${className} text-gray-500`} />;
        case 'player_start': return <PlayerStartIcon className={`${className} text-cyan-400`} />;
        case 'light_source': return <LightIcon className={`${className} text-yellow-400`} />;
        case 'sound_source': return <SpeakerIcon className={`${className} text-pink-400`} />;
        case 'obstacle': return <CubeIcon className={`${className} text-red-400`} />;
        default: return <CubeIcon className={`${className} text-purple-400`} />;
    }
}

const ObjectsPanel: React.FC<ObjectsPanelProps> = ({
  scenes,
  activeSceneId,
  gameObjects,
  selectedItems,
  onSelect,
  onAddGameObject,
  onNewScene,
  onSelectScene,
  onDeleteScene,
  onRenameScene,
  onReorderScenes,
}) => {
  const [mode, setMode] = useState<'objects' | 'scenes'>('objects');
  const [renamingSceneId, setRenamingSceneId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const dragSceneIndex = useRef<number | null>(null);
  const activeScene = scenes.find(s => s.id === activeSceneId);
  const is3D = activeScene?.type === '3d';

  const handleRenameStart = (scene: Scene) => {
    setRenamingSceneId(scene.id);
    setRenameValue(scene.name);
  };

  const handleRenameConfirm = () => {
    if (renamingSceneId && renameValue.trim()) {
      onRenameScene(renamingSceneId, renameValue.trim());
    }
    setRenamingSceneId(null);
  };

  const handleDragStart = (e: React.DragEvent, obj: GameObject) => {
    if (obj.isLocked) {
        e.preventDefault();
        return;
    }
    e.dataTransfer.setData('application/blizboom-gameobject-id', obj.id);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleSceneDragStart = (e: React.DragEvent, index: number) => {
    dragSceneIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleSceneDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragSceneIndex.current === null || dragSceneIndex.current === dropIndex) {
      return;
    }
    onReorderScenes(dragSceneIndex.current, dropIndex);
    dragSceneIndex.current = null;
  };

  const renderGameObject = (obj: GameObject) => {
    const isSelected = selectedItems?.type === 'gameobject' && selectedItems.ids.includes(obj.id);
    return (
      <div key={obj.id} className="ml-4 first:ml-0">
        <div 
          onClick={(e) => onSelect({ type: 'gameobject', ids: [obj.id] }, { addToSelection: e.shiftKey })}
          draggable={!obj.isLocked}
          onDragStart={(e) => handleDragStart(e, obj)}
          className={`flex items-center space-x-2 p-1.5 rounded-md cursor-pointer ${obj.isLocked ? 'cursor-default' : ''} ${isSelected ? 'bg-cyan-600' : 'hover:bg-gray-700/50'}`}
        >
            {is3D ? <IconFor3D type={obj.entityType3D} /> : <div className="w-2 h-2 rounded-sm bg-yellow-400 flex-shrink-0"></div>}
          <span className="text-sm truncate">{obj.name}</span>
          {obj.isLocked && <LockIcon className="w-3 h-3 text-gray-500 flex-shrink-0" />}
        </div>
        {obj.children && obj.children.map(renderGameObject)}
      </div>
    );
  };

  const renderScene = (scene: Scene, index: number) => {
    const isSelected = scene.id === activeSceneId;
    const isRenaming = scene.id === renamingSceneId;
    const typeBadgeClass = scene.type === '3d' ? 'bg-indigo-500' : 'bg-pink-500';
    return (
       <div
        key={scene.id}
        onClick={() => !isRenaming && onSelectScene(scene.id)}
        onDoubleClick={() => handleRenameStart(scene)}
        draggable
        onDragStart={(e) => handleSceneDragStart(e, index)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleSceneDrop(e, index)}
        className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer ${isSelected ? 'bg-cyan-600' : 'hover:bg-gray-700/50'}`}
      >
        <div className="flex items-center space-x-2 truncate">
            <div className={`w-2 h-2 rounded-sm ${isSelected ? 'bg-white' : 'bg-green-400'} flex-shrink-0`}></div>
            {isRenaming ? (
                <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={handleRenameConfirm}
                    onKeyDown={(e) => e.key === 'Enter' && handleRenameConfirm()}
                    className="bg-gray-900 text-sm p-0.5 rounded w-full outline-none ring-1 ring-cyan-500"
                    autoFocus
                />
            ) : (
              <>
                <span className="text-sm truncate">{scene.name}</span>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${typeBadgeClass}`}>{scene.type.toUpperCase()}</span>
              </>
            )}
        </div>
        <button
            onClick={(e) => { e.stopPropagation(); onDeleteScene(scene.id); }}
            className="p-1 text-gray-400 hover:text-white hover:bg-red-500/20 rounded-md flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            disabled={scenes.length <= 1}
            title={scenes.length <= 1 ? "Cannot delete the last scene" : "Delete Scene"}
        >
            <TrashIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg flex flex-col overflow-hidden h-full">
      <div className="bg-gray-900/70 text-gray-300 text-sm font-semibold px-3 py-2 border-b border-gray-700 flex justify-between items-center">
        <span>{mode === 'objects' ? 'Scene Objects' : 'Scenes'}</span>
        <button 
          onClick={mode === 'objects' ? onAddGameObject : onNewScene} 
          title={
              mode === 'objects' 
              ? (is3D ? "Add 3D Entity" : "Add Game Object") 
              : "Add New Scene"
          }
          className="p-1 hover:bg-gray-700 rounded-md"
        >
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-shrink-0 p-1 bg-gray-900/70 border-b border-gray-700 flex items-center space-x-1">
        <button
          onClick={() => setMode('objects')}
          className={`flex-1 text-center text-xs font-semibold py-1 rounded-md ${mode === 'objects' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700/50'}`}
        >
          Objects
        </button>
        <button
          onClick={() => setMode('scenes')}
          className={`flex-1 text-center text-xs font-semibold py-1 rounded-md ${mode === 'scenes' ? 'bg-cyan-600 text-white' : 'hover:bg-gray-700/50'}`}
        >
          Scenes
        </button>
      </div>
      <div className="flex-grow p-2 overflow-auto space-y-1">
        {mode === 'objects' ? gameObjects.map(renderGameObject) : scenes.map(renderScene)}
      </div>
    </div>
  );
};

export default ObjectsPanel;