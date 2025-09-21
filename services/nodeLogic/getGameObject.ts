// services/nodeLogic/getGameObject.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    getGameObject: (node, context) => {
        const objectName = node.properties.objectName;
        const foundObject = context.gameObjects.find(go => go.name === objectName);
        context.nodeOutputCache.set(`${node.id}-objectOut`, foundObject?.id);
    },
};
