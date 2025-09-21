// services/nodeLogic/timer.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    timer: (node, context) => {
        const duration = Number(node.properties.duration) || 1;
        const loop = node.properties.loop === true;

        // The logic differentiates its action based on which input pin was triggered.
        if (context.triggeredPinId === 'start') {
            context.activeTimers.set(node.id, { 
                startTime: performance.now(), 
                duration, 
                loop 
            });
        } else if (context.triggeredPinId === 'stop') {
            context.activeTimers.delete(node.id);
        }
    },
};
