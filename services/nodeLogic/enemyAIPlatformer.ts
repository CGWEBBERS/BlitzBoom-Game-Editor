// services/nodeLogic/enemyAIPlatformer.ts

import { NodeLogicHandler, NodeExecutionContext } from './types';
import { SimulatedGameObject, GraphNode } from '../../types';

interface BoundingBox { x: number; y: number; width: number; height: number; }
interface CollisionResult { time: number; normal: { x: number; y: number }; }

const getCollisionHitboxes = (go: SimulatedGameObject): BoundingBox[] => {
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

const distance = (pos1: {x: number, y: number}, pos2: {x: number, y: number}) => {
    if (!pos1 || !pos2) return Infinity;
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
};

export function updateEnemyAI(go: SimulatedGameObject, node: GraphNode, context: NodeExecutionContext): SimulatedGameObject {
    const newGo = { ...go };
    const props = node.properties;
    const player = context.gameObjects.find(g => g.id === go.aiState?.targetPlayerId);

    if (!newGo.aiState) {
        newGo.aiState = {
            state: 'IDLE', stateTimer: 1, reactionTimer: 0,
            attackCooldown: 0, hitStunTimer: 0
        };
    }
    const ai = newGo.aiState;

    const healthProp = props.healthPropertyName || 'health';
    const script = newGo.behaviors.find(b => b.type === 'script');
    const currentHealth = script?.properties[healthProp];

    if (typeof currentHealth === 'number' && typeof ai.previousHealth === 'number' && currentHealth < ai.previousHealth) {
        ai.state = 'HIT_STUN';
        ai.hitStunTimer = 0.5;
        newGo.currentAnimation = props.hitAnim;
        newGo.animationTime = 0;
    }
    ai.previousHealth = currentHealth;

    Object.keys(ai).forEach(key => {
        if (key.endsWith('Timer') || key === 'attackCooldown') {
            (ai as any)[key] = Math.max(0, (ai as any)[key] - context.deltaTime);
        }
    });

    const distToPlayer = player ? distance(newGo.position, player.position) : Infinity;
    const canSeePlayer = distToPlayer < 800;
    const attacks = [
        { anim: props.attack1Anim, range: props.attack1Range, damage: props.attack1Damage },
        { anim: props.attack2Anim, range: props.attack2Range, damage: props.attack2Damage },
        { anim: props.attack3Anim, range: props.attack3Range, damage: props.attack3Damage },
    ].map((atk, i) => ({...atk, id: i + 1})).filter(a => a.anim && a.range > 0);

    let isPlayerAttacking = false;
    if (player) {
        const playerAnim = player.currentAnimation || '';
        if (playerAnim && !['Idle', 'Run', 'Walk', 'Jump', 'Fall'].includes(playerAnim)) {
            isPlayerAttacking = true;
        }
    }
    
    const activeAttackClip = attacks.find(a => a.id === ai.currentAttack);
    let isAttacking = ai.state === 'ATTACKING';
    if (isAttacking && activeAttackClip) {
        const attackAnimData = newGo.animations?.find(a => a.name === activeAttackClip.anim);
        if(attackAnimData && attackAnimData.frames.length > 0) {
            const duration = attackAnimData.frames.length / (attackAnimData.fps || 10);
            if ((newGo.animationTime ?? 0) >= duration) {
                ai.state = 'IDLE';
                ai.currentAttack = undefined;
                ai.reactionTimer = 0.1;
                isAttacking = false;
            }
        }
    }


    if (ai.reactionTimer <= 0 && ai.state !== 'HIT_STUN' && !isAttacking) {
        ai.reactionTimer = (1.1 - (props.difficulty * 0.1)) * (0.8 + Math.random() * 0.4);
        
        let decisionMade = false;
        
        if (player && isPlayerAttacking && distToPlayer < 100) {
            const blockChance = (props.difficulty - 2) * 0.1;
            if (Math.random() < blockChance) {
                ai.state = 'BLOCKING';
                ai.stateTimer = 0.5;
                decisionMade = true;
            }
        }
        
        if (!decisionMade) {
            if (player && canSeePlayer) {
                const availableAttacks = attacks.filter(a => distToPlayer <= a.range);
                if (availableAttacks.length > 0 && ai.attackCooldown <= 0) {
                    const attackChance = props.difficulty * 0.08;
                    if (Math.random() < attackChance) {
                        ai.state = 'ATTACKING';
                        ai.currentAttack = props.difficulty > 6 ? availableAttacks[0].id : availableAttacks[Math.floor(Math.random() * availableAttacks.length)].id;
                        ai.attackCooldown = (2.5 - (props.difficulty * 0.2));
                        decisionMade = true;
                    }
                } 
                
                if(!decisionMade) {
                    const optimalRange = (props.attack1Range || 70) * 0.9;
                    if (distToPlayer > optimalRange * 1.5) {
                        const jumpInChance = (props.difficulty - 5) * 0.1;
                        if (newGo.isGrounded && Math.random() < jumpInChance) {
                            ai.state = 'JUMPING';
                        } else {
                            ai.state = 'APPROACHING';
                        }
                    } else if (distToPlayer < optimalRange * 0.8) {
                        ai.state = 'RETREATING';
                    } else {
                        const footsieChance = (props.difficulty - 3) * 0.1;
                        if (Math.random() < footsieChance) {
                            ai.state = Math.random() < 0.5 ? 'APPROACHING' : 'RETREATING';
                            ai.stateTimer = 0.2 + Math.random() * 0.3;
                        } else {
                            ai.state = 'IDLE';
                        }
                    }
                }
            } else {
                ai.state = 'IDLE';
            }
        }
    }

    switch (ai.state) {
        case 'IDLE': newGo.velocity.x = 0; break;
        case 'APPROACHING': if (player) newGo.velocity.x = Math.sign(player.position.x - newGo.position.x) * props.speed; break;
        case 'ATTACKING': newGo.velocity.x = 0; break;
        case 'RETREATING': if (player) newGo.velocity.x = -Math.sign(player.position.x - newGo.position.x) * props.speed * 0.75; break;
        case 'BLOCKING': newGo.velocity.x = 0; if (ai.stateTimer <= 0) ai.state = 'IDLE'; break;
        case 'JUMPING': if (newGo.isGrounded) { newGo.velocity.y = -props.jumpStrength; if (player) newGo.velocity.x = Math.sign(player.position.x - newGo.position.x) * props.speed * 0.75; } break;
        case 'HIT_STUN': newGo.velocity.x = 0; if (ai.hitStunTimer <= 0) { ai.state = 'IDLE'; ai.reactionTimer = 0.1; } break;
    }

    const collidables = context.gameObjects.filter(g => g.type === 'platform' || g.type === 'hitbox');
    const hDisplacement = { x: newGo.velocity.x * context.deltaTime, y: 0 };
    let hCollision: CollisionResult = { time: 1, normal: { x: 0, y: 0 } };
    const movingHitboxes = getCollisionHitboxes(newGo);
    for (const staticGo of collidables) {
        if(staticGo.id === newGo.id) continue;
        const pCtrl = staticGo.behaviors.find(b => b.type === 'platformController')?.properties;
        const isSolid = (staticGo.type === 'platform' && pCtrl?.collisionType === 'solid') || staticGo.type === 'hitbox';
        if (!isSolid) continue;
        const staticHitboxes = getCollisionHitboxes(staticGo);
        for (const hb1 of movingHitboxes) {
            for (const hb2 of staticHitboxes) {
                const result = sweptAABB(hb1, hDisplacement, hb2);
                if (result.time < hCollision.time) hCollision = result;
            }
        }
    }
    newGo.position.x += hDisplacement.x * hCollision.time;
    if (hCollision.time < 1) newGo.velocity.x = 0;

    newGo.isGrounded = false;
    newGo.velocity.y += props.gravity * context.deltaTime;
    const vDisplacement = { x: 0, y: newGo.velocity.y * context.deltaTime };
    let vCollision: CollisionResult = { time: 1, normal: { x: 0, y: 0 } };
    const movingHitboxesAfterH = getCollisionHitboxes(newGo);
    for (const staticGo of collidables) {
        if(staticGo.id === newGo.id) continue;
        const pCtrl = staticGo.behaviors.find(b => b.type === 'platformController')?.properties;
        const isSolid = (staticGo.type === 'platform' && pCtrl?.collisionType === 'solid') || staticGo.type === 'hitbox';
        const isJumpthrough = staticGo.type === 'platform' && pCtrl?.collisionType === 'jumpthrough';
        if (!isSolid && !isJumpthrough) continue;
        const staticHitboxes = getCollisionHitboxes(staticGo);
        for (const hb1 of movingHitboxesAfterH) {
            for (const hb2 of staticHitboxes) {
                const result = sweptAABB(hb1, vDisplacement, hb2);
                if (isJumpthrough && result.normal.y !== -1) continue;
                if (result.time < vCollision.time) vCollision = result;
            }
        }
    }
    newGo.position.y += vDisplacement.y * vCollision.time;
    if (vCollision.time < 1) {
        if (vCollision.normal.y === -1) newGo.isGrounded = true;
        newGo.velocity.y = 0;
    }

    const activeAttack = attacks.find(a => a.id === ai.currentAttack);
    if (ai.state === 'ATTACKING' && activeAttack) { 
        if(newGo.currentAnimation !== activeAttack.anim) {
             newGo.currentAnimation = activeAttack.anim; 
             newGo.animationTime = 0;
        }
    }
    else if (ai.state === 'BLOCKING') { newGo.currentAnimation = props.blockAnim; }
    else if (ai.state === 'HIT_STUN') { newGo.currentAnimation = props.hitAnim; }
    else if (!newGo.isGrounded) { newGo.currentAnimation = newGo.velocity.y < 0 ? props.jumpAnim : props.fallAnim; if (ai.state === 'JUMPING' && newGo.velocity.y >= 0) ai.state = 'FALLING'; }
    else { if (ai.state === 'FALLING') ai.state = 'IDLE'; newGo.currentAnimation = newGo.velocity.x !== 0 ? props.walkAnim : props.idleAnim; }

    if (newGo.velocity.x !== 0) {
        const transform = newGo.behaviors.find(b => b.type === 'transform');
        if (transform) transform.properties.scale.x = Math.abs(transform.properties.scale.x) * Math.sign(newGo.velocity.x);
    } else if (player) {
        const transform = newGo.behaviors.find(b => b.type === 'transform');
        if(transform) transform.properties.scale.x = Math.abs(transform.properties.scale.x) * Math.sign(player.position.x - newGo.position.x);
    }

    return newGo;
}


export const logic: Record<string, NodeLogicHandler> = {
    enemyAIPlatformer: (node, context) => {
        const targetId = context.evaluateInput(node.id, 'target', context);
        const playerId = context.evaluateInput(node.id, 'player', context) || context.gameObjects.find(g => g.name === (node.properties.targetName || 'Player'))?.id;

        if (targetId) {
            context.setGameObjects(gos => gos.map(go => {
                if (go.id === targetId) {
                    const newGo = { ...go, aiControllerNodeId: node.id };
                    if (!newGo.aiState) {
                        newGo.aiState = {
                            state: 'IDLE',
                            stateTimer: 0,
                            reactionTimer: 0,
                            attackCooldown: 0,
                            hitStunTimer: 0,
                            targetPlayerId: playerId,
                        };
                    } else {
                        newGo.aiState.targetPlayerId = playerId;
                    }
                    return newGo;
                }
                return go;
            }));
        }
        context.triggerOutput(node.id, 'execOut', context);
    },
};