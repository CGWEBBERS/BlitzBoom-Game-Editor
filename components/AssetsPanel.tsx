import React from 'react';
import { Asset, AssetType } from '../types';
import FolderIcon from './icons/FolderIcon';
import ImageIcon from './icons/ImageIcon';
import CodeIcon from './icons/CodeIcon';
import MusicIcon from './icons/MusicIcon';
import VideoIcon from './icons/VideoIcon';
import TypeIcon from './icons/TypeIcon';

interface AssetsPanelProps {
  assets: Asset[];
}

const AssetTree: React.FC<{ assets: Asset[], level?: number }> = ({ assets, level = 0 }) => {
  
  const handleDragStart = (e: React.DragEvent, asset: Asset) => {
    if (asset.type === AssetType.Image) {
      e.dataTransfer.setData('application/json', JSON.stringify(asset));
      e.dataTransfer.effectAllowed = 'copy';
    } else {
      e.preventDefault();
    }
  };

  return (
    <div>
      {assets.map(asset => (
        <div key={asset.id} style={{ paddingLeft: `${level * 16}px` }}>
          <div 
            className="flex items-center space-x-2 p-1.5 rounded-md hover:bg-gray-700/50 cursor-pointer"
            draggable={asset.type === AssetType.Image}
            onDragStart={(e) => handleDragStart(e, asset)}
          >
            {asset.type === AssetType.Folder && <FolderIcon className="w-4 h-4 text-yellow-500 flex-shrink-0" />}
            {asset.type === AssetType.Image && <ImageIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />}
            {asset.type === AssetType.Script && <CodeIcon className="w-4 h-4 text-green-400 flex-shrink-0" />}
            {asset.type === AssetType.Audio && <MusicIcon className="w-4 h-4 text-pink-400 flex-shrink-0" />}
            {asset.type === AssetType.Video && <VideoIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />}
            {asset.type === AssetType.Font && <TypeIcon className="w-4 h-4 text-indigo-400 flex-shrink-0" />}
            <span className="text-sm truncate">{asset.name}</span>
          </div>
          {asset.children && <AssetTree assets={asset.children} level={level + 1} />}
        </div>
      ))}
    </div>
  );
};


const AssetsPanel: React.FC<AssetsPanelProps> = ({ assets }) => {
  return (
    <div className="bg-gray-800 rounded-lg flex flex-col overflow-hidden h-full">
      <div className="bg-gray-900/70 text-gray-300 text-sm font-semibold px-3 py-2 border-b border-gray-700 flex justify-between items-center">
        <span>Assets</span>
      </div>
      <div className="flex-grow p-2 overflow-auto">
        <AssetTree assets={assets} />
      </div>
    </div>
  );
};

export default AssetsPanel;