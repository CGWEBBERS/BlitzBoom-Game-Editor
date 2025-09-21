import React, { useState, useEffect, useRef } from 'react';
import PlayIcon from './icons/PlayIcon';
import BookOpenIcon from './icons/BookOpenIcon';
import ExportIcon from './icons/ExportIcon';
import MenuIcon from './icons/MenuIcon';
import BugIcon from './icons/BugIcon';

interface HeaderProps {
  activeView: 'Game Scene' | 'Events';
  onPreview: () => void;
  onViewChange: (view: 'Game Scene' | 'Events') => void;
  onShowManual: () => void;
  onNewProject: () => void;
  onProjectSettings: () => void;
  onSaveProject: () => void;
  onLoadProject: () => void;
  onExportProject: () => void;
  is3DScene: boolean;
  showHitboxes: boolean;
  onToggleHitboxes: () => void;
}

const MenuItem: React.FC<{ onClick: () => void; children: React.ReactNode; disabled?: boolean }> = ({ onClick, children, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="w-full text-left px-3 py-1.5 text-sm text-gray-200 hover:bg-cyan-600 transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
  >
    {children}
  </button>
);


const Header: React.FC<HeaderProps> = ({ activeView, onPreview, onViewChange, onShowManual, onNewProject, onProjectSettings, onSaveProject, onLoadProject, onExportProject, is3DScene, showHitboxes, onToggleHitboxes }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const buttonBaseClasses = "px-4 py-1.5 text-sm font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-cyan-500";
  const activeClasses = "bg-cyan-600 text-white";
  const inactiveClasses = "text-gray-300 hover:bg-gray-700/50";

  const utilityButtonClasses = "bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold px-4 py-1.5 rounded-md transition-colors flex items-center space-x-2";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-gray-900 border-b border-gray-700/50 px-4 py-2 flex items-center justify-between flex-shrink-0 text-gray-300">
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-bold text-cyan-400">BlitzBoom</h1>
        <div className="relative" ref={menuRef}>
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center space-x-2 text-sm font-semibold text-gray-300 hover:bg-gray-700/50 px-3 py-1.5 rounded-md">
                <MenuIcon className="w-4 h-4" />
                <span>Menu</span>
            </button>
            {isMenuOpen && (
                <div className="absolute left-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-md shadow-lg p-2 z-50">
                    <MenuItem onClick={onNewProject}>Create New Project</MenuItem>
                    <MenuItem onClick={onProjectSettings}>Project Settings</MenuItem>
                    <hr className="border-gray-700 my-1" />
                    <MenuItem onClick={onSaveProject}>Save Project</MenuItem>
                    <MenuItem onClick={onLoadProject}>Load Project</MenuItem>
                    <hr className="border-gray-700 my-1" />
                    <MenuItem onClick={onExportProject} disabled={is3DScene}>Export Project (HTML5)</MenuItem>
                    <MenuItem onClick={() => {}} disabled={true}>Export Project (APK)</MenuItem>
                    <hr className="border-gray-700 my-1" />
                    <MenuItem onClick={onNewProject}>Close Project</MenuItem>
                </div>
            )}
        </div>
      </div>

      <div className="flex items-center space-x-1 bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => onViewChange('Game Scene')}
          className={`${buttonBaseClasses} ${activeView === 'Game Scene' ? activeClasses : inactiveClasses}`}
        >
          {is3DScene ? '3D Level' : 'Game Scene'}
        </button>
        <button
          onClick={() => onViewChange('Events')}
          className={`${buttonBaseClasses} ${activeView === 'Events' ? activeClasses : inactiveClasses}`}
        >
          Events
        </button>
      </div>

      <div className="flex items-center space-x-2">
        <button 
          onClick={onShowManual}
          className={utilityButtonClasses}
        >
          <BookOpenIcon className="w-4 h-4" />
          <span>Manual</span>
        </button>
        <button 
          onClick={onToggleHitboxes}
          className={`${utilityButtonClasses} ${showHitboxes ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-700 hover:bg-gray-600'}`}
          title="Debug Hitboxes"
        >
          <BugIcon className="w-4 h-4" />
        </button>
        <button 
          onClick={onPreview}
          className="flex items-center space-x-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold px-4 py-1.5 rounded-md transition-colors"
        >
          <PlayIcon className="w-4 h-4" />
          <span>Preview</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
