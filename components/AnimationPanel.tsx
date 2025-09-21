import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GameObject, AnimationClip, AnimationFrame, Asset, Hitbox } from '../types';
import CloseIcon from './icons/CloseIcon';
import PlusIcon from './icons/PlusIcon';
import TrashIcon from './icons/TrashIcon';
import UploadIcon from './icons/UploadIcon';
import PlayIcon from './icons/PlayIcon';
import PauseIcon from './icons/PauseIcon';
import EyeIcon from './icons/EyeIcon';
import EyeOffIcon from './icons/EyeOffIcon';

interface AnimationPanelProps {
    gameObject: GameObject;
    onClose: () => void;
    onSave: (gameObjectId: string, animations: AnimationClip[]) => void;
    assets: Asset[];
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors ${
      checked ? 'bg-cyan-500' : 'bg-gray-600'
    }`}
  >
    <span
      className={`inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-1'
      }`}
    />
  </button>
);


// Helper to find an asset by its ID recursively in the asset tree
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

const AnimationPanel: React.FC<AnimationPanelProps> = ({ gameObject, onClose, onSave, assets }) => {
    const [animations, setAnimations] = useState<AnimationClip[]>(JSON.parse(JSON.stringify(gameObject.animations || [])));
    const [selectedClipId, setSelectedClipId] = useState<string | null>(animations[0]?.id || null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [previewFrame, setPreviewFrame] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const animationFrameRequest = useRef<number | null>(null);
    const lastFrameTime = useRef<number>(0);

    const [selectedHitboxId, setSelectedHitboxId] = useState<string | null>(null);
    const [showEditorHitboxes, setShowEditorHitboxes] = useState(true);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const previewImageRef = useRef<HTMLImageElement>(null);

    const [previewContainerSize, setPreviewContainerSize] = useState({ width: 0, height: 0 });
    const previewContainerRef = useRef<HTMLDivElement>(null);

    const selectedClip = animations.find(c => c.id === selectedClipId);
    const currentFrame = selectedClip?.frames[previewFrame];
    const currentHitboxes = currentFrame?.hitboxes || [];
    const selectedHitbox = currentHitboxes.find(hb => hb.id === selectedHitboxId);

    const resolveSpriteSource = (frame: AnimationFrame): string | undefined => {
        if (frame.spriteSrc && frame.spriteSrc.startsWith('data:image')) return frame.spriteSrc;
        if (frame.spriteAssetId) return findAssetById(assets, frame.spriteAssetId)?.data;
        return undefined;
    };
    
    useEffect(() => {
        const container = previewContainerRef.current;
        if (!container) return;

        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]) {
                const { width, height } = entries[0].contentRect;
                setPreviewContainerSize({ width, height });
            }
        });

        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, []);

    const runPreview = useCallback((timestamp?: number) => {
        const currentTime = timestamp ?? performance.now();
        if (isPlaying && selectedClip && selectedClip.frames.length > 0) {
            const deltaTime = currentTime - lastFrameTime.current;
            const frameDurationMs = 1000 / (selectedClip.fps || 10);
            if (deltaTime >= frameDurationMs) {
                setPreviewFrame(prev => {
                    const nextFrame = prev + 1;
                    if (nextFrame >= selectedClip.frames.length) {
                        if (selectedClip.loop) return 0;
                        setIsPlaying(false);
                        return selectedClip.frames.length - 1;
                    }
                    return nextFrame;
                });
                lastFrameTime.current = currentTime;
            }
        } else {
            lastFrameTime.current = currentTime;
        }

        const canvas = previewCanvasRef.current;
        const image = previewImageRef.current;
        if (canvas && image && image.complete && image.naturalWidth > 0) {
            const ctx = canvas.getContext('2d')!;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (showEditorHitboxes) {
                currentHitboxes.forEach(hb => {
                    const isSelected = hb.id === selectedHitboxId;
                    const color = gameObject.hitboxColor || '#f472b6';
                    ctx.fillStyle = color.startsWith('hsl') ? color.replace(')', ', 0.5)').replace('hsl', 'hsla') : '#f472b680';
                    
                    const rect = hb.isLockedToSpriteBounds 
                        ? { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight }
                        : { x: hb.x, y: hb.y, width: hb.width, height: hb.height };

                    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

                    if (isSelected) {
                        ctx.strokeStyle = '#34d399'; // Green outline for selected
                        ctx.lineWidth = 2;
                        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
                    }
                });
            }
        }

        animationFrameRequest.current = requestAnimationFrame(runPreview);
    }, [isPlaying, selectedClip, currentHitboxes, selectedHitboxId, showEditorHitboxes, gameObject.hitboxColor]);

    useEffect(() => {
        lastFrameTime.current = performance.now();
        animationFrameRequest.current = requestAnimationFrame(runPreview);
        return () => { if (animationFrameRequest.current) cancelAnimationFrame(animationFrameRequest.current); };
    }, [runPreview]);
    
    useEffect(() => { setPreviewFrame(0); setIsPlaying(true); setSelectedHitboxId(null); }, [selectedClipId]);
    useEffect(() => { setSelectedHitboxId(null); }, [previewFrame]);
    
    useEffect(() => {
        if (selectedHitbox?.isLockedToSpriteBounds) {
            const image = previewImageRef.current;
            const width = image?.naturalWidth || 32;
            const height = image?.naturalHeight || 32;

            const changes: Partial<Hitbox> = {};
            if (selectedHitbox.x !== 0) changes.x = 0;
            if (selectedHitbox.y !== 0) changes.y = 0;
            if (selectedHitbox.width !== width) changes.width = width;
            if (selectedHitbox.height !== height) changes.height = height;
            
            if (Object.keys(changes).length > 0 && selectedClipId && selectedHitboxId) {
                 setAnimations(anims => anims.map(clip => clip.id === selectedClipId ? { ...clip, frames: clip.frames.map((frame, i) => i === previewFrame ? { ...frame, hitboxes: frame.hitboxes?.map(hb => hb.id === selectedHitboxId ? { ...hb, ...changes } : hb) } : frame) } : clip));
            }
        }
    }, [selectedHitbox?.isLockedToSpriteBounds, previewFrame, selectedHitboxId, selectedClipId]);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedClipId) return;
        const files = Array.from(event.target.files || []);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                const img = new Image();
                img.onload = () => {
                    const newFrame: AnimationFrame = {
                        id: `frame-${Date.now()}-${Math.random()}`,
                        spriteAssetId: '',
                        spriteSrc: dataUrl,
                        spriteWidth: img.naturalWidth,
                        spriteHeight: img.naturalHeight,
                    };
                    setAnimations(prev => prev.map(clip => clip.id === selectedClipId ? { ...clip, frames: [...clip.frames, newFrame] } : clip));
                };
                img.src = dataUrl;
            };
            reader.readAsDataURL(file);
        });
        if (event.target) event.target.value = '';
    };

    const handleAddClip = () => {
        const newClip: AnimationClip = { id: `anim-${Date.now()}`, name: `Animation ${animations.length + 1}`, frames: [], loop: true, fps: 10 };
        setAnimations(prev => [...prev, newClip]);
        setSelectedClipId(newClip.id);
    };

    const handleDeleteClip = (clipId: string) => {
        setAnimations(prev => {
            const filtered = prev.filter(c => c.id !== clipId);
            if (selectedClipId === clipId) setSelectedClipId(filtered[0]?.id || null);
            return filtered;
        });
    };

    const handleClipPropertyChange = (prop: keyof AnimationClip, value: any) => {
        if (!selectedClipId) return;
    
        if (prop === 'syncHitboxes' && value === true) {
            setAnimations(anims => anims.map(c => {
                if (c.id === selectedClipId) {
                    const currentClip = c;
                    const frameToSyncFrom = currentClip.frames[previewFrame];
                    if (frameToSyncFrom) {
                        const sourceHitboxes = JSON.parse(JSON.stringify(frameToSyncFrom.hitboxes || []));
                        const syncedFrames = currentClip.frames.map(f => ({ ...f, hitboxes: sourceHitboxes }));
                        return { ...currentClip, syncHitboxes: true, frames: syncedFrames };
                    }
                    return { ...currentClip, syncHitboxes: true };
                }
                return c;
            }));
        } else {
            setAnimations(anims => anims.map(c => c.id === selectedClipId ? { ...c, [prop]: value } : c));
        }
    };
    
    const handleAddHitbox = () => {
        if (!selectedClipId || !currentFrame) return;
    
        const newHitbox: Hitbox = { id: `hb-${Date.now()}`, name: 'hitbox', x: 0, y: 0, width: 32, height: 32 };
    
        setAnimations(anims => {
            return anims.map(clip => {
                if (clip.id === selectedClipId) {
                    const frameToUpdate = clip.frames[previewFrame];
                    if (!frameToUpdate) return clip;
                    
                    const newHitboxes = [...(frameToUpdate.hitboxes || []), newHitbox]; 
    
                    let updatedFrames;
                    if (clip.syncHitboxes) {
                        updatedFrames = clip.frames.map(f => ({ ...f, hitboxes: [...newHitboxes] }));
                    } else {
                        updatedFrames = clip.frames.map((frame, i) =>
                            i === previewFrame
                                ? { ...frame, hitboxes: newHitboxes }
                                : frame
                        );
                    }
                    return { ...clip, frames: updatedFrames };
                }
                return clip;
            });
        });
    
        setSelectedHitboxId(newHitbox.id);
    };

    const handleDeleteHitbox = (hitboxId: string) => {
        if (!selectedClipId) return;
        setAnimations(anims => anims.map(clip => {
            if (clip.id === selectedClipId) {
                const frameToUpdate = clip.frames[previewFrame];
                if (!frameToUpdate) return clip;

                const newHitboxes = frameToUpdate.hitboxes?.filter(hb => hb.id !== hitboxId);

                let updatedFrames;
                if (clip.syncHitboxes) {
                    updatedFrames = clip.frames.map(f => ({ ...f, hitboxes: newHitboxes }));
                } else {
                     updatedFrames = clip.frames.map((frame, i) =>
                        i === previewFrame ? { ...frame, hitboxes: newHitboxes } : frame
                    );
                }
                 return { ...clip, frames: updatedFrames };
            }
            return clip;
        }));
        setSelectedHitboxId(null);
    };

    const handleHitboxPropChange = (prop: keyof Hitbox, value: any) => {
        if (!selectedHitboxId || !selectedClipId) return;
    
        setAnimations(anims => anims.map(clip => {
            if (clip.id === selectedClipId) {
                const frameToUpdate = clip.frames[previewFrame];
                if (!frameToUpdate) return clip;
    
                const updatedHitboxes = frameToUpdate.hitboxes?.map(hb =>
                    hb.id === selectedHitboxId ? { ...hb, [prop]: value } : hb
                );
    
                if (!updatedHitboxes) return clip;
    
                let updatedFrames;
                if (clip.syncHitboxes) {
                    updatedFrames = clip.frames.map(f => ({ ...f, hitboxes: updatedHitboxes }));
                } else {
                    updatedFrames = clip.frames.map((frame, i) =>
                        i === previewFrame ? { ...frame, hitboxes: updatedHitboxes } : frame
                    );
                }
                return { ...clip, frames: updatedFrames };
            }
            return clip;
        }));
    };
    
    const currentFrameSrc = currentFrame ? resolveSpriteSource(currentFrame) : undefined;
    
    const transform = gameObject.behaviors.find(b => b.type === 'transform')?.properties;
    const worldWidth = transform ? 32 * (transform.scale.x || 1) : 32;
    const worldHeight = transform ? 32 * (transform.scale.y || 1) : 32;

    let displayWidth = worldWidth;
    let displayHeight = worldHeight;

    if (previewContainerSize.width > 0 && previewContainerSize.height > 0) {
        const padding = 0.9; // 10% padding
        const scaleX = previewContainerSize.width / worldWidth;
        const scaleY = previewContainerSize.height / worldHeight;
        const zoom = Math.min(scaleX, scaleY) * padding;
        
        if (zoom < 1) { // Only scale down to fit, don't enlarge small sprites
            displayWidth = worldWidth * zoom;
            displayHeight = worldHeight * zoom;
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-8 backdrop-blur-sm">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-7xl h-[90vh] border border-gray-700 flex flex-col text-sm">
                <header className="flex items-center justify-between p-3 border-b border-gray-700 flex-shrink-0">
                    <h2 className="font-bold text-lg">Animation Editor for <span className="text-cyan-400">{gameObject.name}</span></h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full"><CloseIcon className="w-5 h-5" /></button>
                </header>

                <main className="flex-grow flex p-3 space-x-3 overflow-hidden">
                    {/* Left Column */}
                    <div className="w-64 flex-shrink-0 flex flex-col space-y-3">
                        <div className="bg-gray-900/50 rounded-md flex flex-col h-1/2">
                            <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="font-semibold">Clips</h3>
                                <button onClick={handleAddClip} className="p-1 hover:bg-gray-700 rounded-md" title="Add new clip"><PlusIcon className="w-4 h-4"/></button>
                            </div>
                            <div className="flex-grow overflow-y-auto">
                                {animations.map(clip => (
                                    <div key={clip.id} className={`flex items-center justify-between pr-2 ${selectedClipId === clip.id ? 'bg-cyan-600' : 'hover:bg-gray-700/50'}`}>
                                        <button onClick={() => setSelectedClipId(clip.id)} className="w-full text-left p-2 truncate">{clip.name}</button>
                                        <button onClick={() => handleDeleteClip(clip.id)} className="p-1 hover:bg-red-500/50 rounded-md" title="Delete clip"><TrashIcon className="w-4 h-4 text-gray-400 hover:text-white" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="bg-gray-900/50 rounded-md flex flex-col h-1/2">
                             <div className="p-2 border-b border-gray-700 flex justify-between items-center">
                                <h3 className="font-semibold">Hitboxes</h3>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => setShowEditorHitboxes(!showEditorHitboxes)} title={showEditorHitboxes ? "Hide Hitboxes" : "Show Hitboxes"} className="p-1 hover:bg-gray-700 rounded-md">{showEditorHitboxes ? <EyeIcon className="w-4 h-4"/> : <EyeOffIcon className="w-4 h-4"/>}</button>
                                    <button onClick={handleAddHitbox} disabled={!currentFrame || !gameObject.useCustomHitboxes} className="p-1 hover:bg-gray-700 rounded-md disabled:opacity-50" title="Add new hitbox"><PlusIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                             <div className="flex-grow overflow-y-auto p-2 space-y-2">
                                {!gameObject.useCustomHitboxes ? (
                                    <p className="text-xs text-gray-500 p-2 text-center">Enable "Use Custom Hitboxes" in the Properties Panel to use this feature.</p>
                                ) : currentHitboxes.map(hb => (
                                    <div key={hb.id} onClick={() => setSelectedHitboxId(hb.id)} className={`p-2 rounded-md cursor-pointer ${selectedHitboxId === hb.id ? 'bg-cyan-800' : 'bg-gray-700/50 hover:bg-gray-700'}`}>
                                        <div className="flex justify-between items-center">
                                            <input type="text" value={hb.name} onChange={e => handleHitboxPropChange('name', e.target.value)} className="bg-transparent font-semibold w-full outline-none" />
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteHitbox(hb.id);}} className="p-1 hover:bg-red-500/50 rounded-md"><TrashIcon className="w-3 h-3"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Editor & Preview Area */}
                    <div className="flex-grow flex flex-col space-y-3 overflow-hidden">
                        <div ref={previewContainerRef} className="h-1/2 bg-black/20 rounded-md flex items-center justify-center p-2 relative">
                           {currentFrameSrc ? (
                                <>
                                    <img
                                        ref={previewImageRef}
                                        src={currentFrameSrc}
                                        alt="Preview"
                                        style={{
                                            imageRendering: 'pixelated',
                                            width: `${displayWidth}px`,
                                            height: `${displayHeight}px`,
                                        }}
                                        onLoad={(e) => {
                                            const img = e.currentTarget;
                                            const canvas = previewCanvasRef.current;
                                            if (canvas) {
                                                canvas.width = img.naturalWidth;
                                                canvas.height = img.naturalHeight;
                                                canvas.style.width = `${img.clientWidth}px`;
                                                canvas.style.height = `${img.clientHeight}px`;
                                            }
                                        }}/>
                                    <canvas ref={previewCanvasRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                                </>
                           ) : (
                               <p className="text-gray-500 text-center">Select an animation with frames to preview</p>
                           )}
                        </div>
                        <div className="flex-shrink-0 h-1/2 flex space-x-3">
                            <div className="flex-grow bg-gray-900/50 rounded-md flex flex-col overflow-hidden">
                                <div className="p-2 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
                                    <h3 className="font-semibold">Frames</h3>
                                    <button onClick={() => fileInputRef.current?.click()} disabled={!selectedClip} className="flex items-center space-x-1 text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-md disabled:opacity-50"><UploadIcon className="w-3 h-3"/><span>Add Frames</span></button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} multiple accept="image/*" className="hidden" />
                                </div>
                                <div className="flex-grow p-3 overflow-x-auto flex items-center space-x-2">
                                    {selectedClip?.frames.map((frame, index) => {
                                        const src = resolveSpriteSource(frame);
                                        return src ? (
                                            <div key={frame.id} className={`p-1 rounded-md flex-shrink-0 transition-all cursor-pointer ${previewFrame === index ? 'bg-cyan-500' : 'bg-black/20'}`} onClick={() => setPreviewFrame(index)}>
                                                <img src={src} className="h-24 w-24 object-contain" alt={`Frame ${index}`} />
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                            </div>
                            <div className="w-64 flex-shrink-0 bg-gray-900/50 rounded-md p-3 space-y-3 overflow-y-auto">
                                <h3 className="font-semibold border-b border-gray-700 pb-2">Properties</h3>
                                {selectedClip && (
                                    <>
                                        <div><label className="text-xs text-gray-400">Clip Name</label><input type="text" value={selectedClip.name} onChange={(e) => handleClipPropertyChange('name', e.target.value)} className="w-full bg-gray-700 p-1.5 rounded-md mt-1" /></div>
                                        <div className="flex items-center justify-between"><label className="text-xs text-gray-400">Loop</label><ToggleSwitch checked={selectedClip.loop} onChange={v => handleClipPropertyChange('loop', v)} /></div>
                                        <div className="flex items-center justify-between"><label className="text-xs text-gray-400">Sync Hitboxes</label><ToggleSwitch checked={!!selectedClip.syncHitboxes} onChange={v => handleClipPropertyChange('syncHitboxes', v)} /></div>
                                        <div><label className="text-xs text-gray-400">FPS: {selectedClip.fps}</label><input type="range" min="1" max="60" value={selectedClip.fps} onChange={e => handleClipPropertyChange('fps', parseInt(e.target.value))} className="w-full" /></div>
                                        <button onClick={() => setIsPlaying(!isPlaying)} className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded-md flex items-center justify-center space-x-2">{isPlaying ? <PauseIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}<span>{isPlaying ? "Pause" : "Play"}</span></button>
                                    </>
                                )}
                                {selectedHitbox && (
                                     <>
                                        <h3 className="font-semibold border-b border-gray-700 pb-2 pt-4">Hitbox: {selectedHitbox.name}</h3>
                                        <div className="flex items-center justify-between py-1">
                                            <label className="text-xs text-gray-400">Lock to Sprite Bounds</label>
                                            <ToggleSwitch checked={!!selectedHitbox.isLockedToSpriteBounds} onChange={v => handleHitboxPropChange('isLockedToSpriteBounds', v)} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div><label className="text-xs text-gray-400">X</label><input type="number" value={selectedHitbox.x} onChange={e => handleHitboxPropChange('x', parseInt(e.target.value))} disabled={selectedHitbox.isLockedToSpriteBounds} className="w-full bg-gray-700 p-1.5 rounded-md mt-1 disabled:opacity-50" /></div>
                                            <div><label className="text-xs text-gray-400">Y</label><input type="number" value={selectedHitbox.y} onChange={e => handleHitboxPropChange('y', parseInt(e.target.value))} disabled={selectedHitbox.isLockedToSpriteBounds} className="w-full bg-gray-700 p-1.5 rounded-md mt-1 disabled:opacity-50" /></div>
                                            <div><label className="text-xs text-gray-400">Width</label><input type="number" value={selectedHitbox.width} onChange={e => handleHitboxPropChange('width', parseInt(e.target.value))} disabled={selectedHitbox.isLockedToSpriteBounds} className="w-full bg-gray-700 p-1.5 rounded-md mt-1 disabled:opacity-50" /></div>
                                            <div><label className="text-xs text-gray-400">Height</label><input type="number" value={selectedHitbox.height} onChange={e => handleHitboxPropChange('height', parseInt(e.target.value))} disabled={selectedHitbox.isLockedToSpriteBounds} className="w-full bg-gray-700 p-1.5 rounded-md mt-1 disabled:opacity-50" /></div>
                                        </div>
                                     </>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
                <footer className="p-3 border-t border-gray-700 flex justify-end space-x-2 flex-shrink-0">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 font-bold py-2 px-4 rounded-md">Cancel</button>
                    <button onClick={() => onSave(gameObject.id, animations)} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-md">Save Animations</button>
                </footer>
            </div>
        </div>
    );
};

export default AnimationPanel;