// services/nodeLogic/moveObject.ts

import { NodeLogicHandler } from './types';
import { SimulatedGameObject } from '../../types';

export const logic: Record<string, NodeLogicHandler> = {
    moveObject: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        const direction = node.properties.direction; // 'X' or 'Y'
        const speed = Number(node.properties.speed) || 0;

        if (targetId && speed !== 0) {
            context.setGameObjects(gos => gos.map(go => {
                if (go.id === targetId) {
                    // Create a new object with a new position object to ensure immutability
                    const newGo: SimulatedGameObject = { 
                        ...go,
                        position: { ...go.position }
                    };
                    if (direction === 'X') {
                        newGo.position.x += speed * context.deltaTime;
                    } else if (direction === 'Y') {
                        newGo.position.y += speed * context.deltaTime;
                    }
                    return newGo;
                }
                return go;
            }));
        }
        
        context.triggerOutput(node.id, 'execOut', context);
    },
    setPosition: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        if (!targetId) {
            context.triggerOutput(node.id, 'execOut', context);
            return;
        }

        let basePosition = null;

        // Precedence: 1. Input Pin (Object), 2. Property (Object Name), 3. Input Pin (Vector2), 4. Property (Vector2)
        const objectToFollowId = context.evaluateInput(node.id, 'objectToFollow', context);
        const positionFromPin = context.evaluateInput(node.id, 'position', context);

        if (objectToFollowId) {
            const objectToFollow = context.gameObjects.find(go => go.id === objectToFollowId);
            if (objectToFollow) {
                basePosition = objectToFollow.position;
            }
        } else if (node.properties.targetObjectName) {
            const objectToFollow = context.gameObjects.find(go => go.name === node.properties.targetObjectName);
            if (objectToFollow) {
                basePosition = objectToFollow.position;
            } else {
                context.addLog(`[Warning] Set Position: Could not find object with name '${node.properties.targetObjectName}'.`);
            }
        } else if (positionFromPin) {
            basePosition = positionFromPin;
        } else {
            basePosition = node.properties.position;
        }

        if (basePosition) {
            const offset = node.properties.offset || { x: 0, y: 0 };
            const finalPosition = {
                x: basePosition.x + offset.x,
                y: basePosition.y + offset.y,
            };
            context.setGameObjects(gos => gos.map(go => 
                go.id === targetId ? { ...go, position: { ...finalPosition } } : go
            ));
        }
        
        context.triggerOutput(node.id, 'execOut', context);
    },
};