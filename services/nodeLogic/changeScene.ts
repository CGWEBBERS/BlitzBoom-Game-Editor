// services/nodeLogic/changeScene.ts
import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    changeScene: (node, context) => {
        const sceneId = node.properties.sceneId;
        if (sceneId) {
            context.engine.loadScene(sceneId);
        } else {
            context.addLog("[Warning] Change Scene node is missing a target scene.");
        }
        // This node stops the current execution flow by design, so it has no output trigger.
    },
};
