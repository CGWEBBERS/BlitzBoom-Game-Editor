// services/nodeLogic/vector2Nodes.ts
import { NodeLogicHandler } from './types';

const distance = (pos1: {x: number, y: number}, pos2: {x: number, y: number}) => {
    if (!pos1 || !pos2) return Infinity;
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
};

export const logic: Record<string, NodeLogicHandler> = {
    distance: (node, context) => {
        const a = context.evaluateInput(node.id, 'a', context) || {x:0,y:0};
        const b = context.evaluateInput(node.id, 'b', context) || {x:0,y:0};
        context.nodeOutputCache.set(`${node.id}-distance`, distance(a, b));
    },
};
