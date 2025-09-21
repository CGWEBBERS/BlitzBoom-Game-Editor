// services/nodeLogic/getText.ts
import { NodeLogicHandler } from './types';
import { TextRendererBehavior } from '../../types';

export const logic: Record<string, NodeLogicHandler> = {
    getText: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        let text: string | undefined = undefined;

        if (targetId) {
            const targetObject = context.gameObjects.find(go => go.id === targetId);
            if (targetObject) {
                const textRenderer = targetObject.behaviors.find(b => b.type === 'textRenderer') as TextRendererBehavior | undefined;
                if (textRenderer) {
                    text = textRenderer.properties.text;
                }
            }
        }
        context.nodeOutputCache.set(`${node.id}-text`, text);
    },
};
