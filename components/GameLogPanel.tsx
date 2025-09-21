import React, { useEffect, useRef } from 'react';

interface GameLogPanelProps {
    logs: string[];
}

const GameLogPanel: React.FC<GameLogPanelProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="bg-gray-800 rounded-lg flex flex-col h-full text-sm text-gray-300">
      <div className="bg-gray-900/70 font-semibold px-3 py-2 border-b border-gray-700 flex justify-between items-center">
        <span>Game Log</span>
      </div>
      <div ref={scrollRef} className="flex-grow p-2 overflow-auto text-xs text-gray-400 font-mono space-y-1">
        {logs.length > 0 ? logs.map((log, index) => (
            <p key={index} className="whitespace-pre-wrap">{log}</p>
        )) : (
            <p>Simulation logs will appear here...</p>
        )}
      </div>
    </div>
  );
};

export default GameLogPanel;
