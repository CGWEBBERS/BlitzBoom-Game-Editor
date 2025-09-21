// services/nodeLogic/dataNodes.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    string: (node, context) => {
        context.nodeOutputCache.set(`${node.id}-value`, node.properties.value);
    },
    number: (node, context) => {
        context.nodeOutputCache.set(`${node.id}-value`, Number(node.properties.value));
    },
    boolean: (node, context) => {
        context.nodeOutputCache.set(`${node.id}-value`, node.properties.value);
    },
    vector2: (node, context) => {
        const x = Number(node.properties.x);
        const y = Number(node.properties.y);
        context.nodeOutputCache.set(`${node.id}-value`, { x, y });
    },
};
