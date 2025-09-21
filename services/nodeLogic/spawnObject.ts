// services/nodeLogic/spawnObject.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    spawnObject: (node, context) => {
        const objectType = context.evaluateInput(node.id, 'objectType', context) || node.properties.objectType;
        const position = context.evaluateInput(node.id, 'position', context);
        
        if (objectType && position && context.engine.spawnGameObject) {
            const newObject = context.engine.spawnGameObject(objectType, position);
            context.nodeOutputCache.set(`${node.id}-spawnedObject`, newObject.id);
        } else {
            context.nodeOutputCache.set(`${node.id}-spawnedObject`, undefined);
            if (!context.engine.spawnGameObject) {
                context.addLog("[Error] spawnGameObject function not implemented in this context.");
            }
        }
        
        context.triggerOutput(node.id, 'execOut', context);
    },
};
