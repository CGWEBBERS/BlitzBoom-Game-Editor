// services/nodeLogic/mathNodes.ts
import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    add: (node, context) => {
        const a = context.evaluateInput(node.id, 'a', context) ?? 0;
        const b = context.evaluateInput(node.id, 'b', context) ?? 0;
        context.nodeOutputCache.set(`${node.id}-result`, Number(a) + Number(b));
    },
    subtract: (node, context) => {
        const a = context.evaluateInput(node.id, 'a', context) ?? 0;
        const b = context.evaluateInput(node.id, 'b', context) ?? 0;
        context.nodeOutputCache.set(`${node.id}-result`, Number(a) - Number(b));
    },
    multiply: (node, context) => {
        const a = context.evaluateInput(node.id, 'a', context) ?? 1;
        const b = context.evaluateInput(node.id, 'b', context) ?? 1;
        context.nodeOutputCache.set(`${node.id}-result`, Number(a) * Number(b));
    },
    divide: (node, context) => {
        const a = context.evaluateInput(node.id, 'a', context) ?? 0;
        const b = context.evaluateInput(node.id, 'b', context) ?? 1;
        context.nodeOutputCache.set(`${node.id}-result`, b !== 0 ? Number(a) / Number(b) : 0);
    },
};
