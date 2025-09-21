
import React from 'react';

interface PanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const Panel: React.FC<PanelProps> = ({ title, children, className = '', icon }) => {
  return (
    <div className={`bg-gray-800 rounded-lg flex flex-col overflow-hidden h-full ${className}`}>
      <div className="bg-gray-900/70 text-gray-300 text-sm font-semibold px-3 py-2 border-b border-gray-700 flex items-center space-x-2">
        {icon}
        <span>{title}</span>
      </div>
      <div className="flex-grow p-2 overflow-auto">
        {children}
      </div>
    </div>
  );
};

export default Panel;
