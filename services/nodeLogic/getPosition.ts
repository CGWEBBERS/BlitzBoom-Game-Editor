// services/nodeLogic/getPosition.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    getPosition: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        if (!targetId) {
            context.nodeOutputCache.set(`${node.id}-position`, undefined);
            return;
        }
        const targetObject = context.gameObjects.find(go => go.id === targetId);
        context.nodeOutputCache.set(`${node.id}-position`, targetObject?.position);
    },
};
