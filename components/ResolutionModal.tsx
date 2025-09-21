import React, { useState } from 'react';
import CloseIcon from './icons/CloseIcon';

interface ResolutionModalProps {
  onConfirm: (resolution: { width: number; height: number }, name: string, type: '2d' | '3d', startFullscreen: boolean) => void;
  onClose?: () => void;
  initialName?: string;
  initialResolution?: { width: number; height: number };
  initialStartFullscreen?: boolean;
  isEditing?: boolean;
}

const presets = [
    { name: 'SD (4:3)', width: 640, height: 480 },
    { name: 'HD (16:9)', width: 1280, height: 720 },
    { name: 'Full HD (16:9)', width: 1920, height: 1080 },
    { name: 'Game Boy', width: 160, height: 144 },
    { name: 'Square', width: 800, height: 800 },
];

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
    <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${
        checked ? 'bg-cyan-500' : 'bg-gray-600'
        }`}
    >
        <span
        className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
        }`}
        />
    </button>
);

const ResolutionModal: React.FC<ResolutionModalProps> = ({ onConfirm, onClose, initialName, initialResolution, initialStartFullscreen, isEditing }) => {
    const [resolution, setResolution] = useState(initialResolution || { width: 1280, height: 720 });
    const [projectName, setProjectName] = useState(initialName || 'My BlitzBoom Game');
    const [projectType, setProjectType] = useState<'2d' | '3d'>('2d');
    const [startFullscreen, setStartFullscreen] = useState(initialStartFullscreen || false);

    const handleConfirm = () => {
        if (resolution.width > 0 && resolution.height > 0 && projectName.trim()) {
            onConfirm(resolution, projectName.trim(), projectType, startFullscreen);
        }
    };
    
    const handlePresetClick = (res: {width: number, height: number}) => {
        setResolution(res);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg border border-gray-700 flex flex-col text-gray-200">
                <header className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-lg">{isEditing ? 'Project Settings' : 'Create New Project'}</h2>
                        <p className="text-sm text-gray-400">{isEditing ? 'Edit the name and resolution for your game.' : 'Set the name and resolution for your new game.'}</p>
                    </div>
                     {isEditing && onClose && (
                        <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full">
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    )}
                </header>
                <main className="p-6 space-y-6">
                     <div>
                        <label htmlFor="projectName" className="block text-sm font-semibold text-gray-300 mb-2">Project Name</label>
                        <input
                            id="projectName"
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                            placeholder="e.g., My Awesome Game"
                        />
                    </div>

                    {!isEditing && (
                        <div>
                            <h3 className="font-semibold mb-2">Project Type</h3>
                            <div className="flex space-x-2 text-sm">
                                <button onClick={() => setProjectType('2d')} className={`flex-1 p-3 rounded-md text-center ${projectType === '2d' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    <span className="font-bold block">2D Scene</span>
                                    <span className="text-xs text-gray-400">Platformers, Top-Downs</span>
                                </button>
                                <button onClick={() => setProjectType('3d')} className={`flex-1 p-3 rounded-md text-center ${projectType === '3d' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                     <span className="font-bold block">3D Level</span>
                                    <span className="text-xs text-gray-400">First-Person, Grid-based</span>
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <h3 className="font-semibold mb-2">Resolution Presets</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {presets.map(p => (
                                <button
                                    key={p.name}
                                    onClick={() => handlePresetClick(p)}
                                    className={`p-2 rounded-md text-sm transition-colors ${resolution.width === p.width && resolution.height === p.height ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                                >
                                    <span className="font-bold block">{p.name}</span>
                                    <span className="text-xs text-gray-400">{p.width} x {p.height}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <h3 className="font-semibold mb-2">Custom Size</h3>
                        <div className="flex items-center space-x-4">
                            <div className="flex-1">
                                <label htmlFor="width" className="block text-xs text-gray-400 mb-1">Width</label>
                                <input
                                    id="width"
                                    type="number"
                                    value={resolution.width}
                                    onChange={(e) => setResolution(r => ({ ...r, width: parseInt(e.target.value, 10) || 0 }))}
                                    className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                                    placeholder="e.g., 1280"
                                />
                            </div>
                            <div className="flex-1">
                                 <label htmlFor="height" className="block text-xs text-gray-400 mb-1">Height</label>
                                <input
                                    id="height"
                                    type="number"
                                    value={resolution.height}
                                    onChange={(e) => setResolution(r => ({ ...r, height: parseInt(e.target.value, 10) || 0 }))}
                                    className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-sm"
                                    placeholder="e.g., 720"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                        <label htmlFor="startFullscreen" className="block text-sm font-semibold text-gray-300">Start Game in Fullscreen</label>
                        <ToggleSwitch checked={startFullscreen} onChange={setStartFullscreen} />
                    </div>
                </main>
                <footer className="p-4 bg-gray-900/50 border-t border-gray-700 flex justify-end">
                    <button 
                        onClick={handleConfirm} 
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-md transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                        disabled={!resolution.width || !resolution.height || !projectName.trim()}
                    >
                        {isEditing ? 'Save Changes' : 'Create Project'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ResolutionModal;