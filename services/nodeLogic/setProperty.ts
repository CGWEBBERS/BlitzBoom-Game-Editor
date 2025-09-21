// services/nodeLogic/setProperty.ts

import { NodeLogicHandler } from './types';
import { SimulatedGameObject } from '../../types';

export const logic: Record<string, NodeLogicHandler> = {
    setProperty: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        const value = context.evaluateInput(node.id, 'value', context);
        const propertyName = node.properties.propertyName;
        
        if (targetId && propertyName && value !== undefined) {
             context.setGameObjects(gos => gos.map(go => {
                if (go.id === targetId) {
                    const newGo: SimulatedGameObject = JSON.parse(JSON.stringify(go));
                    const scriptBehavior = newGo.behaviors.find(b => b.type === 'script');
                    if (scriptBehavior) {
                        scriptBehavior.properties[propertyName] = value;
                    }
                    return newGo;
                }
                return go;
            }));
        }

        context.triggerOutput(node.id, 'execOut', context);
    },
    activateObject: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        const action = node.properties.action || 'Activate';
        const isActive = action === 'Activate';

        if (targetId) {
            context.setGameObjects(gos => gos.map(go => 
                go.id === targetId ? { ...go, isActive } : go
            ));
        }
        context.triggerOutput(node.id, 'execOut', context);
    },
};
