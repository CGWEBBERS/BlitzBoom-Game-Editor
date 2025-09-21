// services/nodeLogic/destroyObject.ts
import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    destroyObject: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        if (targetId) {
            context.setGameObjects(gos => gos.filter(go => go.id !== targetId));
        } else {
            context.addLog(`[Warning] Destroy Object node was triggered but no target was provided.`);
        }
        context.triggerOutput(node.id, 'execOut', context);
    },
};