// services/nodeLogic/platformerObject.ts

import { NodeLogicHandler } from './types';
import { SimulatedGameObject, Vector2 } from '../../types';

interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

const getBoundingBox = (go: SimulatedGameObject): BoundingBox => {
    const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
    const scale = transform?.scale || { x: 1, y: 1 };
    const width = 32 * scale.x;
    const height = 32 * scale.y;
    return {
        x: go.position.x - width / 2,
        y: go.position.y - height / 2,
        width,
        height,
    };
};

const aabbCollision = (rect1: BoundingBox, rect2: BoundingBox): boolean => {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
};

export const logic: Record<string, NodeLogicHandler> = {
    platformerObject: (node, context) => {
        const targetType = (node.properties.target || 'Player').toLowerCase();
        const speed = Number(node.properties.speed) || 0;
        const jumpSpeed = Number(node.properties.jumpSpeed) || 0;
        const gravity = Number(node.properties.gravity) || 0;
        
        const moveAxisInput = context.evaluateInput(node.id, 'Movement', context);
        const jumpInput = context.evaluateInput(node.id, 'Jump', context) ?? false;

        const platforms = context.gameObjects.filter(go => go.type === 'platform');
        const targetObjectIds = context.gameObjects
            .filter(go => go.type === targetType)
            .map(go => go.id);

        if (targetObjectIds.length > 0) {
            context.setGameObjects(gos => gos.map(go => {
                if (!targetObjectIds.includes(go.id)) {
                    return go;
                }

                const newGo: SimulatedGameObject = { 
                    ...go,
                    position: { ...go.position },
                    velocity: { ...go.velocity },
                    prevPosition: go.position,
                };

                // --- Horizontal Movement ---
                if (moveAxisInput !== undefined) {
                    newGo.velocity.x = Number(moveAxisInput) * speed;
                } else {
                    newGo.velocity.x = 0;
                }
                
                // --- Vertical Movement & Gravity ---
                newGo.velocity.y += gravity * context.deltaTime;
                newGo.isGrounded = false;
                
                // --- Update Position based on velocity ---
                newGo.position.x += newGo.velocity.x * context.deltaTime;
                newGo.position.y += newGo.velocity.y * context.deltaTime;

                // --- Collision Detection and Resolution ---
                const charBox = getBoundingBox(newGo);
                const prevCharBox = getBoundingBox({ ...newGo, position: newGo.prevPosition! });

                for (const platform of platforms) {
                    const platformBox = getBoundingBox(platform);
                    const platformController = platform.behaviors.find(b => b.type === 'platformController')?.properties;
                    if (!platformController) continue;

                    if (aabbCollision(charBox, platformBox)) {
                        const isJumpthrough = platformController.collisionType === 'jumpthrough';

                        // For jumpthrough, only collide if moving down and previously above the platform
                        if (isJumpthrough && (newGo.velocity.y < 0 || prevCharBox.y + prevCharBox.height > platformBox.y + 1)) {
                            continue;
                        }

                        // Resolve collision
                        const overlapX = (charBox.width / 2 + platformBox.width / 2) - Math.abs(newGo.position.x - platform.position.x);
                        const overlapY = (charBox.height / 2 + platformBox.height / 2) - Math.abs(newGo.position.y - platform.position.y);

                        if (overlapX < overlapY && !isJumpthrough) {
                            // Horizontal collision
                            if (newGo.position.x > platform.position.x) { // Collided with left side of platform
                                newGo.position.x = platform.position.x + platformBox.width / 2 + charBox.width / 2;
                            } else { // Collided with right side
                                newGo.position.x = platform.position.x - platformBox.width / 2 - charBox.width / 2;
                            }
                            newGo.velocity.x = 0;
                        } else {
                            // Vertical collision
                            if (newGo.position.y > platform.position.y) { // Collided with top of platform
                                if (!isJumpthrough) {
                                  newGo.position.y = platform.position.y + platformBox.height / 2 + charBox.height / 2;
                                  newGo.velocity.y = 0;
                                }
                            } else { // Collided with bottom of platform (landed on top)
                                newGo.position.y = platform.position.y - platformBox.height / 2 - charBox.height / 2;
                                newGo.velocity.y = 0;
                                newGo.isGrounded = true;

                                // If landing on a moving platform, inherit its horizontal velocity
                                if(platform.velocity) {
                                   newGo.position.x += platform.velocity.x * context.deltaTime;
                                }
                            }
                        }
                    } else if (platformController.canGrab && newGo.velocity.y > 0) {
                        // Ledge Grab Logic (simplified)
                        const grabZoneWidth = 5;
                        const leftGrabZone: BoundingBox = { ...platformBox, x: platformBox.x - grabZoneWidth, width: grabZoneWidth };
                        const rightGrabZone: BoundingBox = { ...platformBox, x: platformBox.x + platformBox.width, width: grabZoneWidth };
                        
                        const isVerticallyAligned = charBox.y > platformBox.y - charBox.height && charBox.y < platformBox.y;

                        if (isVerticallyAligned && (aabbCollision(charBox, leftGrabZone) || aabbCollision(charBox, rightGrabZone))) {
                            newGo.velocity.y = 0; // Stick to the wall
                        }
                    }
                }
                
                // --- Jumping ---
                if (jumpInput && newGo.isGrounded) { 
                    newGo.velocity.y = -jumpSpeed;
                }
                
                return newGo;
            }));
        }
        
        context.triggerOutput(node.id, 'execOut', context);
    },
};