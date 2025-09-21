// services/nodeLogic/branch.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    branch: (node, context) => {
        const condition = context.evaluateInput(node.id, 'condition', context);
        if (condition) {
            context.triggerOutput(node.id, 'execOutTrue', context);
        } else {
            context.triggerOutput(node.id, 'execOutFalse', context);
        }
    },
};
