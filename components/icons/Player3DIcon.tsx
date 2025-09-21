import React from 'react';

const Player3DIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="5" r="3" />
    <path d="M12 8v6" />
    <path d="M9 14h6" />
    <path d="M12 14l-2 8" />
    <path d="M12 14l2 8" />
  </svg>
);

export default Player3DIcon;
