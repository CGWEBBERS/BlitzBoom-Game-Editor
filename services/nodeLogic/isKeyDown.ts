// services/nodeLogic/getKey.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    getKey: (node, context) => {
        const key = String(node.properties.key).toLowerCase();
        const isDown = !!context.keyboardState[key];
        context.nodeOutputCache.set(`${node.id}-isDown`, isDown);
    },
};