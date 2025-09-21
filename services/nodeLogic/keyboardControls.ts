import { NodeLogicHandler } from './types';

export const logic: Record<string, NodeLogicHandler> = {
    keyboardControls: (node, context) => {
        const leftKey = String(node.properties.leftKey).toLowerCase();
        const rightKey = String(node.properties.rightKey).toLowerCase();
        const upKey = String(node.properties.upKey).toLowerCase();
        const downKey = String(node.properties.downKey).toLowerCase();
        const jumpKey = String(node.properties.jumpKey).toLowerCase();
        
        let horizontal = 0;
        if (context.keyboardState[rightKey] || context.keyboardState['arrowright']) horizontal += 1;
        if (context.keyboardState[leftKey] || context.keyboardState['arrowleft']) horizontal -= 1;
        
        let vertical = 0;
        if (context.keyboardState[upKey] || context.keyboardState['arrowup']) vertical += 1;
        if (context.keyboardState[downKey] || context.keyboardState['arrowdown']) vertical -= 1;

        const jump = !!context.keyboardState[jumpKey] || !!context.keyboardState[' '];
        
        context.nodeOutputCache.set(`${node.id}-horizontal`, horizontal);
        context.nodeOutputCache.set(`${node.id}-vertical`, vertical);
        context.nodeOutputCache.set(`${node.id}-jump`, jump);
    },
};
