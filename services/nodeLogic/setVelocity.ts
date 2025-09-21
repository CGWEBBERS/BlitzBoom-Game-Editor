// services/nodeLogic/setVelocity.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    setVelocity: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        const velocity = context.evaluateInput(node.id, 'velocity', context);

        if (targetId && velocity) {
            context.setGameObjects(gos => gos.map(go => 
                go.id === targetId ? { ...go, velocity: { ...velocity } } : go
            ));
        }
        
        context.triggerOutput(node.id, 'execOut', context);
    },
};
