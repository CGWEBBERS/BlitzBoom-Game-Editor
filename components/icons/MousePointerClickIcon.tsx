import React from 'react';

const MousePointerClickIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m9 9 5 12 1.8-5.2L21 14Z" />
    <path d="M14.5 14.5 9 9" />
    <path d="M2.29 11.45a3.5 3.5 0 0 0 0 5.1" />
    <path d="M5.83 7.91a3.5 3.5 0 0 0 0 5.1" />
  </svg>
);

export default MousePointerClickIcon;