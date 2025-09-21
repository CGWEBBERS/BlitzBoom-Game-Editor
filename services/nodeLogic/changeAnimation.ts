// services/nodeLogic/changeAnimation.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    changeAnimation: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        const animationName = node.properties.animationName || 'Idle';
        const animationSpeed = Number(node.properties.animationSpeed) || 1;
        const restartIfPlaying = node.properties.restartIfPlaying === true;

        if (targetId) {
            context.setGameObjects(gos => gos.map(go => {
                if (go.id === targetId) {
                    // Condition to change animation:
                    // 1. If restartIfPlaying is true, always change/reset it.
                    // 2. If restartIfPlaying is false, only change if the animation name is different.
                    if (restartIfPlaying || go.currentAnimation !== animationName) {
                        return { 
                            ...go,
                            currentAnimation: animationName,
                            animationSpeed: animationSpeed,
                            animationTime: 0, // Reset time to start from the first frame
                            currentFrame: 0,
                        };
                    }
                }
                return go;
            }));
        }
        
        context.triggerOutput(node.id, 'execOut', context);
    },
};