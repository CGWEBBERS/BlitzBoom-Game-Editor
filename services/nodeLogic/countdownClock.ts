// services/nodeLogic/countdownClock.ts
import { NodeLogicHandler } from './types';
import { SimulatedGameObject, TextRendererBehavior } from '../../types';

// This utility function can be shared or defined locally
const formatTime = (seconds: number): string => {
    const ceilSeconds = Math.ceil(seconds);
    const minutes = Math.floor(ceilSeconds / 60);
    const remainingSeconds = ceilSeconds % 60;
    
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};


export const logic: Record<string, NodeLogicHandler> = {
    countdownClock: (node, context) => {
        const { activeCountdowns } = context;
        if (!activeCountdowns) {
            context.addLog('[Error] Countdown clock feature not initialized in execution context.');
            return;
        }

        const duration = Number(node.properties.duration) || 60;

        if (context.triggeredPinId === 'start') {
            const targetId = node.properties.targetObjectId;
            if (!targetId) {
                context.addLog(`[Warning] Countdown Clock (Node ID: ${node.id}) was started but no Target Text Object was selected in its properties.`);
                return;
            }

            // Start the countdown
            activeCountdowns.set(node.id, {
                nodeId: node.id,
                targetId,
                endTime: performance.now() + duration * 1000,
                duration,
                isFinished: false,
            });

            // Immediately update the text to the starting time
            const initialFormattedTime = formatTime(duration);
            context.setGameObjects(gos => gos.map(go => {
                if (go.id === targetId) {
                    const newGo: SimulatedGameObject = JSON.parse(JSON.stringify(go));
                    const textRenderer = newGo.behaviors.find(b => b.type === 'textRenderer') as TextRendererBehavior | undefined;
                    if (textRenderer) {
                        textRenderer.properties.text = initialFormattedTime;
                    }
                    return newGo;
                }
                return go;
            }));

        } else if (context.triggeredPinId === 'stop') {
            activeCountdowns.delete(node.id);
        }

        // Output remaining time continuously
        const countdownState = activeCountdowns.get(node.id);
        if (countdownState) {
            const remainingMs = Math.max(0, countdownState.endTime - performance.now());
            context.nodeOutputCache.set(`${node.id}-remainingSeconds`, remainingMs / 1000);
        } else {
            context.nodeOutputCache.set(`${node.id}-remainingSeconds`, duration); // If not running, output the default duration
        }
    },
};