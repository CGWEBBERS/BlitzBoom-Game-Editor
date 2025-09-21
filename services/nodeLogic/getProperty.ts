// services/nodeLogic/getProperty.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    getProperty: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        const propertyName = node.properties.propertyName;

        if (!targetId || !propertyName) {
            context.nodeOutputCache.set(`${node.id}-value`, undefined);
            return;
        }

        const targetObject = context.gameObjects.find(go => go.id === targetId);
        if (!targetObject) {
            context.nodeOutputCache.set(`${node.id}-value`, undefined);
            return;
        }

        // Check for top-level runtime properties on the game object itself first
        if (Object.prototype.hasOwnProperty.call(targetObject, propertyName)) {
            const value = (targetObject as any)[propertyName];
            context.nodeOutputCache.set(`${node.id}-value`, value);
            return;
        }
        
        // Then, find a script behavior and check its defined properties
        const scriptBehavior = targetObject.behaviors.find(b => b.type === 'script');
        if (scriptBehavior && Object.prototype.hasOwnProperty.call(scriptBehavior.properties, propertyName)) {
             const value = scriptBehavior.properties[propertyName];
             context.nodeOutputCache.set(`${node.id}-value`, value);
             return;
        }

        // If not found, return undefined
        context.nodeOutputCache.set(`${node.id}-value`, undefined);
    },
};
