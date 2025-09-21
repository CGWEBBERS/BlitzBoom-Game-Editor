
import React, { useRef, useState, MouseEvent as ReactMouseEvent, useEffect, WheelEvent as ReactWheelEvent } from 'react';
import { GraphNode, Connection, SelectedItems, Vector2 } from '../types';
import { NodeBlueprint, getNodeBlueprintsByCategory, nodeBlueprints } from '../nodeBlueprints';

import PlusIcon from './icons/PlusIcon';
import ZapIcon from './icons/ZapIcon';
import GitBranchIcon from './icons/GitBranchIcon';
import DatabaseIcon from './icons/DatabaseIcon';
import MousePointerClickIcon from './icons/MousePointerClickIcon';
import FilmIcon from './icons/FilmIcon';
import CubeIcon from './icons/CubeIcon';
import MusicIcon from './icons/MusicIcon';
import ClockIcon from './icons/ClockIcon';
import BugIcon from './icons/BugIcon';
import PlayIcon from './icons/PlayIcon';
import VideoIcon from './icons/VideoIcon';
import CameraIcon from './icons/CameraIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import Player3DIcon from './icons/Player3DIcon';
import TypeIcon from './icons/TypeIcon';
import HealthIcon from './icons/HealthIcon';

interface Pin {
  nodeId: string;
  pinId: string;
  type: string;
}

interface InteractionState {
  type: 'draw-connection' | 'drag-node' | 'pan' | 'marquee';
  startPin?: Pin;
  draggedNodeIds?: string[];
  initialNodePositions?: Record<string, Vector2>;
  startPan?: Vector2;
  startPos: Vector2; // screen space
  currentPos?: Vector2; // screen space
  dragOffset?: Vector2; // world space
}

interface ContextMenuState {
    visible: boolean;
    position: Vector2; // screen space
}

interface NodeEditorPanelProps {
  nodes: GraphNode[];
  connections: Connection[];
  selectedItem: SelectedItems;
  onSelect: (selection: SelectedItems, options?: { addToSelection: boolean }) => void;
  onNodesChange: (nodes: GraphNode[]) => void;
  onAddConnection: (connection: Omit<Connection, 'id'>) => void;
  onAddNode: (blueprint: NodeBlueprint, position: Vector2) => void;
}

const nodeBlueprintsByCategory = getNodeBlueprintsByCategory();
const allBlueprintsMap = new Map(nodeBlueprints.map(bp => [bp.type, bp]));

const IconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
    'events': ZapIcon,
    'logic': GitBranchIcon,
    'data': DatabaseIcon,
    'input': MousePointerClickIcon,
    'scene': FilmIcon,
    'gameObject': CubeIcon,
    'media': MusicIcon,
    'time': ClockIcon,
    'debugging': BugIcon,
    'action': PlayIcon,
    'camera': CameraIcon,
    'speaker': SpeakerIcon,
    'ai': BugIcon,
    'player3d': Player3DIcon,
    'type': TypeIcon,
    'health': HealthIcon,
    // Specific Overrides
    'playMusic': MusicIcon,
    'playVideo': VideoIcon,
    'enemyAIPlatformer': BugIcon,
};

const pinColorClasses: Record<string, string> = {
  exec: 'bg-slate-200 hover:bg-white',
  number: 'bg-sky-400 hover:bg-sky-300',
  boolean: 'bg-rose-400 hover:bg-rose-300',
  string: 'bg-purple-400 hover:bg-purple-300',
  gameObject: 'bg-amber-400 hover:bg-amber-300',
  any: 'bg-slate-400 hover:bg-slate-300',
  data: 'bg-slate-400 hover:bg-slate-300',
};

const categoryColorClasses: Record<string, string> = {
    'Events': 'from-red-500/30 to-gray-800/10',
    'Scene': 'from-purple-500/30 to-gray-800/10',
    'Game Object': 'from-amber-500/30 to-gray-800/10',
    'AI': 'from-fuchsia-500/30 to-gray-800/10',
    '3D': 'from-sky-500/30 to-gray-800/10',
    'Combat': 'from-rose-600/30 to-gray-800/10',
    'Action Nodes': 'from-green-500/30 to-gray-800/10',
    'Media': 'from-pink-500/30 to-gray-800/10',
    'Text': 'from-indigo-500/30 to-gray-800/10',
    'Time': 'from-indigo-500/30 to-gray-800/10',
    'Logic': 'from-rose-500/30 to-gray-800/10',
    'Input': 'from-teal-500/30 to-gray-800/10',
    'Data': 'from-slate-500/30 to-gray-800/10',
    'Debugging': 'from-lime-500/30 to-gray-800/10',
};


const NodeEditorPanel: React.FC<NodeEditorPanelProps> = ({ nodes, connections, selectedItem, onSelect, onNodesChange, onAddConnection, onAddNode }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [viewTransform, setViewTransform] = useState({ scale: 1, pan: { x: 0, y: 0 }});

  const screenToWorld = ({ x, y }: Vector2): Vector2 => {
      return {
          x: (x - viewTransform.pan.x) / viewTransform.scale,
          y: (y - viewTransform.pan.y) / viewTransform.scale,
      };
  };

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (contextMenu?.visible && panelRef.current && !panelRef.current.contains(event.target as Node)) {
              setContextMenu(null);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
          document.removeEventListener('mousedown', handleClickOutside);
      };
  }, [contextMenu]);

  const getPinPosition = (node: GraphNode, pinId: string, isOutput: boolean): Vector2 => {
    const pinIndex = isOutput 
      ? node.outputs.findIndex(p => p.id === pinId) 
      : node.inputs.findIndex(p => p.id === pinId);
    
    const x = isOutput ? node.position.x + 200 : node.position.x;
    const y = node.position.y + 52 + (pinIndex * 28);
    return { x, y };
  };

  const handleMouseDown = (e: ReactMouseEvent) => {
      if (!panelRef.current) return;
      if (contextMenu?.visible) setContextMenu(null);

      const rect = panelRef.current.getBoundingClientRect();
      const startPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (e.button === 1) { // Middle mouse button for panning
          setInteraction({ type: 'pan', startPos, startPan: viewTransform.pan });
      } else if (e.button === 0) {
          onSelect(null);
          setInteraction({ type: 'marquee', startPos });
      }
  };
  
  const handlePinMouseDown = (e: ReactMouseEvent, node: GraphNode, pinId: string, isOutput: boolean) => {
    e.stopPropagation();
    if (!isOutput) return;

    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const startPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    
    const startPinType = node.outputs.find(p => p.id === pinId)?.type;
    if (!startPinType) return;
    
    setInteraction({
      type: 'draw-connection',
      startPos,
      startPin: { nodeId: node.id, pinId: pinId, type: startPinType },
    });
  };

  const handlePinMouseUp = (e: ReactMouseEvent, node: GraphNode, pinId: string, isInput: boolean) => {
    e.stopPropagation();
    if (interaction?.type !== 'draw-connection' || !interaction.startPin || !isInput) {
      setInteraction(null);
      return;
    }

    const endPinType = node.inputs.find(p => p.id === pinId)!.type;
    
    const typesMatch = interaction.startPin.type === endPinType || 
                       endPinType === 'any' ||
                       (interaction.startPin.type === 'exec' && endPinType === 'exec');

    if (typesMatch) {
      onAddConnection({
        fromNodeId: interaction.startPin.nodeId,
        fromOutputId: interaction.startPin.pinId,
        toNodeId: node.id,
        toInputId: pinId,
      });
    }

    setInteraction(null);
  };
  
  const handleMouseMove = (e: ReactMouseEvent) => {
    if (!panelRef.current || !interaction) return;
    const rect = panelRef.current.getBoundingClientRect();
    const currentPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    setInteraction(i => i ? { ...i, currentPos } : null);

    const dx = currentPos.x - interaction.startPos.x;
    const dy = currentPos.y - interaction.startPos.y;

    if (interaction.type === 'pan' && interaction.startPan) {
        setViewTransform(vt => ({ ...vt, pan: { x: interaction.startPan!.x + dx, y: interaction.startPan!.y + dy } }));
    }

    if (interaction.type === 'drag-node' && interaction.draggedNodeIds && interaction.initialNodePositions) {
        const worldDx = dx / viewTransform.scale;
        const worldDy = dy / viewTransform.scale;
        
        const newNodes = nodes.map(n => {
            if (interaction.draggedNodeIds?.includes(n.id)) {
                const initialPos = interaction.initialNodePositions![n.id];
                return { ...n, position: { x: initialPos.x + worldDx, y: initialPos.y + worldDy } };
            }
            return n;
        });
        onNodesChange(newNodes);
    }
  };

  const handleMouseUp = (e: ReactMouseEvent) => {
     if (interaction?.type === 'marquee' && interaction.currentPos) {
        const start = screenToWorld(interaction.startPos);
        const end = screenToWorld(interaction.currentPos);
        const marqueeRect = {
            minX: Math.min(start.x, end.x),
            minY: Math.min(start.y, end.y),
            maxX: Math.max(start.x, end.x),
            maxY: Math.max(start.y, end.y),
        };
        const selectedIds = nodes
            .filter(n => {
                const nodeRight = n.position.x + 200;
                const nodeBottom = n.position.y + 52 + (Math.max(n.inputs.length, n.outputs.length) * 28);
                return nodeRight > marqueeRect.minX && n.position.x < marqueeRect.maxX &&
                       nodeBottom > marqueeRect.minY && n.position.y < marqueeRect.maxY;
            })
            .map(n => n.id);
        
        if (selectedIds.length > 0) {
            onSelect({ type: 'node', ids: selectedIds }, { addToSelection: e.shiftKey });
        }
    }
    setInteraction(null);
  };
  
  const handleNodeMouseDown = (e: ReactMouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (contextMenu?.visible) setContextMenu(null);
    if (e.button !== 0) return;
    
    const target = e.target as HTMLElement;
    if(target.closest('.pin-handle')){ return; }

    const isSelected = selectedItem?.type === 'node' && selectedItem.ids.includes(nodeId);

    if (!isSelected) {
        onSelect({type: 'node', ids: [nodeId]}, {addToSelection: e.shiftKey});
    }

    const currentSelectedIds = (e.shiftKey && selectedItem?.type === 'node') 
        ? [...new Set([...selectedItem.ids, nodeId])]
        : [nodeId];
    
    const rect = panelRef.current!.getBoundingClientRect();
    const startPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const initialNodePositions: Record<string, Vector2> = {};
    nodes.forEach(n => {
        if (currentSelectedIds.includes(n.id)) {
            initialNodePositions[n.id] = { ...n.position };
        }
    });

    setInteraction({
        type: 'drag-node',
        startPos,
        draggedNodeIds: currentSelectedIds,
        initialNodePositions,
    });
  };

  const handleContextMenu = (e: ReactMouseEvent) => {
      e.preventDefault();
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      setContextMenu({
          visible: true,
          position: { x: e.clientX - rect.left, y: e.clientY - rect.top }
      });
  };

  const handleAddNodeFromMenu = (blueprint: NodeBlueprint) => {
      if (!contextMenu || !panelRef.current) return;
      
      const worldPos = screenToWorld(contextMenu.position);

      onAddNode(blueprint, worldPos);
      setContextMenu(null);
  };
  
   const handleShowAddNodeMenu = (e: ReactMouseEvent) => {
    e.stopPropagation();
    setContextMenu(prev => 
        prev?.visible && prev.position.x === 15 && prev.position.y === 55 
        ? null 
        : { visible: true, position: { x: 15, y: 55 } }
    );
  };

  const handleWheel = (e: ReactWheelEvent) => {
    if (!panelRef.current) return;
    e.preventDefault();
    const rect = panelRef.current.getBoundingClientRect();
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

  const getCurvePath = (startPos: Vector2, endPos: Vector2) => {
      const dx = Math.abs(startPos.x - endPos.x) * 0.6;
      return `M ${startPos.x} ${startPos.y} C ${startPos.x + dx} ${startPos.y}, ${endPos.x - dx} ${endPos.y}, ${endPos.x} ${endPos.y}`;
  };

  return (
    <div 
      ref={panelRef} 
      className={`relative w-full h-full bg-gray-700/50 overflow-hidden select-none ${interaction?.type === 'pan' ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    >
        <div className="absolute top-4 left-4 z-10">
            <button
                onClick={handleShowAddNodeMenu}
                onMouseDown={e => e.stopPropagation()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-3 rounded-md transition-colors flex items-center space-x-2 text-sm shadow-lg"
            >
                <PlusIcon className="w-4 h-4" />
                <span>Add Node</span>
            </button>
        </div>

        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0">
          <defs>
            <pattern id="smallGrid" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform={`scale(${viewTransform.scale}) translate(${viewTransform.pan.x / (16 * viewTransform.scale)} ${viewTransform.pan.y / (16 * viewTransform.scale)})`}>
              <circle cx="1" cy="1" r="0.5" fill="rgba(107, 114, 128, 0.4)"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#smallGrid)" />
        </svg>

        <div className="absolute inset-0" style={{ transform: `translate(${viewTransform.pan.x}px, ${viewTransform.pan.y}px) scale(${viewTransform.scale})`, transformOrigin: '0 0' }}>
            <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none', overflow: 'visible' }}>
                <g>
                    {connections.map(conn => {
                        const fromNode = nodes.find(n => n.id === conn.fromNodeId);
                        const toNode = nodes.find(n => n.id === conn.toNodeId);
                        if (!fromNode || !toNode) return null;

                        const startPos = getPinPosition(fromNode, conn.fromOutputId, true);
                        const endPos = getPinPosition(toNode, conn.toInputId, false);
                        const pinType = fromNode.outputs.find(p => p.id === conn.fromOutputId)?.type || 'data';
                        const color = pinType === 'exec' ? '#e2e8f0' : '#67e8f9';
                        
                        return <path key={conn.id} d={getCurvePath(startPos, endPos)} stroke={color} strokeWidth="2" fill="none" />;
                    })}
                    {interaction?.type === 'draw-connection' && interaction.startPin && interaction.currentPos && (
                        <path 
                            d={getCurvePath(
                                getPinPosition(nodes.find(n => n.id === interaction.startPin!.nodeId)!, interaction.startPin!.pinId, true), 
                                screenToWorld(interaction.currentPos)
                            )} 
                            stroke="#67e8f9"
                            strokeWidth="2" 
                            fill="none" 
                        />
                    )}
                </g>
            </svg>

            {nodes.map(node => {
                const isSelected = selectedItem?.type === 'node' && selectedItem.ids.includes(node.id);
                const blueprint = allBlueprintsMap.get(node.type);
                const Icon = blueprint && IconMap[blueprint.icon] ? IconMap[blueprint.icon] : CubeIcon;
                const headerBg = blueprint ? categoryColorClasses[blueprint.category] : '';

                return (
                    <div 
                        key={node.id} 
                        className={`absolute bg-gray-800/80 backdrop-blur-sm rounded-lg shadow-xl border-2 transition-all duration-100 ${isSelected ? 'border-cyan-400 shadow-cyan-500/20' : 'border-gray-900/50'}`}
                        style={{ left: node.position.x, top: node.position.y, width: 200, cursor: interaction?.type === 'drag-node' ? 'grabbing' : 'grab' }}
                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                    >
                        <div className={`flex items-center space-x-2 bg-gradient-to-r p-2 rounded-t-lg text-sm font-bold select-none ${headerBg}`}>
                            <Icon className="w-4 h-4 opacity-80" />
                            <span>{node.name}</span>
                        </div>
                        <div className="p-3 text-sm flex justify-between">
                            {/* Inputs */}
                            <div className="space-y-3">
                                {node.inputs.map(input => (
                                    <div key={input.id} className="flex items-center space-x-2 pin-handle h-5">
                                        <div 
                                        className={`w-3.5 h-3.5 rounded-full ring-2 ring-gray-900 cursor-pointer transition-colors ${pinColorClasses[input.type]}`}
                                        onMouseUp={(e) => handlePinMouseUp(e, node, input.id, true)}
                                        ></div>
                                        <span className="text-xs select-none text-gray-300">{input.name}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Outputs */}
                            <div className="space-y-3 text-right">
                                {node.outputs.map(output => (
                                    <div key={output.id} className="flex items-center space-x-2 justify-end pin-handle h-5">
                                        <span className="text-xs select-none text-gray-300">{output.name}</span>
                                        <div 
                                        className={`w-3.5 h-3.5 rounded-full ring-2 ring-gray-900 cursor-pointer transition-colors ${pinColorClasses[output.type]}`}
                                        onMouseDown={(e) => handlePinMouseDown(e, node, output.id, true)}
                                        ></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        {interaction?.type === 'marquee' && interaction.currentPos && (() => {
            const start = interaction.startPos;
            const end = interaction.currentPos;
            const style = {
                left: Math.min(start.x, end.x),
                top: Math.min(start.y, end.y),
                width: Math.abs(start.x - end.x),
                height: Math.abs(start.y - end.y),
            };
            return <div className="absolute bg-cyan-400/20 border border-cyan-400" style={style} />;
        })()}

        {contextMenu?.visible && (
            <div
                className="absolute bg-gray-800 border border-gray-700 rounded-lg shadow-2xl p-4 text-sm z-50 w-auto max-w-4xl max-h-[70vh] overflow-y-auto"
                style={{ top: contextMenu.position.y, left: contextMenu.position.x }}
                onMouseDown={e => e.stopPropagation()}
            >
                <div className="flex flex-row flex-wrap gap-x-8 gap-y-6">
                    {Object.entries(nodeBlueprintsByCategory).map(([category, blueprints]) => (
                        <div key={category} className="w-48 space-y-1">
                            <h4 className="text-xs text-gray-400 font-bold uppercase px-2 pb-2 border-b border-gray-700 mb-2 whitespace-nowrap">{category}</h4>
                            {blueprints.map(bp => (
                                 <button
                                    key={bp.type}
                                    onClick={() => handleAddNodeFromMenu(bp)}
                                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-cyan-600 transition-colors"
                                 >
                                    {bp.name}
                                 </button>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
  );
};

export default NodeEditorPanel;
