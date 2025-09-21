// services/nodeLogic/getAxis.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    getAxis: (node, context) => {
        const negativeKey = String(node.properties.negativeKey).toLowerCase();
        const positiveKey = String(node.properties.positiveKey).toLowerCase();

        const negativeDown = !!context.keyboardState[negativeKey];
        const positiveDown = !!context.keyboardState[positiveKey];

        let axisValue = 0;
        if (positiveDown) {
            axisValue += 1;
        }
        if (negativeDown) {
            axisValue -= 1;
        }
        
        context.nodeOutputCache.set(`${node.id}-axis`, axisValue);
    },
};