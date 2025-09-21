import React from 'react';
import { ObjectGroup } from '../types';
import PlusIcon from './icons/PlusIcon';

interface ObjectGroupsPanelProps {
  groups: ObjectGroup[];
}

const ObjectGroupsPanel: React.FC<ObjectGroupsPanelProps> = ({ groups }) => {
  return (
    <div className="bg-gray-800 rounded-lg flex flex-col overflow-hidden h-full">
      <div className="bg-gray-900/70 text-gray-300 text-sm font-semibold px-3 py-2 border-b border-gray-700 flex justify-between items-center">
        <span>Object Groups</span>
        <button title="Add new group" className="p-1 hover:bg-gray-700 rounded-md">
          <PlusIcon className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-grow p-2 overflow-auto text-center text-xs text-gray-500 flex items-center justify-center">
        {groups.length === 0 ? (
          <p>Start by adding a new group.</p>
        ) : (
          groups.map(group => <div key={group.id}>{group.name}</div>)
        )}
      </div>
    </div>
  );
};

export default ObjectGroupsPanel;
