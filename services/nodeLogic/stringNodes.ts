// services/nodeLogic/stringNodes.ts
import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    toString: (node, context) => {
        const value = context.evaluateInput(node.id, 'value', context);
        context.nodeOutputCache.set(`${node.id}-string`, String(value ?? ''));
    },
    concatenate: (node, context) => {
        const a = context.evaluateInput(node.id, 'a', context) ?? '';
        const b = context.evaluateInput(node.id, 'b', context) ?? '';
        context.nodeOutputCache.set(`${node.id}-result`, `${a}${b}`);
    },
};
