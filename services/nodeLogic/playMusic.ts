// services/nodeLogic/playMusic.ts

import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    playMusic: (node, context) => {
        const { action = 'Play', musicAssetId, loop = true, volume = 1.0, channel = 0 } = node.properties;
        const channelNum = Number(channel) || 0;
        const { audioPlayers, musicChannels } = context;

        if (action === 'Play') {
            if (musicAssetId) {
                const preloadedAudio = audioPlayers.get(musicAssetId);
                if (preloadedAudio) {
                    // Stop any existing music on this channel
                    const existingAudio = musicChannels.get(channelNum);
                    if (existingAudio) {
                        existingAudio.pause();
                        existingAudio.currentTime = 0;
                    }

                    // Play new music
                    const newAudio = preloadedAudio.cloneNode() as HTMLAudioElement;
                    newAudio.loop = loop;
                    newAudio.volume = Math.max(0, Math.min(1, volume));
                    newAudio.play().catch(e => context.addLog(`[Audio Error]: Could not play music. ${e.message}`));
                    musicChannels.set(channelNum, newAudio);
                } else {
                    context.addLog(`[Audio Warning]: Music asset with ID '${musicAssetId}' not found or loaded.`);
                }
            } else {
                context.addLog(`[Audio Warning]: 'Play Music' node is missing an audio file.`);
            }
        } else {
            // Pause or Stop affects the music on the specified channel
            const audioOnChannel = musicChannels.get(channelNum);
            if (audioOnChannel) {
                if (action === 'Pause') {
                    audioOnChannel.pause();
                } else if (action === 'Stop') {
                    audioOnChannel.pause();
                    audioOnChannel.currentTime = 0;
                    musicChannels.delete(channelNum);
                }
            }
        }
        
        context.triggerOutput(node.id, 'execOut', context);
    },
};
