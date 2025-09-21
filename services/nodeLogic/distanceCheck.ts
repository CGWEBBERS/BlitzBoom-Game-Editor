// services/nodeLogic/distanceCheck.ts
import { NodeLogicHandler } from './types';

const distance = (pos1: {x: number, y: number}, pos2: {x: number, y: number}): number => {
    if (!pos1 || !pos2) return Infinity;
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
};

export const logic: Record<string, NodeLogicHandler> = {
    distanceCheck: (node, context) => {
        const objectAId = node.properties.objectAId;
        const objectBId = node.properties.objectBId;
        const thresholdDistance = Number(node.properties.distance) || 100;

        let isWithin = false;
        let actualDistance = Infinity;

        if (objectAId && objectBId) {
            const objectA = context.gameObjects.find(go => go.id === objectAId);
            const objectB = context.gameObjects.find(go => go.id === objectBId);

            if (objectA && objectB) {
                actualDistance = distance(objectA.position, objectB.position);
                if (actualDistance <= thresholdDistance) {
                    isWithin = true;
                }
            } else {
                 context.addLog(`[Warning] Distance Check node: Could not find one or both objects (A: ${objectAId}, B: ${objectBId})`);
            }
        }

        // Cache the calculated distance for the data output pin
        context.nodeOutputCache.set(`${node.id}-distance`, actualDistance);

        // Trigger the appropriate execution path
        if (isWithin) {
            context.triggerOutput(node.id, 'isWithin', context);
        } else {
            context.triggerOutput(node.id, 'isNotWithin', context);
        }
    },
};
