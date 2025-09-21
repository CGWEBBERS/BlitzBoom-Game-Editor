import React, { useEffect, useState } from 'react';

interface IntroSceneProps {
  onComplete: () => void;
}

const IntroScene: React.FC<IntroSceneProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Start animation shortly after mount
    const animTimeout = setTimeout(() => setLoading(true), 100);
    // Trigger completion after 6 seconds
    const completeTimeout = setTimeout(onComplete, 6000);

    return () => {
      clearTimeout(animTimeout);
      clearTimeout(completeTimeout);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col items-center justify-center text-white">
      <img src="/logos/blitzboom-logo.png" alt="BlitzBoom Logo" className="w-72 mb-8 animate-pulse" />

      <div className="w-80 h-2 bg-cyan-900/50 rounded-full overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all duration-[5800ms] ease-linear"
          style={{ 
            width: loading ? '100%' : '0%',
            boxShadow: '0 0 10px #67e8f9, 0 0 15px #c084fc',
          }}
        />
      </div>
    </div>
  );
};

export default IntroScene;
