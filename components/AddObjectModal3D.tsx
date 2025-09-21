import React, { useState } from 'react';
import { EntityType3D, Vector2 } from '../types';
import CloseIcon from './icons/CloseIcon';
import WallIcon from './icons/WallIcon';
import FloorIcon from './icons/FloorIcon';
import PlayerStartIcon from './icons/PlayerStartIcon';
import CubeIcon from './icons/CubeIcon';
import LightIcon from './icons/LightIcon';
import SpeakerIcon from './icons/SpeakerIcon';


interface AddObjectModal3DProps {
  onClose: () => void;
  onSelectEntityType: (type: EntityType3D, position: Vector2) => void;
}

const objectTypes: { type: EntityType3D, name: string, description: string, icon: React.ReactNode }[] = [
    { type: 'wall', name: 'Wall', description: 'A basic building block for your level.', icon: <WallIcon className="w-8 h-8 text-gray-400" /> },
    { type: 'floor', name: 'Floor', description: 'A floor segment. (Note: A large floor is added automatically in preview).', icon: <FloorIcon className="w-8 h-8 text-gray-500" /> },
    { type: 'player_start', name: 'Player Start', description: 'Defines the starting position and orientation for the player.', icon: <PlayerStartIcon className="w-8 h-8 text-cyan-400" /> },
    { type: 'obstacle', name: 'Obstacle', description: 'A generic prop object that can be interacted with.', icon: <CubeIcon className="w-8 h-8 text-red-400" /> },
    { type: 'light_source', name: 'Light Source', description: 'Adds a point of light to the scene.', icon: <LightIcon className="w-8 h-8 text-yellow-400" /> },
    { type: 'sound_source', name: 'Sound Source', description: 'Adds a spatialized sound to the scene.', icon: <SpeakerIcon className="w-8 h-8 text-pink-400" /> },
];

const AddObjectModal3D: React.FC<AddObjectModal3DProps> = ({ onClose, onSelectEntityType }) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-8 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg border border-gray-700 flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="font-bold text-lg">Create New 3D Object</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full">
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>
        <main className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
          {objectTypes.map(({ type, name, description, icon }) => (
            <button
              key={type}
              onClick={() => onSelectEntityType(type, { x: 0, y: 0 })}
              className="bg-gray-900/50 hover:bg-gray-700/80 p-4 rounded-lg flex flex-col items-center justify-start text-center space-y-3 transition-colors ring-1 ring-transparent hover:ring-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              title={description}
            >
              {icon}
              <span className="font-semibold text-sm">{name}</span>
            </button>
          ))}
        </main>
      </div>
    </div>
  );
};

export default AddObjectModal3D;