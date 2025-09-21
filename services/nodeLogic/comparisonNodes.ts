// services/nodeLogic/comparisonNodes.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    greaterThan: (node, context) => {
        const a = context.evaluateInput(node.id, 'a', context) ?? 0;
        const b = context.evaluateInput(node.id, 'b', context) ?? 0;
        context.nodeOutputCache.set(`${node.id}-result`, a > b);
    },
    lessThan: (node, context) => {
        const a = context.evaluateInput(node.id, 'a', context) ?? 0;
        const b = context.evaluateInput(node.id, 'b', context) ?? 0;
        context.nodeOutputCache.set(`${node.id}-result`, a < b);
    },
};
