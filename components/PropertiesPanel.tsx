
import React, { useState, useRef } from 'react';
import { SelectedItems, GameObject, GraphNode, AnyBehavior, Asset, Scene, Player3DConfig, TextRendererBehavior } from '../types';
import ChevronDownIcon from './icons/ChevronDownIcon';
import UploadIcon from './icons/UploadIcon';
import MusicIcon from './icons/MusicIcon';
import VideoIcon from './icons/VideoIcon';
import SpeakerIcon from './icons/SpeakerIcon';

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

interface PropertiesPanelProps {
  selectedItems: SelectedItems;
  scenes: Scene[];
  gameObjects: GameObject[];
  nodes: GraphNode[];
  onGameObjectUpdate: (updatedObject: GameObject) => void;
  onNodeUpdate: (updatedNode: GraphNode) => void;
  onRenameScene: (sceneId: string, newName: string) => void;
  onEditAnimations: (gameObject: GameObject) => void;
  parsedScripts: Record<string, any>;
  assets: Asset[];
  onAssetCreateForGameObject: (gameObjectId: string, behaviorType: string, propertyName: string, fileData: string, fileName: string) => void;
  onAssetCreateForNode: (nodeId: string, propertyName: string, fileData: string, fileName: string) => void;
  onTextureAssigned: (gameObjectId: string, face: string, fileData: string, fileName: string) => void;
}

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (checked: boolean) => void }> = ({ checked, onChange }) => (
  <button
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

const PropertySection: React.FC<{ title: string, children: React.ReactNode, defaultOpen?: boolean }> = ({ title, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="bg-gray-900/50 rounded-lg">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-2 bg-gray-700/50 rounded-t-lg">
        <span className="font-bold text-sm">{title}</span>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
};

interface BehaviorSectionProps {
  behavior: AnyBehavior;
  onPropertyChange: (propName: string, value: any) => void;
  scriptDefinition?: any;
  // New props for spriteRenderer
  gameObjectId?: string;
  assets?: Asset[];
  onAssetCreateForGameObject?: (gameObjectId: string, behaviorType: string, propertyName: string, fileData: string, fileName: string) => void;
}


const BehaviorSection: React.FC<BehaviorSectionProps> = ({ behavior, onPropertyChange, scriptDefinition, gameObjectId, assets, onAssetCreateForGameObject }) => {
  
  if (behavior.type === 'spriteRenderer') {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const assetId = behavior.properties.assetId;
    const asset = (assets && assetId) ? findAssetById(assets, assetId) : null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !gameObjectId || !onAssetCreateForGameObject) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const fileData = event.target?.result as string;
            onAssetCreateForGameObject(gameObjectId, 'spriteRenderer', 'assetId', fileData, file.name);
        };
        reader.readAsDataURL(file);
    };
    
    return (
      <PropertySection title={behavior.name}>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png,image/jpeg" />
        <div>
            <label className="capitalize block text-xs text-gray-400 mb-1.5">Sprite</label>
            <div 
                className="w-full h-24 bg-gray-700 rounded-md border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-600/50 hover:border-cyan-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
            >
                {asset?.data ? (
                    <img src={asset.data} alt="Sprite" className="max-w-full max-h-full object-contain p-1" style={{ imageRendering: 'pixelated' }}/>
                ) : (
                    <div className="text-center text-xs text-gray-400 space-y-1">
                        <UploadIcon className="w-6 h-6 mx-auto" />
                        <span>Click to upload image</span>
                    </div>
                )}
            </div>
        </div>
        <div>
          <label className="capitalize block text-xs text-gray-400 mb-1.5">Render Mode</label>
          <select value={behavior.properties.renderMode || 'normal'} onChange={(e) => onPropertyChange('renderMode', e.target.value)} className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm">
            <option value="normal">Normal</option>
            <option value="tiled">Tiled</option>
          </select>
        </div>
      </PropertySection>
    )
  }

  if (behavior.type === 'textRenderer') {
    const fontFileInputRef = useRef<HTMLInputElement>(null);
    const textBehavior = behavior as TextRendererBehavior;

    const customFonts: Asset[] = [];
    const findFonts = (assetList: Asset[]) => {
      assetList.forEach(asset => {
        if (asset.type === 'font') customFonts.push(asset);
        if (asset.children) findFonts(asset.children);
      });
    };
    if (assets) findFonts(assets);

    const standardFonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'sans-serif'];
    
    const handleFontFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !gameObjectId || !onAssetCreateForGameObject) return;

      const allowedExtensions = ['.ttf', '.otf', '.woff', '.woff2'];
      const lastDot = file.name.lastIndexOf('.');
      const fileExtension = lastDot === -1 ? '' : file.name.slice(lastDot).toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
          alert(`Please upload a valid font file (${allowedExtensions.join(', ')}).`);
          return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
          const fileData = event.target?.result as string;
          onAssetCreateForGameObject(gameObjectId, 'textRenderer', 'customFontAssetId', fileData, file.name);
      };
      reader.readAsDataURL(file);
    };
    
    return (
      <PropertySection title={behavior.name}>
        <input type="file" ref={fontFileInputRef} onChange={handleFontFileChange} className="hidden" accept=".ttf,.otf,.woff,.woff2" />

        <div>
          <label className="capitalize block text-xs text-gray-400 mb-1.5">Text</label>
          <textarea
            value={textBehavior.properties.text}
            onChange={(e) => onPropertyChange('text', e.target.value)}
            className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm h-24 resize-y"
            rows={4}
          />
        </div>

        <div>
            <label className="capitalize block text-xs text-gray-400 mb-1.5">Font</label>
            <div className="flex space-x-2">
                <select 
                    value={textBehavior.properties.customFontAssetId || textBehavior.properties.font}
                    onChange={(e) => {
                        const value = e.target.value;
                        const customFont = customFonts.find(f => f.id === value);
                        if (customFont) {
                            onPropertyChange('font', customFont.name);
                            onPropertyChange('customFontAssetId', customFont.id);
                        } else {
                            onPropertyChange('font', value);
                            onPropertyChange('customFontAssetId', null);
                        }
                    }}
                    className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                >
                    <optgroup label="Standard Fonts">
                        {standardFonts.map(font => <option key={font} value={font}>{font}</option>)}
                    </optgroup>
                    {customFonts.length > 0 && <optgroup label="Custom Fonts">
                        {customFonts.map(font => <option key={font.id} value={font.id}>{font.name}</option>)}
                    </optgroup>}
                </select>
                <button 
                    onClick={() => fontFileInputRef.current?.click()}
                    className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded-md"
                    title="Upload custom font"
                >
                    <UploadIcon className="w-5 h-5"/>
                </button>
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Size</label>
                <input
                    type="number"
                    min="1"
                    value={textBehavior.properties.size}
                    onChange={(e) => onPropertyChange('size', parseInt(e.target.value, 10) || 12)}
                    className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                />
            </div>
             <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Color</label>
                 <input
                    type="color"
                    value={textBehavior.properties.color}
                    onChange={(e) => onPropertyChange('color', e.target.value)}
                    className="w-full h-[34px] bg-gray-700 p-1 rounded-md border border-gray-600 text-sm cursor-pointer"
                />
            </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
            <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Style</label>
                <select 
                    value={textBehavior.properties.style}
                    onChange={(e) => onPropertyChange('style', e.target.value as any)}
                    className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                >
                    <option value="normal">Normal</option>
                    <option value="bold">Bold</option>
                    <option value="italic">Italic</option>
                    <option value="bold italic">Bold Italic</option>
                </select>
            </div>
            <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Align</label>
                <select 
                    value={textBehavior.properties.align}
                    onChange={(e) => onPropertyChange('align', e.target.value as any)}
                    className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                </select>
            </div>
        </div>
      </PropertySection>
    )
  }

  if (behavior.type === 'backgroundController') {
    return (
        <PropertySection title={behavior.name}>
            <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Z-Order</label>
                <input type="number" value={behavior.properties.zIndex} onChange={(e) => onPropertyChange('zIndex', parseInt(e.target.value) || 0)} className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm" />
            </div>
             <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Parallax Speed</label>
                <div className="flex space-x-2">
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block text-center">X</label>
                        <input
                            type="number"
                            step="0.05"
                            value={String(behavior.properties.parallaxSpeed.x)}
                            onChange={(e) => onPropertyChange('parallaxSpeed', { ...behavior.properties.parallaxSpeed, x: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block text-center">Y</label>
                        <input
                            type="number"
                             step="0.05"
                            value={String(behavior.properties.parallaxSpeed.y)}
                            onChange={(e) => onPropertyChange('parallaxSpeed', { ...behavior.properties.parallaxSpeed, y: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                        />
                    </div>
                </div>
            </div>
        </PropertySection>
    )
  }

  if (behavior.type === 'platformController') {
    return (
        <PropertySection title={behavior.name}>
             <div className="flex items-center justify-between">
                <label className="capitalize block text-xs text-gray-400">Visible</label>
                <ToggleSwitch checked={behavior.properties.isVisible as boolean} onChange={(newValue) => onPropertyChange('isVisible', newValue)} />
            </div>
            <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Collision Type</label>
                <select value={behavior.properties.collisionType} onChange={(e) => onPropertyChange('collisionType', e.target.value)} className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm">
                    <option value="solid">Solid</option>
                    <option value="jumpthrough">Jumpthrough</option>
                </select>
            </div>
             <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Can Grab Ledge</label>
                <ToggleSwitch checked={behavior.properties.canGrab as boolean} onChange={(newValue) => onPropertyChange('canGrab', newValue)} />
            </div>
            <hr className="border-gray-700" />
            <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Move Direction</label>
                <select value={behavior.properties.moveDirection} onChange={(e) => onPropertyChange('moveDirection', e.target.value)} className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm">
                    <option value="None">None</option>
                    <option value="Horizontal">Horizontal</option>
                    <option value="Vertical">Vertical</option>
                </select>
            </div>
             <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Move Speed</label>
                <input type="number" value={behavior.properties.moveSpeed} onChange={(e) => onPropertyChange('moveSpeed', parseFloat(e.target.value) || 0)} className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm" />
            </div>
             <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Move Distance</label>
                <input type="number" value={behavior.properties.moveDistance} onChange={(e) => onPropertyChange('moveDistance', parseFloat(e.target.value) || 0)} className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm" />
            </div>
        </PropertySection>
    )
  }
  
  return (
    <PropertySection title={behavior.name}>
      {Object.entries(behavior.properties).map(([key, value]) => {
        if (key === 'scriptAssetId') return null; // Don't show the script asset ID

        const definition = scriptDefinition ? scriptDefinition[key] : null;
        const label = definition ? definition.name : key.replace(/([A-Z])/g, ' $1');
        const type = definition ? definition.type : typeof value;

        return (
          <div key={key}>
            <label className="capitalize block text-xs text-gray-400 mb-1.5">{label}</label>
            {type === 'boolean' ? (
              <ToggleSwitch checked={value as boolean} onChange={(newValue) => onPropertyChange(key, newValue)} />
            ) : type === 'number' ? (
              <input
                type="number"
                value={value as number}
                onChange={(e) => onPropertyChange(key, parseFloat(e.target.value) || 0)}
                className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
              />
            ) : typeof value === 'object' && value !== null && 'x' in value && 'y' in value ? (
              <div className="flex space-x-2">
                  <div className="flex-1">
                      <label className="text-xs text-gray-500 block text-center">X</label>
                      <input
                          type="number"
                          value={String(value.x)}
                          onChange={(e) => onPropertyChange(key, { ...value, x: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                      />
                  </div>
                  <div className="flex-1">
                      <label className="text-xs text-gray-500 block text-center">Y</label>
                      <input
                          type="number"
                          value={String(value.y)}
                          onChange={(e) => onPropertyChange(key, { ...value, y: parseFloat(e.target.value) || 0 })}
                          className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                      />
                  </div>
              </div>
            ) : (
              <input
                type="text"
                value={value as string}
                onChange={(e) => onPropertyChange(key, e.target.value)}
                className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
              />
            )}
          </div>
        );
      })}
    </PropertySection>
  );
};

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedItems, scenes, gameObjects, nodes, onGameObjectUpdate, onNodeUpdate, onRenameScene, onEditAnimations, parsedScripts, assets, onAssetCreateForGameObject, onAssetCreateForNode, onTextureAssigned }) => {
  const musicFileInputRef = useRef<HTMLInputElement>(null);
  const soundFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const textureFileInputRef = useRef<HTMLInputElement>(null);
  const [activeTextureSlot, setActiveTextureSlot] = useState<string | null>(null);

  const handleTextureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const gameObjectId = selectedItems?.type === 'gameobject' ? selectedItems.ids[0] : null;

      if (!file || !gameObjectId || !activeTextureSlot) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const fileData = event.target?.result as string;
          onTextureAssigned(gameObjectId, activeTextureSlot, fileData, file.name);
      };
      reader.readAsDataURL(file);
      if(e.target) e.target.value = ''; // Reset input
  };
  
  const renderContent = () => {
    if (!selectedItems || selectedItems.ids.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>Select an item to see its properties.</p>
        </div>
      );
    }

    if (selectedItems.ids.length > 1) {
        return (
             <div className="flex items-center justify-center h-full text-gray-400">
                <p>{selectedItems.ids.length} items selected.</p>
            </div>
        );
    }

    const selectedId = selectedItems.ids[0];

    if (selectedItems.type === 'scene') {
      const selectedScene = scenes.find(s => s.id === selectedId);
      if (!selectedScene) return null;

      return (
        <div className="space-y-4">
          <PropertySection title="Scene Properties">
             <div>
              <label className="capitalize block text-xs text-gray-400 mb-1.5">Name</label>
              <input
                type="text"
                value={selectedScene.name}
                onChange={(e) => onRenameScene(selectedScene.id, e.target.value)}
                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-lg font-bold"
              />
            </div>
          </PropertySection>
        </div>
      );
    }

    if (selectedItems.type === 'gameobject') {
      const selectedObject = gameObjects.find(obj => obj.id === selectedId);
      if (!selectedObject) return null;

      const hasSpriteRenderer = selectedObject.behaviors.some(b => b.type === 'spriteRenderer');
      const is3DObject = !!selectedObject.entityType3D;
      const isTextureable = ['wall', 'floor', 'obstacle'].includes(selectedObject.entityType3D || '');

      const handleGeneralPropertyChange = (prop: keyof GameObject, value: any) => {
        onGameObjectUpdate({ ...selectedObject, [prop]: value });
      };

      const handleTransformPropertyChange = (prop: string, value: any) => {
        const updatedObject = {
            ...selectedObject,
            behaviors: selectedObject.behaviors.map(b => 
                b.type === 'transform'
                ? { ...b, properties: { ...b.properties, [prop]: value } }
                : b
            )
        };
        onGameObjectUpdate(updatedObject);
      };

       const handleBehaviorPropertyChange = (behaviorType: string, propName: string, value: any) => {
        const updatedObject = {
            ...selectedObject,
            behaviors: selectedObject.behaviors.map(b => 
                b.type === behaviorType
                ? { ...b, properties: { ...b.properties, [propName]: value } }
                : b
            )
        };
        onGameObjectUpdate(updatedObject);
      };

      const transform = selectedObject.behaviors.find(b => b.type === 'transform');

      return (
        <div className="space-y-4">
          <PropertySection title="General" defaultOpen>
            <div className="flex items-center">
              <input
                type="text"
                value={selectedObject.name}
                onChange={(e) => handleGeneralPropertyChange('name', e.target.value)}
                className="w-full bg-gray-700 p-2 rounded-md border border-gray-600 text-lg font-bold"
              />
               <div className="ml-2 flex items-center space-x-1 p-2 bg-gray-700 border border-gray-600 rounded-md">
                  <label htmlFor="isActive" className="text-xs text-gray-400">On</label>
                  <ToggleSwitch checked={selectedObject.isActive ?? true} onChange={(v) => handleGeneralPropertyChange('isActive', v)} />
              </div>
            </div>
            <div className="flex items-center justify-between">
                <label className="capitalize block text-xs text-gray-400">Lock Object</label>
                <ToggleSwitch checked={selectedObject.isLocked ?? false} onChange={(v) => handleGeneralPropertyChange('isLocked', v)} />
            </div>
            <div>
              <label className="capitalize block text-xs text-gray-400 mb-1.5">Type</label>
              <input type="text" value={is3DObject ? selectedObject.entityType3D : selectedObject.type} readOnly className="w-full bg-gray-900/50 p-1.5 rounded-md border border-gray-700 text-sm text-gray-400" />
            </div>
            <div>
              <label className="capitalize block text-xs text-gray-400 mb-1.5">Layer</label>
              <input type="text" value={selectedObject.layer} readOnly className="w-full bg-gray-900/50 p-1.5 rounded-md border border-gray-700 text-sm text-gray-400" />
            </div>
            {!is3DObject && selectedObject.type !== 'background' && (
              <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Z-Order</label>
                <input
                  type="number"
                  value={selectedObject.zOrder || 0}
                  onChange={(e) => handleGeneralPropertyChange('zOrder', parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                  title="Controls the 2D rendering order. Higher values are drawn on top."
                />
              </div>
            )}
            {is3DObject && (
              <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">3D Level (Z-Index)</label>
                <input
                  type="number"
                  value={selectedObject.zIndex || 0}
                  onChange={(e) => handleGeneralPropertyChange('zIndex', parseInt(e.target.value, 10))}
                  className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                />
              </div>
            )}
             {selectedObject.type === 'hitbox' && (
              <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Color</label>
                <input
                  type="color"
                  value={selectedObject.color || '#34d399'}
                  onChange={(e) => handleGeneralPropertyChange('color', e.target.value)}
                  className="w-full h-[34px] bg-gray-700 p-1 rounded-md border border-gray-600 text-sm cursor-pointer"
                />
              </div>
            )}
            {hasSpriteRenderer && (
                 <div className="flex items-center justify-between">
                    <label className="capitalize block text-xs text-gray-400">Use Custom Hitboxes</label>
                    <ToggleSwitch checked={selectedObject.useCustomHitboxes ?? false} onChange={(v) => handleGeneralPropertyChange('useCustomHitboxes', v)} />
                </div>
            )}
            {selectedObject.useCustomHitboxes && (
                 <div>
                    <label className="capitalize block text-xs text-gray-400 mb-1.5">Hitbox Color</label>
                    <input type="color" value={selectedObject.hitboxColor || '#f472b6'} onChange={(e) => handleGeneralPropertyChange('hitboxColor', e.target.value)} className="w-full h-[34px] bg-gray-700 p-1 rounded-md border border-gray-600 text-sm cursor-pointer" />
                </div>
            )}
          </PropertySection>
          
          {transform && !is3DObject && (
            <PropertySection title="Transform">
              <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Position</label>
                 <div className="flex space-x-2">
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block text-center">X</label>
                        <input
                            type="number"
                            value={String(transform.properties.position.x)}
                            onChange={(e) => handleTransformPropertyChange('position', { ...transform.properties.position, x: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block text-center">Y</label>
                        <input
                            type="number"
                            value={String(transform.properties.position.y)}
                            onChange={(e) => handleTransformPropertyChange('position', { ...transform.properties.position, y: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                        />
                    </div>
                </div>
              </div>
               <div>
                <label className="capitalize block text-xs text-gray-400 mb-1.5">Scale</label>
                 <div className="flex space-x-2">
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block text-center">X</label>
                        <input
                            type="number"
                            step="0.1"
                            value={String(transform.properties.scale.x)}
                            onChange={(e) => handleTransformPropertyChange('scale', { ...transform.properties.scale, x: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-xs text-gray-500 block text-center">Y</label>
                        <input
                            type="number"
                             step="0.1"
                            value={String(transform.properties.scale.y)}
                            onChange={(e) => handleTransformPropertyChange('scale', { ...transform.properties.scale, y: parseFloat(e.target.value) || 0 })}
                            className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                        />
                    </div>
                </div>
              </div>
            </PropertySection>
          )}

          {is3DObject && selectedObject.player3dConfig && (
            <PropertySection title="Player 3D Config">
               <div>
                  <label className="capitalize block text-xs text-gray-400 mb-1.5">Camera</label>
                  <select
                    value={selectedObject.player3dConfig.cameraType}
                    onChange={(e) => onGameObjectUpdate({ ...selectedObject, player3dConfig: { ...selectedObject.player3dConfig!, cameraType: e.target.value as Player3DConfig['cameraType']} })}
                    className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                  >
                    <option value="first_person">First Person</option>
                    <option value="third_person">Third Person</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                    <label className="capitalize block text-xs text-gray-400">Mouse Look</label>
                    <ToggleSwitch checked={selectedObject.player3dConfig.mouseLook} onChange={(v) => onGameObjectUpdate({ ...selectedObject, player3dConfig: { ...selectedObject.player3dConfig!, mouseLook: v} })} />
                </div>
                <div>
                    <label className="capitalize block text-xs text-gray-400 mb-1.5">Speed</label>
                    <input
                        type="number"
                        value={selectedObject.player3dConfig.speed}
                        onChange={(e) => onGameObjectUpdate({ ...selectedObject, player3dConfig: { ...selectedObject.player3dConfig!, speed: parseFloat(e.target.value)} })}
                        className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                    />
                </div>
            </PropertySection>
          )}
          
          {isTextureable && (
            <PropertySection title="Textures">
                <input type="file" ref={textureFileInputRef} onChange={handleTextureFileChange} className="hidden" accept="image/png,image/jpeg" />
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    {(['top', 'bottom', 'front', 'back', 'left', 'right'] as const).map(face => {
                        const textureId = selectedObject.textures?.[face];
                        const textureAsset = textureId ? findAssetById(assets, textureId) : null;
                        return (
                            <div key={face} className="space-y-1">
                                <div
                                    onClick={() => { setActiveTextureSlot(face); textureFileInputRef.current?.click(); }}
                                    className="w-full h-16 bg-gray-700 rounded-md border-2 border-dashed border-gray-600 flex items-center justify-center cursor-pointer hover:border-cyan-500"
                                >
                                    {textureAsset?.data ? (
                                        <img src={textureAsset.data} alt={face} className="max-w-full max-h-full object-contain p-1" />
                                    ) : (
                                        <UploadIcon className="w-5 h-5 text-gray-500" />
                                    )}
                                </div>
                                <label className="capitalize">{face}</label>
                            </div>
                        );
                    })}
                </div>
            </PropertySection>
          )}

          {selectedObject.behaviors.filter(b => b.type !== 'transform').map((behavior, index) => {
             if (behavior.type === 'script') {
                 const scriptAsset = assets.flatMap(a => a.children || []).find(a => a.id === 'scripts-folder')?.children?.find(s => s.id === behavior.properties.scriptAssetId);
                 const scriptDefinition = scriptAsset ? parsedScripts[scriptAsset.id] : null;
                 return <BehaviorSection key={index} behavior={behavior} scriptDefinition={scriptDefinition} onPropertyChange={(prop, val) => handleBehaviorPropertyChange(behavior.type, prop, val)} />
             }
             return <BehaviorSection key={index} behavior={behavior} gameObjectId={selectedObject.id} assets={assets} onAssetCreateForGameObject={onAssetCreateForGameObject} onPropertyChange={(prop, val) => handleBehaviorPropertyChange(behavior.type, prop, val)} />
          })}

          {selectedObject.animations && selectedObject.animations.length > 0 && (
             <button
              onClick={() => onEditAnimations(selectedObject)}
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-3 rounded-md transition-colors"
            >
              Edit Animations & Hitboxes
            </button>
          )}
        </div>
      );
    }

    if (selectedItems.type === 'node') {
      const selectedNode = nodes.find(n => n.id === selectedId);
      if (!selectedNode) return null;

      const handleNodePropertyChange = (prop: string, value: any) => {
          onNodeUpdate({ ...selectedNode, properties: { ...selectedNode.properties, [prop]: value } });
      };

      return (
        <div className="space-y-4">
          <PropertySection title="Node Properties" defaultOpen>
            <h3 className="text-lg font-bold">{selectedNode.name}</h3>
            <p className="text-xs text-gray-400">{selectedNode.type}</p>
            <hr className="border-gray-700 my-2"/>
            {Object.keys(selectedNode.properties).length === 0 ? (
                <p className="text-xs text-gray-500">This node has no editable properties.</p>
            ) : Object.entries(selectedNode.properties).map(([key, value]) => {
                const label = key.replace(/([A-Z])/g, ' $1');

                if (selectedNode.type === 'onClickOrTouch' && key === 'targetObjectId') {
                    return (
                        <div key={key}>
                            <label className="capitalize block text-xs text-gray-400 mb-1.5">Target Object</label>
                            <select
                                value={value || ''}
                                onChange={(e) => handleNodePropertyChange(key, e.target.value || null)}
                                className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                            >
                                <option value="">-- Any Object --</option>
                                {gameObjects.map(obj => (
                                    <option key={obj.id} value={obj.id}>{obj.name}</option>
                                ))}
                            </select>
                        </div>
                    );
                }

                if (selectedNode.type === 'health' && key === 'action') {
                    return (
                        <div key={key}>
                            <label className="capitalize block text-xs text-gray-400 mb-1.5">Action</label>
                            <select
                                value={value as string}
                                onChange={(e) => handleNodePropertyChange(key, e.target.value)}
                                className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                            >
                                <option value="Subtract">Subtract</option>
                                <option value="Add">Add</option>
                            </select>
                        </div>
                    );
                }

                if (selectedNode.type === 'playMusic' && key === 'action') {
                    return (
                        <div key={key}>
                            <label className="capitalize block text-xs text-gray-400 mb-1.5">Action</label>
                            <select
                                value={value as string}
                                onChange={(e) => handleNodePropertyChange(key, e.target.value)}
                                className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                            >
                                <option value="Play">Play</option>
                                <option value="Pause">Pause</option>
                                <option value="Stop">Stop</option>
                            </select>
                        </div>
                    );
                }

                if (selectedNode.type === 'musicChannel') {
                    if (key === 'action') {
                        return (
                            <div key={key}>
                                <label className="capitalize block text-xs text-gray-400 mb-1.5">Action</label>
                                <select
                                    value={value as string}
                                    onChange={(e) => handleNodePropertyChange(key, e.target.value)}
                                    className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                                >
                                    <option value="Stop Music on Channel">Stop on Channel</option>
                                    <option value="Stop music on all channels">Stop on All Channels</option>
                                </select>
                            </div>
                        );
                    }
                    if (key === 'channel') {
                        if (selectedNode.properties.action !== 'Stop Music on Channel') return null; // Conditionally render
                        return (
                            <div key={key}>
                                <label className="capitalize block text-xs text-gray-400 mb-1.5">Channel</label>
                                <input type="number" value={value as number} onChange={(e) => handleNodePropertyChange(key, parseInt(e.target.value, 10) || 0)} className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm" />
                            </div>
                        );
                    }
                }

                if (selectedNode.type === 'changeScene' && key === 'sceneId') {
                    return (
                        <div key={key}>
                            <label className="capitalize block text-xs text-gray-400 mb-1.5">Target Scene</label>
                            <select
                                value={value || ''}
                                onChange={(e) => handleNodePropertyChange(key, e.target.value || null)}
                                className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                            >
                                <option value="">-- Select Scene --</option>
                                {scenes.map(scene => (
                                    <option key={scene.id} value={scene.id}>{scene.name}</option>
                                ))}
                            </select>
                        </div>
                    );
                }

                if (selectedNode.type === 'countdownClock' && key === 'targetObjectId') {
                    const textObjects = gameObjects.filter(go => go.type === 'text');
                    return (
                        <div key={key}>
                            <label className="capitalize block text-xs text-gray-400 mb-1.5">Target Text Object</label>
                            <select
                                value={value || ''}
                                onChange={(e) => handleNodePropertyChange(key, e.target.value || null)}
                                className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                            >
                                <option value="">-- Select Object --</option>
                                {textObjects.map(obj => (
                                    <option key={obj.id} value={obj.id}>{obj.name}</option>
                                ))}
                            </select>
                        </div>
                    );
                }

                if (selectedNode.type === 'distanceCheck' && (key === 'objectAId' || key === 'objectBId')) {
                    const label = key === 'objectAId' ? 'Object A' : 'Object B';
                    return (
                        <div key={key}>
                            <label className="capitalize block text-xs text-gray-400 mb-1.5">{label}</label>
                            <select
                                value={value || ''}
                                onChange={(e) => handleNodePropertyChange(key, e.target.value || null)}
                                className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm"
                            >
                                <option value="">-- Select Object --</option>
                                {gameObjects.map(obj => (
                                    <option key={obj.id} value={obj.id}>{obj.name}</option>
                                ))}
                            </select>
                        </div>
                    );
                }
                
                if (key.toLowerCase().includes('assetid')) {
                    const fileInputRef = (key.toLowerCase().includes('music') || key.toLowerCase().includes('sound')) ? musicFileInputRef : videoFileInputRef;
                    const accept = (key.toLowerCase().includes('music') || key.toLowerCase().includes('sound')) ? "audio/*" : "video/*";
                    const Icon = (key.toLowerCase().includes('music') || key.toLowerCase().includes('sound')) ? MusicIcon : VideoIcon;
                    const asset = (assets && value) ? findAssetById(assets, value) : null;
                    
                    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const fileData = event.target?.result as string;
                            onAssetCreateForNode(selectedNode.id, key, fileData, file.name);
                        };
                        reader.readAsDataURL(file);
                    };

                    return (
                        <div key={key}>
                            <label className="capitalize block text-xs text-gray-400 mb-1.5">{label}</label>
                             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept={accept} />
                             <div 
                                className="w-full h-20 bg-gray-700 rounded-md border-2 border-dashed border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-cyan-500 transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Icon className="w-6 h-6 text-gray-400 mb-1" />
                                <span className="text-xs text-gray-400 truncate max-w-full px-2">{asset?.name || `Click to select ${accept.split('/')[0]}`}</span>
                             </div>
                        </div>
                    )
                }
                
                return (
                     <div key={key}>
                        <label className="capitalize block text-xs text-gray-400 mb-1.5">{label}</label>
                        {typeof value === 'boolean' ? (
                          <ToggleSwitch checked={value} onChange={(newValue) => handleNodePropertyChange(key, newValue)} />
                        ) : typeof value === 'number' ? (
                          <input type="number" value={value} onChange={(e) => handleNodePropertyChange(key, parseFloat(e.target.value) || 0)} className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm" />
                        ) : typeof value === 'object' && value !== null && 'x' in value && 'y' in value ? (
                            <div className="flex space-x-2">
                                <div className="flex-1"><label className="text-xs text-gray-500 block text-center">X</label><input type="number" value={String(value.x)} onChange={(e) => handleNodePropertyChange(key, { ...value, x: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm" /></div>
                                <div className="flex-1"><label className="text-xs text-gray-500 block text-center">Y</label><input type="number" value={String(value.y)} onChange={(e) => handleNodePropertyChange(key, { ...value, y: parseFloat(e.target.value) || 0 })} className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm" /></div>
                            </div>
                        ) : (
                          <input type="text" value={value as string} onChange={(e) => handleNodePropertyChange(key, e.target.value)} className="w-full bg-gray-700 p-1.5 rounded-md border border-gray-600 text-sm" />
                        )}
                      </div>
                );
            })}
          </PropertySection>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="bg-gray-800 rounded-lg flex flex-col overflow-hidden h-full">
      <div className="bg-gray-900/70 text-gray-300 text-sm font-semibold px-3 py-2 border-b border-gray-700">
        Properties
      </div>
      <div className="flex-grow p-3 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default PropertiesPanel;
