import React from 'react';

const FloorIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 3h18v18H3z" fill="currentColor" opacity="0.2"/>
    <path d="M21 3 3 21"/>
  </svg>
);

export default FloorIcon;