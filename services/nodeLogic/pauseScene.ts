// services/nodeLogic/pauseScene.ts
import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    pauseScene: (node, context) => {
        const action = node.properties.action || 'Toggle';

        switch(action) {
            case 'Pause':
                context.engine.pause();
                break;
            case 'Resume':
                context.engine.resume();
                break;
            case 'Toggle':
                context.engine.togglePause();
                break;
        }

        context.triggerOutput(node.id, 'execOut', context);
    },
};
