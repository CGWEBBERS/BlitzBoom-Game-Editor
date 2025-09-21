// services/nodeLogic/sounds.ts
import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    sounds: (node, context) => {
        const assetId = node.properties.soundAssetId;
        const volume = Math.max(0, Math.min(1, Number(node.properties.volume) || 1));
        const speed = Math.max(0.1, Number(node.properties.speed) || 1);

        if (assetId) {
            const preloadedAudio = context.audioPlayers.get(assetId);

            if (!preloadedAudio) {
                context.addLog(`[Audio Warning]: Sound asset with ID '${assetId}' not found or loaded.`);
            } else {
                // Clone the node to play as a one-shot sound effect.
                // This allows multiple instances of the same sound to overlap.
                const soundEffect = preloadedAudio.cloneNode() as HTMLAudioElement;
                soundEffect.volume = volume;
                soundEffect.playbackRate = speed;
                soundEffect.loop = false; // Sound effects should not loop by default
                soundEffect.play().catch(e => context.addLog(`[Audio Error]: Could not play sound. ${e.message}`));
            }
        } else {
            context.addLog(`[Audio Warning]: 'Play Sound' node is missing an audio file.`);
        }
        
        context.triggerOutput(node.id, 'execOut', context);
    },
};
