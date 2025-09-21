import React from 'react';

const BugIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 9V7a2 2 0 0 0-2-2h-4M4 9V7a2 2 0 0 1 2-2h4"/>
    <path d="M12 20h-4a2 2 0 0 1-2-2V9h12v9a2 2 0 0 1-2 2h-4"/>
    <path d="M12 16a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2Z"/>
    <path d="M12 16a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-2Z"/>
    <path d="M4 12h16"/>
    <path d="M9.5 4.5 12 2l2.5 2.5"/>
    <path d="M14.5 4.5 12 7l-2.5-2.5"/>
  </svg>
);

export default BugIcon;