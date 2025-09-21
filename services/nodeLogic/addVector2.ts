// services/nodeLogic/addVector2.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    addVector2: (node, context) => {
        const a = context.evaluateInput(node.id, 'a', context) || { x: 0, y: 0 };
        const b = context.evaluateInput(node.id, 'b', context) || { x: 0, y: 0 };
        context.nodeOutputCache.set(`${node.id}-result`, { x: a.x + b.x, y: a.y + b.y });
    },
};
