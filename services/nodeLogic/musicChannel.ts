// services/nodeLogic/musicChannel.ts
import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    musicChannel: (node, context) => {
        const { action, channel } = node.properties;
        const { musicChannels } = context;

        if (action === 'Stop Music on Channel') {
            const channelToStop = Number(channel) || 0;
            const audio = musicChannels.get(channelToStop);
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
                musicChannels.delete(channelToStop);
            }
        } else if (action === 'Stop music on all channels') {
            musicChannels.forEach(audio => {
                audio.pause();
                audio.currentTime = 0;
            });
            musicChannels.clear();
        }

        context.triggerOutput(node.id, 'execOut', context);
    },
};
