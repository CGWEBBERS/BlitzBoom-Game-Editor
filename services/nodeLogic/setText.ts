// services/nodeLogic/setText.ts
import { NodeLogicHandler } from './types';
import { SimulatedGameObject, TextRendererBehavior } from '../../types';

export const logic: Record<string, NodeLogicHandler> = {
    setText: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        const text = context.evaluateInput(node.id, 'text', context);

        if (targetId && typeof text === 'string') {
            context.setGameObjects(gos => gos.map(go => {
                if (go.id === targetId) {
                    const newGo: SimulatedGameObject = JSON.parse(JSON.stringify(go));
                    const textRenderer = newGo.behaviors.find(b => b.type === 'textRenderer') as TextRendererBehavior | undefined;
                    if (textRenderer) {
                        textRenderer.properties.text = text;
                    } else {
                        context.addLog(`[Warning] Set Text: Target object '${go.name}' does not have a Text Renderer behavior.`);
                    }
                    return newGo;
                }
                return go;
            }));
        }
        context.triggerOutput(node.id, 'execOut', context);
    },
};
