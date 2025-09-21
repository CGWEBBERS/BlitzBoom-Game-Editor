
// services/nodeLogic/keyboardPlatformerController.ts
import { NodeLogicHandler } from './types';
import { SimulatedGameObject } from '../../types';

// --- Physics Helper Types ---
interface BoundingBox { x: number; y: number; width: number; height: number; }
interface CollisionResult { time: number; normal: { x: number; y: number }; }

// --- Physics Helper Functions ---

const getActiveHitboxes = (go: SimulatedGameObject): BoundingBox[] => {
    const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
    if (!transform) return [];

    const getBoundingBox = () => {
        const scale = transform.scale || { x: 1, y: 1 };
        const width = 32 * Math.abs(scale.x);
        const height = 32 * Math.abs(scale.y);
        return { x: go.position.x - width / 2, y: go.position.y - height / 2, width, height };
    };

    if (!go.useCustomHitboxes || !go.animations) {
        return [getBoundingBox()];
    }

    const activeClip = go.animations.find(anim => anim.name === go.currentAnimation);
    if (!activeClip || activeClip.frames.length === 0) {
        return [getBoundingBox()];
    }
    
    const frameIndex = activeClip.syncHitboxes ? 0 : (go.currentFrame || 0);
    const currentFrame = activeClip.frames[frameIndex];
    if (!currentFrame || !currentFrame.hitboxes || currentFrame.hitboxes.length === 0) {
        return [getBoundingBox()];
    }

    const renderedSpriteWidth = 32 * (transform.scale?.x || 1);
    const renderedSpriteHeight = 32 * (transform.scale?.y || 1);
    const sourceSpriteWidth = currentFrame.spriteWidth || 32;
    const sourceSpriteHeight = currentFrame.spriteHeight || 32;

    const scaleX = sourceSpriteWidth > 0 ? renderedSpriteWidth / sourceSpriteWidth : 1;
    const scaleY = sourceSpriteHeight > 0 ? renderedSpriteHeight / sourceSpriteHeight : 1;
        
    return currentFrame.hitboxes.map(hb => {
        if (hb.isLockedToSpriteBounds) {
            return {
                x: go.position.x - renderedSpriteWidth / 2,
                y: go.position.y - renderedSpriteHeight / 2,
                width: renderedSpriteWidth,
                height: renderedSpriteHeight,
            };
        }

        const localHitboxCenterX = hb.x + hb.width / 2 - sourceSpriteWidth / 2;
        const localHitboxCenterY = hb.y + hb.height / 2 - sourceSpriteHeight / 2;

        const worldOffsetX = localHitboxCenterX * scaleX;
        const worldOffsetY = localHitboxCenterY * scaleY;

        const worldHitboxWidth = hb.width * scaleX;
        const worldHitboxHeight = hb.height * scaleY;

        const worldHitboxX = go.position.x + worldOffsetX - worldHitboxWidth / 2;
        const worldHitboxY = go.position.y + worldOffsetY - worldHitboxHeight / 2;

        return {
            x: worldHitboxX,
            y: worldHitboxY,
            width: worldHitboxWidth,
            height: worldHitboxHeight,
        };
    });
};

const sweptAABB = (box1: BoundingBox, vel: {x: number, y: number}, box2: BoundingBox): CollisionResult => {
    let invEntryX, invEntryY;
    let invExitX, invExitY;

    if (vel.x > 0) {
        invEntryX = box2.x - (box1.x + box1.width);
        invExitX = (box2.x + box2.width) - box1.x;
    } else {
        invEntryX = (box2.x + box2.width) - box1.x;
        invExitX = box2.x - (box1.x + box1.width);
    }

    if (vel.y > 0) {
        invEntryY = box2.y - (box1.y + box1.height);
        invExitY = (box2.y + box2.height) - box1.y;
    } else {
        invEntryY = (box2.y + box2.height) - box1.y;
        invExitY = box2.y - (box1.y + box1.height);
    }

    let entryX, entryY;
    let exitX, exitY;

    if (vel.x === 0) {
        entryX = -Infinity;
        exitX = Infinity;
    } else {
        entryX = invEntryX / vel.x;
        exitX = invExitX / vel.x;
    }

    if (vel.y === 0) {
        entryY = -Infinity;
        exitY = Infinity;
    } else {
        entryY = invEntryY / vel.y;
        exitY = invExitY / vel.y;
    }

    const entryTime = Math.max(entryX, entryY);
    const exitTime = Math.min(exitX, exitY);

    if (entryTime > exitTime || (entryX < 0 && entryY < 0) || entryX > 1 || entryY > 1) {
        return { time: 1, normal: { x: 0, y: 0 } };
    }

    const normal = { x: 0, y: 0 };
    if (entryX > entryY) {
        normal.x = vel.x > 0 ? -1 : 1;
    } else {
        normal.y = vel.y > 0 ? -1 : 1;
    }

    return { time: entryTime, normal };
};

// Fix: Add the missing export for the 'logic' object.
export const logic: Record<string, NodeLogicHandler> = {
    keyboardPlatformerController: (node, context) => {
        const props = node.properties;
        const targetId = context.evaluateInput(node.id, 'target', context) || context.gameObjects.find(go => go.name === props.targetName)?.id;
        if (!targetId) {
            context.triggerOutput(node.id, 'execOut', context);
            return;
        }
        const leftKey = (props.leftKey || '').toLowerCase();
        const rightKey = (props.rightKey || '').toLowerCase();
        let jumpKey = (props.jumpKey || '').toLowerCase();
        if (jumpKey === 'space') jumpKey = ' ';

        const leftDown = !!context.keyboardState[leftKey];
        const rightDown = !!context.keyboardState[rightKey];
        const jumpDown = !!context.keyboardState[jumpKey];

        const attacks = Array.from({ length: 6 }, (_, i) => i + 1).map(index => ({
            key: (props[`attack${index}Key`] || '')?.toLowerCase(),
            anim: props[`attack${index}Anim`]
        })).filter(a => a.key && a.anim);

        const attackAnims = new Set(attacks.map(a => a.anim));
        const collidables = context.gameObjects.filter(go => go.type === 'platform' || go.type === 'hitbox');

        context.setGameObjects(gos => gos.map(go => {
            if (go.id !== targetId || !(go.isActive ?? true)) return go;
            
            const goWithState = go as SimulatedGameObject & { _attackState?: { keysDownPreviously: Set<string> }, jumpRequested?: boolean };

            if (!goWithState._attackState) goWithState._attackState = { keysDownPreviously: new Set() };
            const keysDownPreviously = goWithState._attackState.keysDownPreviously;
            const newGo = { ...goWithState, velocity: { ...goWithState.velocity }, prevPosition: goWithState.position };
            
            const wasJumpDown = keysDownPreviously.has(jumpKey);
            const jumpJustPressed = jumpDown && !wasJumpDown;
            if (jumpJustPressed) newGo.jumpRequested = true;
            
            const currentClip = newGo.animations?.find(a => a.name === newGo.currentAnimation);
            const isAttacking = currentClip && attackAnims.has(currentClip.name);
            let attackFinished = false;
            if (isAttacking) {
                const duration = currentClip.frames.length / (currentClip.fps || 10);
                if ((newGo.animationTime ?? 0) >= duration - 0.001) attackFinished = true;
            }

            let triggeredAttackAnim = null;
            if (!isAttacking || attackFinished) {
                for (const attack of attacks) {
                    const isKeyDown = !!context.keyboardState[attack.key];
                    const wasDown = keysDownPreviously.has(attack.key);
                    if (isKeyDown && !wasDown) {
                        triggeredAttackAnim = attack.anim;
                        break;
                    }
                }
            }
            
            if (triggeredAttackAnim) {
                newGo.currentAnimation = triggeredAttackAnim;
                newGo.animationTime = 0;
                newGo.currentFrame = 0;
                newGo.velocity.x = 0;
            } else if (isAttacking && !attackFinished) {
                newGo.velocity.x = 0;
            } else {
                let moveInput = 0;
                if (rightDown) moveInput += 1;
                if (leftDown) moveInput -= 1;
                newGo.velocity.x = moveInput * Math.abs(props.speed);
            }
            
            const transform = newGo.behaviors.find(b => b.type === 'transform');
            if (transform && newGo.velocity.x !== 0) {
                transform.properties.scale.x = Math.abs(transform.properties.scale.x) * Math.sign(newGo.velocity.x);
            }

            if (newGo.jumpRequested && newGo.isGrounded && (!isAttacking || attackFinished)) {
                newGo.velocity.y = -props.jumpStrength;
                newGo.isGrounded = false;
            }
            delete newGo.jumpRequested;

            // --- PHYSICS LOGIC ---
            // 1. Vertical Movement & Collision
            newGo.isGrounded = false;
            let groundObject = null;
            newGo.velocity.y += props.gravity * context.deltaTime;
            const vDisplacement = { x: 0, y: newGo.velocity.y * context.deltaTime };
            let nearestVCollision: CollisionResult = { time: 1, normal: {x: 0, y: 0} };
            const movingHitboxes = getActiveHitboxes(newGo);

            for (const staticGo of collidables) {
                if(staticGo.id === newGo.id) continue;
                const pCtrl = staticGo.behaviors.find(b => b.type === 'platformController')?.properties;
                const isSolid = (staticGo.type === 'platform' && pCtrl?.collisionType === 'solid') || staticGo.type === 'hitbox';
                const isJumpthrough = staticGo.type === 'platform' && pCtrl?.collisionType === 'jumpthrough';
                if (!isSolid && !isJumpthrough) continue;

                for (const movingBox of movingHitboxes) {
                    for (const staticBox of getActiveHitboxes(staticGo)) {
                        const result = sweptAABB(movingBox, vDisplacement, staticBox);
                        if (isJumpthrough && result.normal.y !== -1) continue;
                        if (result.time < nearestVCollision.time) {
                            nearestVCollision = result;
                            if (result.normal.y === -1) {
                                groundObject = staticGo;
                            }
                        }
                    }
                }
            }
            
            newGo.position.y += vDisplacement.y * nearestVCollision.time;
            if (nearestVCollision.time < 1) {
                if (nearestVCollision.normal.y === -1) newGo.isGrounded = true;
                newGo.velocity.y = 0;
            }

            // 2. Horizontal Movement & Collision
            if (newGo.isGrounded && groundObject && groundObject.velocity) {
                newGo.position.x += groundObject.velocity.x * context.deltaTime;
                newGo.position.y += groundObject.velocity.y * context.deltaTime;
            }

            const hDisplacement = { x: newGo.velocity.x * context.deltaTime, y: 0 };
            let nearestHCollision: CollisionResult = { time: 1, normal: {x: 0, y: 0} };
            const movingHitboxesAfterV = getActiveHitboxes(newGo);

            for (const staticGo of collidables) {
                if(staticGo.id === newGo.id) continue;
                const pCtrl = staticGo.behaviors.find(b => b.type === 'platformController')?.properties;
                if ((staticGo.type !== 'platform' || pCtrl?.collisionType !== 'solid') && staticGo.type !== 'hitbox') continue;
                
                for (const movingBox of movingHitboxesAfterV) {
                    for (const staticBox of getActiveHitboxes(staticGo)) {
                        const result = sweptAABB(movingBox, hDisplacement, staticBox);
                        if (result.time < nearestHCollision.time) nearestHCollision = result;
                    }
                }
            }
            newGo.position.x += hDisplacement.x * nearestHCollision.time;
            if (nearestHCollision.time < 1) newGo.velocity.x = 0;
            // --- END PHYSICS ---
            
            const justAttacked = !!triggeredAttackAnim;
            if (!justAttacked && (!isAttacking || attackFinished)) {
                let newAnim = newGo.currentAnimation;
                if (!newGo.isGrounded) {
                    newAnim = newGo.velocity.y > 0 ? props.fallAnim : props.jumpAnim;
                } else {
                    newAnim = newGo.velocity.x !== 0 ? props.runAnim : props.idleAnim;
                }
                if (newAnim && newAnim !== newGo.currentAnimation) {
                    newGo.currentAnimation = newAnim;
                    newGo.animationTime = 0;
                    newGo.currentFrame = 0;
                }
            }
            
            const currentKeysDown = new Set<string>();
            attacks.forEach(attack => {
                if (!!context.keyboardState[attack.key]) currentKeysDown.add(attack.key);
            });
            if (jumpDown) currentKeysDown.add(jumpKey);
            newGo._attackState = { keysDownPreviously: currentKeysDown };
            return newGo;
        }));
        context.triggerOutput(node.id, 'execOut', context);
    },
};
