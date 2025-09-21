
// services/nodeLogic/triggerOnce.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    triggerOnce: (node, context) => {
        if (!context.triggeredOnceNodes.has(node.id)) {
            context.triggeredOnceNodes.add(node.id);
            context.triggerOutput(node.id, 'execOut', context);
        }
    },
};
