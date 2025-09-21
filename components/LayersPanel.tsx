import React from 'react';
import { Layer } from '../types';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';
import LockIcon from './icons/LockIcon';
import UnlockIcon from './icons/UnlockIcon';

interface LayersPanelProps {
  layers: Layer[];
  activeLayerName: string;
  onLayersChange: (layers: Layer[]) => void;
  onSetActiveLayer: (name: string) => void;
  onDeleteLayer: (name: string) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ layers, activeLayerName, onLayersChange, onSetActiveLayer, onDeleteLayer }) => {
  
  const handleAddLayer = () => {
    let newLayerName = `Layer ${layers.length}`;
    let counter = layers.length;
    while(layers.some(l => l.name === newLayerName)) {
        counter++;
        newLayerName = `Layer ${counter}`;
    }
    onLayersChange([...layers, { name: newLayerName, isVisible: true, isLocked: false }]);
  };

  const handleToggleVisibility = (index: number) => {
    const newLayers = [...layers];
    newLayers[index].isVisible = !newLayers[index].isVisible;
    onLayersChange(newLayers);
  };

  const handleToggleLock = (index: number) => {
    const newLayers = [...layers];
    newLayers[index].isLocked = !newLayers[index].isLocked;
    onLayersChange(newLayers);
  };

  return (
    <div className="bg-gray-800 rounded-lg flex flex-col h-full text-sm text-gray-300">
      <div className="bg-gray-900/70 font-semibold px-3 py-2 border-b border-gray-700 flex justify-between items-center">
        <span>Layers</span>
        <button onClick={handleAddLayer} className="flex items-center space-x-1 text-xs bg-cyan-600 hover:bg-cyan-500 px-2 py-1 rounded-md">
          <PlusIcon className="w-3 h-3"/>
          <span>Add a layer</span>
        </button>
      </div>
      <div className="flex-grow overflow-auto">
        {layers.map((layer, index) => (
          <div 
            key={layer.name} 
            className={`flex items-center justify-between p-2 cursor-pointer transition-colors ${activeLayerName === layer.name ? 'bg-cyan-600/50' : 'hover:bg-gray-700/50'}`}
            onClick={() => onSetActiveLayer(layer.name)}
          >
            <span className="font-semibold">{layer.name}</span>
            <div className="flex items-center space-x-3">
              <button onClick={(e) => { e.stopPropagation(); handleToggleVisibility(index); }} title="Toggle Visibility">
                {layer.isVisible ? <EyeIcon className="w-4 h-4 text-gray-400 hover:text-white" /> : <EyeOffIcon className="w-4 h-4 text-gray-500 hover:text-white" />}
              </button>
               <button onClick={(e) => { e.stopPropagation(); handleToggleLock(index); }} title="Toggle Lock">
                {layer.isLocked ? <LockIcon className="w-4 h-4 text-gray-400 hover:text-white" /> : <UnlockIcon className="w-4 h-4 text-gray-500 hover:text-white" />}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.name); }} 
                title="Delete Layer"
                disabled={layer.name === 'Default'}
                className="disabled:opacity-25 disabled:cursor-not-allowed"
              >
                <TrashIcon className="w-4 h-4 text-gray-500 hover:text-red-500" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LayersPanel;