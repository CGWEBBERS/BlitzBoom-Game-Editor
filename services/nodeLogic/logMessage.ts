// services/nodeLogic/logMessage.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    logMessage: (node, context) => {
        const message = context.evaluateInput(node.id, 'message', context);
        context.addLog(`[Node Log]: ${JSON.stringify(message)}`);
        context.triggerOutput(node.id, 'execOut', context);
    },
};
