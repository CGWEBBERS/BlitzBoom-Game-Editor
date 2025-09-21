// services/nodeLogic/playVideo.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    playVideo: (node, context) => {
        const action = node.properties.action || 'Play';
        const assetId = node.properties.videoAssetId;
        const loop = node.properties.loop === true;
        const volume = Math.max(0, Math.min(1, Number(node.properties.volume) || 1));
        
        if (action === 'Play') {
            if (assetId) {
                context.setVideoState({
                    assetId,
                    nodeId: node.id,
                    isPlaying: true,
                    loop,
                    volume,
                });
            } else {
                 context.addLog("[Video Warning]: 'Play Video' node is missing a video file.");
            }
        } else if (context.videoState) {
            if (action === 'Pause') {
                context.setVideoState(prev => prev ? ({ ...prev, isPlaying: false }) : null);
            } else if (action === 'Stop') {
                context.setVideoState(null);
            }
        }
        
        context.triggerOutput(node.id, 'execOut', context);
    },
};