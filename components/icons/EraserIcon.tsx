import React from 'react';

const EraserIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 13a2 2 0 0 0-2-2H7.83a2 2 0 0 0-1.42.59L3 15v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2Z"/>
    <path d="M3 15v-1a2 2 0 0 1 2-2H11"/>
    <path d="M21 13V9a2 2 0 0 0-2-2H7.83a2 2 0 0 0-1.42.59L3 11"/>
    <path d="m15 5-3-3-3 3"/>
    <path d="m12 2 4 4"/>
</svg>
);

export default EraserIcon;