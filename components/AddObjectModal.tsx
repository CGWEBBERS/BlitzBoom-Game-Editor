import React from 'react';
import { GameObjectType } from '../types';
import CloseIcon from './icons/CloseIcon';
import ImageIcon from './icons/ImageIcon';
import MusicIcon from './icons/MusicIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import GridIcon from './icons/GridIcon';
import CodeIcon from './icons/CodeIcon';
import TypeIcon from './icons/TypeIcon';
import BugIcon from './icons/BugIcon';

interface AddObjectModalProps {
  onClose: () => void;
  onSelectObjectType: (type: GameObjectType) => void;
}

const objectTypes: { type: GameObjectType, name: string, description: string, icon: React.ReactNode }[] = [
    { type: 'sprite', name: 'Sprite Object', description: 'A visual object with animations and graphics.', icon: <ImageIcon className="w-8 h-8 text-cyan-400" /> },
    { type: 'player', name: 'Player', description: 'A character with built-in platformer physics.', icon: <CodeIcon className="w-8 h-8 text-green-400" /> },
    { type: 'enemy', name: 'Enemy', description: 'An enemy with built-in platformer physics.', icon: <CodeIcon className="w-8 h-8 text-red-500" /> },
    { type: 'platform', name: 'Platform Object', description: 'A static or moving solid platform.', icon: <div className="w-8 h-8 bg-yellow-600 rounded-sm" /> },
    { type: 'background', name: 'Background Image', description: 'A static, animated, or parallax-scrolling background.', icon: <ImageIcon className="w-8 h-8 text-blue-400" /> },
    { type: 'text', name: 'Text Object', description: 'Displays customizable text on screen.', icon: <TypeIcon className="w-8 h-8 text-indigo-400" /> },
    { type: 'sound', name: 'Sound Object', description: 'An object that plays a sound effect.', icon: <SpeakerIcon className="w-8 h-8 text-purple-400" /> },
    { type: 'music', name: 'Music Object', description: 'An object that plays looping background music.', icon: <MusicIcon className="w-8 h-8 text-pink-400" /> },
    { type: 'tiled', name: 'Tiled Object', description: 'An object that repeats a texture to form a surface.', icon: <GridIcon className="w-8 h-8 text-orange-400" /> },
    { type: 'hitbox', name: 'HitBox', description: 'A visible box for collision detection or triggers.', icon: <BugIcon className="w-8 h-8 text-green-400" /> },
    { type: 'empty', name: 'Empty Object', description: 'A container with only a transform.', icon: <div className="w-8 h-8 border-2 border-dashed border-gray-500 rounded-full" /> },
];

const AddObjectModal: React.FC<AddObjectModalProps> = ({ onClose, onSelectObjectType }) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-8 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl border border-gray-700 flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="font-bold text-lg">Create New Game Object</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full">
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>
        <main className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto">
          {objectTypes.map(({ type, name, description, icon }) => (
            <button
              key={type}
              onClick={() => onSelectObjectType(type)}
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

export default AddObjectModal;
