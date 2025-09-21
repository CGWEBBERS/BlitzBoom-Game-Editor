// services/nodeLogic/camera.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    camera: (node, context) => {
        const { cameraType = '2D Follow' } = node.properties;

        if (cameraType !== '2D Follow') {
            context.addLog(`[Warning] Camera node type '${cameraType}' is not yet implemented and will have no effect.`);
            context.triggerOutput(node.id, 'execOut', context);
            return;
        }

        const targetId = context.evaluateInput(node.id, 'target', context);
        const targetName = node.properties.targetName;
        const sensitivity = Number(node.properties.sensitivity) || 0.1;
        const zoom = Number(node.properties.zoom) || 1;
        const offset = node.properties.offset || { x: 0, y: 0 };
        const bounds = node.properties.bounds;

        let finalTarget = null;
        if (targetId) {
            finalTarget = context.gameObjects.find(go => go.id === targetId);
        } else if (targetName) {
            finalTarget = context.gameObjects.find(go => go.name === targetName);
        }

        context.setCameraState(prev => {
            let desiredPos = prev.position;
            if (finalTarget) {
                desiredPos = {
                    x: finalTarget.position.x + offset.x,
                    y: finalTarget.position.y + offset.y,
                };
            }

            // Lerp for smooth follow
            const newX = prev.position.x + (desiredPos.x - prev.position.x) * sensitivity;
            const newY = prev.position.y + (desiredPos.y - prev.position.y) * sensitivity;

            let finalX = newX;
            let finalY = newY;

            // Apply bounds if they exist and are valid
            if (bounds && typeof bounds.minX === 'number' && typeof bounds.maxX === 'number' && typeof bounds.minY === 'number' && typeof bounds.maxY === 'number') {
                const { minX, minY, maxX, maxY } = bounds;
                finalX = Math.max(minX, Math.min(maxX, newX));
                finalY = Math.max(minY, Math.min(maxY, newY));
            }
            
            return {
                position: { x: finalX, y: finalY },
                zoom: zoom,
            };
        });
        
        context.triggerOutput(node.id, 'execOut', context);
    },
};