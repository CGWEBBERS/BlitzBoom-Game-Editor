// services/nodeLogic/fullScreen.ts
import { NodeLogicHandler } from './types';

// NOTE: This node's logic in the editor preview differs from the exported game.
// In the preview, it toggles a React state to resize the preview window.
// In the exported game, it uses the browser's native Fullscreen API.
export const logic: Record<string, NodeLogicHandler> = {
    fullScreen: (node, context) => {
        if (context.setPreviewFullscreen) {
            const action = node.properties.action || 'Toggle';
            switch(action) {
                case 'Enter':
                    context.setPreviewFullscreen(true);
                    break;
                case 'Exit':
                    context.setPreviewFullscreen(false);
                    break;
                case 'Toggle':
                    context.setPreviewFullscreen(prev => !prev);
                    break;
            }
        } else {
            // This path is for non-preview environments where this state doesn't exist.
            // The exported runtime handles this via its own separate logic.
            context.addLog('[Info] Full Screen node triggered in a non-preview context.');
        }

        context.triggerOutput(node.id, 'execOut', context);
    },
};