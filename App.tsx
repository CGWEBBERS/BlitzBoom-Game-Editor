
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Asset,
  AssetType,
  GameObject,
  Vector2,
  SelectedItems,
  GameObjectType,
  GraphNode,
  Connection,
  Layer,
  ObjectGroup,
  AnimationClip,
  SimulatedGameObject,
  Scene,
  AnimationFrame,
  CameraState,
  EntityType3D,
  TextRendererBehavior,
} from './types';
import Header from './components/Header';
import SceneView from './components/SceneView';
import SceneView3D from './components/SceneView3D';
import AssetsPanel from './components/AssetsPanel';
import PropertiesPanel from './components/PropertiesPanel';
import NodeEditorPanel from './components/NodeEditorPanel';
import ObjectsPanel from './components/ObjectsPanel';
import LayersPanel from './components/LayersPanel';
import ObjectGroupsPanel from './components/ObjectGroupsPanel';
import GameLogPanel from './components/GameLogPanel';
import GamePreviewWindow from './components/GamePreviewWindow';
import AddObjectModal from './components/AddObjectModal';
import AddObjectModal3D from './components/AddObjectModal3D';
import AnimationPanel from './components/AnimationPanel';
import AIAssistant from './components/AIAssistant';
import ResolutionModal from './components/ResolutionModal';
import ManualModal from './components/ManualModal';
import IntroScene from './components/IntroScene'; // Import the new IntroScene
import ExportModal, { ExportOptions, ExportResult } from './components/ExportModal';
import { NodeBlueprint } from './nodeBlueprints';
import { nodeLogic } from './services/nodeLogic';
import { CountdownState, NodeExecutionContext } from './services/nodeLogic/types';
import { updateEnemyAI } from './services/nodeLogic/enemyAIPlatformer';


// Let TypeScript know that JSZip is available globally from the script tag in index.html
declare const JSZip: any;


// --- Templates for Export ---

const EXPORT_HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title><!--PROJECT_NAME_PLACEHOLDER--></title>
    <style>
        body { margin: 0; background-color: #111827; display: flex; align-items: center; justify-content: center; height: 100vh; overflow: hidden; font-family: sans-serif; }
        #game-container { position: relative; box-shadow: 0 0 20px rgba(0,0,0,0.5); background-color: #1f2937; }
        canvas { display: block; image-rendering: pixelated; image-rendering: -moz-crisp-edges; image-rendering: crisp-edges; }
        #video-player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: contain; z-index: 5; pointer-events: none; }
        #start-screen {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(31, 41, 55, 0.9);
            backdrop-filter: blur(5px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: white;
            cursor: pointer;
            transition: opacity 0.4s ease-out;
            z-index: 10;
        }
        #start-screen.hidden {
            opacity: 0;
            pointer-events: none;
        }
        #start-screen h1 {
            font-size: 3em;
            margin-bottom: 0.5em;
            text-shadow: 0 2px 5px rgba(0,0,0,0.5);
        }
        #start-button {
            font-size: 1.5em;
            padding: 0.5em 1.5em;
            border: 2px solid white;
            border-radius: 8px;
            background: transparent;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        #start-button:hover { 
            background: #67e8f9; 
            color: #111827; 
            border-color: #67e8f9; 
            transform: scale(1.05);
            box-shadow: 0 0 15px #67e8f9;
        }
        /* Fullscreen styles */
        #game-container:fullscreen {
            width: 100%;
            height: 100%;
        }
        #game-container:fullscreen > canvas,
        #game-container:fullscreen > video {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    </style>
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas"></canvas>
        <video id="video-player" style="display: none;"></video>
        <div id="start-screen">
            <h1><!--PROJECT_NAME_PLACEHOLDER--></h1>
            <button id="start-button">Play Game</button>
        </div>
    </div>
    <script src="runtime.js"></script>
</body>
</html>`;

const EXPORT_RUNTIME_JS = `
const BLITZBOOM_DATA = {/*DATA_PLACEHOLDER*/};

// --- Helper functions ---
const getZIndex = (go) => {
    const bgController = go.behaviors.find(b => b.type === 'backgroundController');
    if (bgController) return bgController.properties.zIndex || 0;
    return go.zOrder || 0;
};

const getBoundingBox = (go) => {
    const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
    const scale = transform?.scale || { x: 1, y: 1 };
    const width = 32 * Math.abs(scale.x);
    const height = 32 * Math.abs(scale.y);
    return { x: go.position.x - width / 2, y: go.position.y - height / 2, width, height };
};

const getActiveHitboxes = (go) => {
    const getBoundingBox = (go) => {
        const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
        const scale = transform?.scale || { x: 1, y: 1 };
        const width = 32 * Math.abs(scale.x);
        const height = 32 * Math.abs(scale.y);
        return { x: go.position.x - width / 2, y: go.position.y - height / 2, width, height };
    };

    if (!go.useCustomHitboxes || !go.animations) {
        return [getBoundingBox(go)];
    }
    const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
    if (!transform) return [getBoundingBox(go)];

    const activeClip = go.animations.find(anim => anim.name === go.currentAnimation);
    if (!activeClip || activeClip.frames.length === 0) {
        return [getBoundingBox(go)];
    }
    
    const frameIndex = activeClip.syncHitboxes ? 0 : (go.currentFrame || 0);
    const currentFrame = activeClip.frames[frameIndex];
    if (!currentFrame || !currentFrame.hitboxes || currentFrame.hitboxes.length === 0) {
        return [getBoundingBox(go)];
    }

    const renderedSpriteWidth = 32 * Math.abs(transform.scale?.x || 1);
    const renderedSpriteHeight = 32 * Math.abs(transform.scale?.y || 1);
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

const aabbCollision = (rect1, rect2) => (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
);

const sweptAABB = (box1, vel, box2) => {
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

const distance = (pos1, pos2) => {
    if (!pos1 || !pos2) return Infinity;
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
};

const createGameObjectFromType = (type, position, existingNames) => {
    const newId = \`go-\${Date.now()}-\${Math.random()}\`;
    let baseName = type.charAt(0).toUpperCase() + type.slice(1);
    
    let name = baseName;
    let counter = 1;
    while(existingNames.includes(name)) {
        name = \`\${baseName} \${counter}\`;
        counter++;
    }

    const baseObject = {
        id: newId,
        name,
        type,
        layer: 'Default',
        behaviors: [
          { type: 'transform', name: 'Transform', properties: { position, scale: { x: 1, y: 1 }, rotation: 0 } },
        ],
        animations: [],
    };
    
    if (type === 'bullet') {
        baseObject.behaviors[0].properties.scale = { x: 0.25, y: 0.25 };
        baseObject.behaviors.push({ type: 'spriteRenderer', name: 'Sprite Renderer', properties: { assetId: null, renderMode: 'normal' } });
    }
    
    return baseObject;
};

const formatTime = (seconds) => {
    const ceilSeconds = Math.ceil(seconds);
    const minutes = Math.floor(ceilSeconds / 60);
    const remainingSeconds = ceilSeconds % 60;
    return \`\${String(minutes).padStart(2, '0')}:\${String(remainingSeconds).padStart(2, '0')}\`;
};
// --- End Helper functions ---

// --- AI Logic ---
const updateEnemyAI = (go, node, context) => {
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
            ai[key] = Math.max(0, ai[key] - context.deltaTime);
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
    let hCollision = { time: 1, normal: { x: 0, y: 0 } };
    const movingHitboxes = getActiveHitboxes(newGo);
    for (const staticGo of collidables) {
        if(staticGo.id === newGo.id) continue;
        const pCtrl = staticGo.behaviors.find(b => b.type === 'platformController')?.properties;
        const isSolid = (staticGo.type === 'platform' && pCtrl?.collisionType === 'solid') || staticGo.type === 'hitbox';
        if (!isSolid) continue;
        const staticHitboxes = getActiveHitboxes(staticGo);
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
    let vCollision = { time: 1, normal: { x: 0, y: 0 } };
    const movingHitboxesAfterH = getActiveHitboxes(newGo);
    for (const staticGo of collidables) {
        if(staticGo.id === newGo.id) continue;
        const pCtrl = staticGo.behaviors.find(b => b.type === 'platformController')?.properties;
        const isSolid = (staticGo.type === 'platform' && pCtrl?.collisionType === 'solid') || staticGo.type === 'hitbox';
        const isJumpthrough = staticGo.type === 'platform' && pCtrl?.collisionType === 'jumpthrough';
        if (!isSolid && !isJumpthrough) continue;
        const staticHitboxes = getActiveHitboxes(staticGo);
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
};
// --- End AI Logic ---

class GameEngine {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.videoPlayer = document.getElementById('video-player');
        this.gameContainer = document.getElementById('game-container');
        this.ctx = this.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
        
        this.projectData = null;
        this.currentScene = null;

        this.assets = {};
        this.keyboardState = {};
        this.gameObjects = [];
        this.audioPlayers = new Map();
        this.musicChannels = new Map();
        this.activeTimers = new Map();
        this.activeCountdowns = new Map();
        this.activeVideoNodeId = null;
        this.triggeredOnceNodes = new Set();
        this.lastFrameTime = 0;
        this.gameLoopId = 0;
        this.isPaused = false;
        this.cameraState = { position: { x: 0, y: 0 }, zoom: 1 };
        this.isPreviewFullscreen = false; // State for fullscreen node

        this.interpreter = null;
    }

    async start() {
        try {
            this.projectData = BLITZBOOM_DATA;
            
            this.initInput();
            await this.loadAssets();
            this.loadScene(this.projectData.initialSceneId);
        } catch(e) {
            console.error("BlitzBoom Engine: Fatal error during game initialization:", e);
            document.body.innerHTML = '<div style="color: #fca5a5; background-color: #1f2937; font-family: monospace; padding: 2em; border: 2px solid #ef4444; height: 100vh; box-sizing: border-box;">' +
                '<h1>Engine Error</h1><p>Could not start the game. Check the console for details.</p><pre style="white-space: pre-wrap; word-break: break-all;">' + e.stack + '</pre></div>';
        }
    }

    loadScene(sceneId) {
        console.log(\`Loading scene: \${sceneId}\`);
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
        }
        
        this.musicChannels.forEach(audio => audio.pause());
        this.musicChannels.clear();
        this.activeTimers.clear();
        this.activeCountdowns.clear();
        this.triggeredOnceNodes.clear();
        this.isPaused = false;
        this.cameraState = { position: { x: 0, y: 0 }, zoom: 1 };
        
        const sceneData = this.projectData.scenes.find(s => s.id === sceneId);
        if (!sceneData) {
            console.error(\`Scene with id '\${sceneId}' not found!\`);
            return;
        }
        this.currentScene = sceneData;

        this.initGameObjects();
        this.interpreter = new NodeInterpreter(this, this.currentScene);
        
        this.videoPlayer.onended = () => {
            if(this.activeVideoNodeId) {
                this.interpreter.runVideoEvent(this.activeVideoNodeId, 'onFinished');
                this.activeVideoNodeId = null;
                this.videoPlayer.style.display = 'none';
            }
        };

        this.interpreter.runEvent('onStart');
        
        this.lastFrameTime = performance.now();
        this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
    }
    
    initGameObjects() {
        this.gameObjects = this.currentScene.gameObjects.map(go => {
             const transform = go.behaviors.find(b => b.type === 'transform');
             const position = transform ? { ...transform.properties.position } : { x: 0, y: 0 };
             return {
                ...go,
                position: position,
                velocity: { x: 0, y: 0 },
                initialPosition: position,
                patrolTime: 0,
                prevPosition: position,
                isGrounded: false,
                currentAnimation: 'Idle',
                animationTime: 0,
                animationSpeed: 1,
                currentFrame: 0,
                isActive: go.isActive ?? true,
            };
        });
    }

    initInput() {
        window.addEventListener('keydown', e => this.keyboardState[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.keyboardState[e.key.toLowerCase()] = false);
        this.canvas.addEventListener('pointerdown', this.handleCanvasClick.bind(this));
    }
    
    handleCanvasClick(event) {
        if (this.isPaused) return;
        const rect = this.canvas.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        // --- Correct coordinate mapping for fullscreen ---
        const resolution = this.projectData.resolution;
        if (!resolution) return; // Safety check
        const gameRatio = resolution.width / resolution.height;
        const screenRatio = this.canvas.clientWidth / this.canvas.clientHeight;

        let scale = 1;
        let offsetX = 0;
        let offsetY = 0;

        if (screenRatio > gameRatio) { // Letterboxed horizontally (wider screen)
            scale = this.canvas.clientHeight / resolution.height;
            offsetX = (this.canvas.clientWidth - resolution.width * scale) / 2;
        } else { // Letterboxed vertically (taller screen)
            scale = this.canvas.clientWidth / resolution.width;
            offsetY = (this.canvas.clientHeight - resolution.height * scale) / 2;
        }
        
        const mouseInGameScreenX = (screenX - offsetX) / scale;
        const mouseInGameScreenY = (screenY - offsetY) / scale;

        // Invert camera transform to get world coordinates
        const worldX = (mouseInGameScreenX - resolution.width / 2) / this.cameraState.zoom + this.cameraState.position.x;
        const worldY = (mouseInGameScreenY - resolution.height / 2) / this.cameraState.zoom + this.cameraState.position.y;
        const clickPoint = { x: worldX, y: worldY };

        // Iterate from top-most to bottom-most
        const sortedObjects = [...this.gameObjects].sort((a, b) => getZIndex(b) - getZIndex(a));
        
        for (const go of sortedObjects) {
            if (!(go.isActive ?? true)) continue;

            const hitboxes = getActiveHitboxes(go);
            for (const box of hitboxes) {
                if (clickPoint.x >= box.x && clickPoint.x <= box.x + box.width &&
                    clickPoint.y >= box.y && clickPoint.y <= box.y + box.height) {
                    
                    this.interpreter.runClickEvent(go.id);
                    return; // Stop after finding the top-most object
                }
            }
        }
    }

    spawnGameObject(type, position) {
        const existingNames = this.gameObjects.map(go => go.name);
        const newObject = createGameObjectFromType(type, position, existingNames);
        const newSimObject = {
            ...newObject,
            position,
            velocity: { x: 0, y: 0 },
            initialPosition: position,
            patrolTime: 0,
            prevPosition: position,
            isGrounded: false,
            currentAnimation: null,
            animationTime: 0,
            animationSpeed: 1,
            currentFrame: 0,
            isActive: true,
        };
        this.gameObjects.push(newSimObject);
        return newSimObject;
    }

    loadAssets() {
        const assetPromises = [];
        const flattenedAssets = [];
        
        function traverse(assetsNode) {
            if (!assetsNode) return;
            assetsNode.forEach(asset => {
                if ((asset.type === 'image' || asset.type === 'audio' || asset.type === 'video' || asset.type === 'font') && asset.path) {
                    flattenedAssets.push(asset);
                }
                if (asset.children) {
                    traverse(asset.children);
                }
            });
        }
        traverse(this.projectData.assets);

        for(const asset of flattenedAssets) {
            if (asset.type === 'image') {
                const promise = new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => { this.assets[asset.id] = img; resolve(); };
                    img.onerror = (err) => { console.error('Failed to load asset: ' + asset.path, err); reject(new Error('Failed to load asset: ' + asset.path)); };
                    img.src = asset.path;
                });
                assetPromises.push(promise);
            } else if (asset.type === 'audio' || asset.type === 'video') {
                 const promise = new Promise((resolve, reject) => {
                    const mediaElement = asset.type === 'audio' ? new Audio() : document.createElement('video');
                    mediaElement.oncanplaythrough = () => { this.assets[asset.id] = mediaElement; this.audioPlayers.set(asset.id, mediaElement); resolve(); };
                    mediaElement.onerror = (err) => { console.error('Failed to load media asset: ' + asset.path, err); reject(new Error('Failed to load media asset: ' + asset.path)); };
                    mediaElement.src = asset.path;
                });
                assetPromises.push(promise);
            } else if (asset.type === 'font') {
                 const promise = new Promise((resolve, reject) => {
                    const encodedPath = encodeURI(asset.path);
                    const fontFace = new FontFace(\`\${asset.id}\`, \`url(\${encodedPath})\`);
                    fontFace.load().then((loadedFace) => {
                        document.fonts.add(loadedFace);
                        this.assets[asset.id] = loadedFace;
                        resolve();
                    }).catch(err => {
                        console.error('Failed to load font: ' + asset.path, err);
                        reject(new Error('Failed to load font: ' + asset.path));
                    });
                });
                assetPromises.push(promise);
            }
        }
        return Promise.all(assetPromises);
    }
    
    getGameObjectSprite(go) {
        if (go.currentAnimation && go.animations) {
            const activeClip = go.animations.find(anim => anim.name === go.currentAnimation);
            if (activeClip && activeClip.frames.length > 0) {
                const frameIndex = go.currentFrame || 0;
                const currentFrame = activeClip.frames[frameIndex];
                if (currentFrame?.spriteAssetId) return this.assets[currentFrame.spriteAssetId];
            }
        }
        const idleAnimation = go.animations?.find(anim => anim.name.toLowerCase() === 'idle');
        if (idleAnimation && idleAnimation.frames.length > 0) {
            const frame = idleAnimation.frames[0];
            if (frame.spriteAssetId) return this.assets[frame.spriteAssetId];
        }
        const spriteRenderer = go.behaviors.find(b => b.type === 'spriteRenderer');
        if (spriteRenderer?.properties.assetId) return this.assets[spriteRenderer.properties.assetId];
        return null;
    }

    updateMovingPlatforms(deltaTime) {
        if (deltaTime === 0) return;
        this.gameObjects = this.gameObjects.map(go => {
            if (go.type !== 'platform' || !go.initialPosition || !(go.isActive ?? true)) {
                if (go.type === 'platform') return { ...go, velocity: { x: 0, y: 0 } };
                return go;
            }
            const controller = go.behaviors.find(b => b.type === 'platformController')?.properties;
            if (!controller || controller.moveDirection === 'None' || controller.moveSpeed <= 0) return { ...go, velocity: { x: 0, y: 0 } };
            
            const prevPosition = { ...go.position };
            const newGo = { ...go, position: { ...go.position }, patrolTime: (go.patrolTime || 0) + deltaTime };
            const { moveSpeed: speed, moveDistance: distance, moveDirection } = controller;
            const duration = speed > 0 ? distance / speed : 0;
            if (duration > 0) {
                const offset = Math.sin((newGo.patrolTime / duration) * Math.PI) * (distance / 2);
                if (moveDirection === 'Horizontal') newGo.position.x = go.initialPosition.x + offset;
                else if (moveDirection === 'Vertical') newGo.position.y = go.initialPosition.y + offset;
            }
            newGo.velocity = { x: (newGo.position.x - prevPosition.x) / deltaTime, y: (newGo.position.y - prevPosition.y) / deltaTime };
            return newGo;
        });
    }

    pause() { this.isPaused = true; }
    resume() { this.isPaused = false; }
    togglePause() { this.isPaused = !this.isPaused; }

    gameLoop(timestamp) {
        try {
            if (this.isPaused) {
                this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
                return;
            }

            const now = performance.now();
            let deltaTime = (now - this.lastFrameTime) / 1000;
            this.lastFrameTime = now;
            if (deltaTime > 1 / 30) deltaTime = 1 / 30;

            const timersToRemove = [], timersToReset = [];
            for (const [id, timer] of this.activeTimers.entries()) {
                if (now >= timer.startTime + timer.duration * 1000) {
                    this.interpreter.runTimerEvent(id);
                    if (timer.loop) timersToReset.push({ id, timer: { ...timer, startTime: now } });
                    else timersToRemove.push(id);
                }
            }
            timersToRemove.forEach(id => this.activeTimers.delete(id));
            timersToReset.forEach(({ id, timer }) => this.activeTimers.set(id, timer));

            const finishedCountdowns = [];
            if (this.activeCountdowns.size > 0) {
                this.activeCountdowns.forEach((countdown, nodeId) => {
                    if (countdown.isFinished) return;
                    const remainingMs = Math.max(0, countdown.endTime - now);
                    const formattedTime = formatTime(remainingMs / 1000);
                    this.gameObjects = this.gameObjects.map(go => {
                        if (go.id === countdown.targetId) {
                            const textRenderer = go.behaviors.find(b => b.type === 'textRenderer');
                            if (textRenderer && textRenderer.properties.text !== formattedTime) {
                                const newGo = JSON.parse(JSON.stringify(go));
                                newGo.behaviors.find(b => b.type === 'textRenderer').properties.text = formattedTime;
                                return newGo;
                            }
                        }
                        return go;
                    });
                    if (remainingMs === 0) {
                        countdown.isFinished = true;
                        finishedCountdowns.push(nodeId);
                    }
                });
            }
            if (finishedCountdowns.length > 0) {
                finishedCountdowns.forEach(nodeId => {
                    this.interpreter.runTimerEvent(nodeId, 'onFinished');
                    this.activeCountdowns.delete(nodeId);
                });
            }
            
            this.gameObjects = this.gameObjects.map(go => {
                if (go.animations?.length > 0 && go.currentAnimation) {
                    const clip = go.animations.find(a => a.name === go.currentAnimation);
                    if (clip?.frames.length > 0) {
                        const frameDuration = 1 / (clip.fps || 10);
                        let newTime = (go.animationTime || 0) + (deltaTime * (go.animationSpeed || 1));
                        let frameIndex = Math.floor(newTime / frameDuration);
                        if (clip.loop) frameIndex %= clip.frames.length;
                        else frameIndex = Math.min(frameIndex, clip.frames.length - 1);
                        return { ...go, animationTime: newTime, currentFrame: frameIndex };
                    }
                }
                return go;
            });

            // --- Run Active AIs ---
            this.gameObjects = this.gameObjects.map(go => {
                if (go.aiControllerNodeId && (go.isActive ?? true)) {
                    const aiNode = this.currentScene.nodes.find(n => n.id === go.aiControllerNodeId);
                    if (aiNode) {
                        const aiContext = this.interpreter.createContext(deltaTime);
                        return updateEnemyAI(go, aiNode, aiContext);
                    }
                }
                return go;
            });


            this.updateMovingPlatforms(deltaTime);
            this.interpreter.runEvent('onUpdate', deltaTime);

            // --- Custom Hitbox Collision Detection ---
            const collidableObjects = this.gameObjects.filter(go => go.useCustomHitboxes && (go.isActive ?? true));
            for (let i = 0; i < collidableObjects.length; i++) {
                for (let j = i + 1; j < collidableObjects.length; j++) {
                    const objA = collidableObjects[i];
                    const objB = collidableObjects[j];
                    
                    const hitboxesA = getActiveHitboxes(objA);
                    const hitboxesB = getActiveHitboxes(objB);

                    let collisionFound = false;
                    for (const boxA of hitboxesA) {
                        for (const boxB of hitboxesB) {
                            if (aabbCollision(boxA, boxB)) {
                                this.interpreter.runCollisionEvent(objA.id, objB.id);
                                collisionFound = true;
                                break;
                            }
                        }
                        if (collisionFound) break;
                    }
                }
            }

            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#1f2937';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            
            this.ctx.save();
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.scale(this.cameraState.zoom, this.cameraState.zoom);
            this.ctx.translate(-this.cameraState.position.x, -this.cameraState.position.y);

            const sortedGameObjects = [...this.gameObjects].sort((a, b) => getZIndex(a) - getZIndex(b));
            sortedGameObjects.forEach(go => {
                const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
                if (!transform) return;

                if (go.type === 'platform') {
                    const platformController = go.behaviors.find(b => b.type === 'platformController');
                    if (platformController && platformController.properties.isVisible === false) {
                        return; // Skip rendering this platform
                    }
                }
                
                if (go.type === 'text') {
                    const textRenderer = go.behaviors.find(b => b.type === 'textRenderer');
                    if (textRenderer) {
                        const props = textRenderer.properties;
                        const fontAssetId = props.customFontAssetId;
                        const fontFamily = fontAssetId ? \`\${fontAssetId}\` : props.font;
                        
                        this.ctx.save();
                        this.ctx.font = \`\${props.style || 'normal'} \${props.size}px \${fontFamily}\`;
                        this.ctx.fillStyle = props.color;
                        this.ctx.textAlign = props.align;
                        this.ctx.textBaseline = 'middle';

                        const lines = String(props.text).split('\\n');
                        const lineHeight = props.size * 1.2;
                        const totalHeight = (lines.length - 1) * lineHeight;

                        lines.forEach((line, index) => {
                            const yOffset = (index * lineHeight) - (totalHeight / 2);
                            this.ctx.fillText(line, go.position.x, go.position.y + yOffset);
                        });
                        this.ctx.restore();
                    }
                } else {
                    const img = this.getGameObjectSprite(go);
                    if (!img) return;
                    
                    const scale = transform.scale || { x: 1, y: 1 };
                    const width = 32 * scale.x;
                    const height = 32 * scale.y;
                    let renderPosition = go.position;
                    const bgController = go.behaviors.find(b => b.type === 'backgroundController');
                    if (bgController) {
                        const p = bgController.properties.parallaxSpeed || { x: 1, y: 1 };
                        renderPosition = { x: go.position.x + this.cameraState.position.x * (1 - p.x), y: go.position.y + this.cameraState.position.y * (1 - p.y) };
                    }
                    const spriteRenderer = go.behaviors.find(b => b.type === 'spriteRenderer');
                    if (spriteRenderer?.properties.renderMode === 'tiled') {
                        const pattern = this.ctx.createPattern(img, 'repeat');
                        if (pattern) {
                          this.ctx.fillStyle = pattern;
                          this.ctx.save();
                          this.ctx.translate(renderPosition.x - width / 2, renderPosition.y - height / 2);
                          this.ctx.fillRect(0, 0, width, height);
                          this.ctx.restore();
                        }
                    } else {
                        this.ctx.drawImage(img, renderPosition.x - width / 2, renderPosition.y - height / 2, width, height);
                    }
                }
            });
            this.ctx.restore();
            this.gameLoopId = requestAnimationFrame(this.gameLoop.bind(this));
        } catch(e) {
            console.error("BlitzBoom Engine: Fatal error during game loop:", e);
            if (this.gameLoopId) cancelAnimationFrame(this.gameLoopId);
            document.body.innerHTML = '<div style="color: #fca5a5; background-color: #1f2937; font-family: monospace; padding: 2em; border: 2px solid #ef4444; height: 100vh; box-sizing: border-box;"><h1>Engine Error</h1><p>The game has crashed. Check the console for details.</p><pre style="white-space: pre-wrap; word-break: break-all;">' + e.stack + '</pre></div>';
        }
    }
}

class NodeInterpreter {
    constructor(engine, scene) {
        this.engine = engine;
        this.nodes = scene.nodes;
        this.connections = scene.connections;
        this.nodeOutputCache = new Map();
        this.nodeLogic = {};
        this.initializeNodeLogic();
    }

    createContext(deltaTime = 0) {
        return {
            engine: {
                loadScene: this.engine.loadScene.bind(this.engine),
                pause: this.engine.pause.bind(this.engine),
                resume: this.engine.resume.bind(this.engine),
                togglePause: this.engine.togglePause.bind(this.engine),
                spawnGameObject: this.engine.spawnGameObject.bind(this.engine),
            },
            nodes: this.nodes,
            connections: this.connections,
            gameObjects: this.engine.gameObjects,
            keyboardState: this.engine.keyboardState,
            audioPlayers: this.engine.audioPlayers,
            musicChannels: this.engine.musicChannels,
            videoState: null, // This is managed by the engine directly now
            cameraState: this.engine.cameraState,
            activeTimers: this.engine.activeTimers,
            activeCountdowns: this.engine.activeCountdowns,
            triggeredOnceNodes: this.engine.triggeredOnceNodes,
            deltaTime,
            setGameObjects: (action) => { this.engine.gameObjects = typeof action === 'function' ? action(this.engine.gameObjects) : action; },
            setVideoState: (action) => {
                const newState = typeof action === 'function' ? action(this.engine.videoState) : action;
                if (newState && newState.isPlaying) {
                     const p = this.engine.videoPlayer;
                     const asset = this.engine.assets[newState.assetId];
                     if (asset) {
                         p.src = asset.src;
                         p.loop = newState.loop;
                         p.volume = newState.volume;
                         p.style.display = 'block';
                         p.play();
                         this.engine.activeVideoNodeId = newState.nodeId;
                     }
                } else if (this.engine.activeVideoNodeId) {
                     const p = this.engine.videoPlayer;
                     p.pause();
                     p.style.display = 'none';
                     this.engine.activeVideoNodeId = null;
                }
            },
            setCameraState: (action) => { this.engine.cameraState = typeof action === 'function' ? action(this.engine.cameraState) : action; },
            setPreviewFullscreen: (action) => {
                const elem = this.engine.gameContainer;
                const isFullscreen = !!document.fullscreenElement;
                const shouldBeFullscreen = typeof action === 'function' ? action(isFullscreen) : action;
                if (shouldBeFullscreen && !isFullscreen) {
                    if (elem.requestFullscreen) elem.requestFullscreen();
                } else if (!shouldBeFullscreen && isFullscreen) {
                    if (document.exitFullscreen) document.exitFullscreen();
                }
            },
            addLog: (msg) => console.log('[Game Log]', msg),
            evaluateInput: this.evaluateInput.bind(this),
            triggerOutput: this.triggerOutput.bind(this),
            nodeOutputCache: this.nodeOutputCache,
        };
    }

    runEvent(eventType, deltaTime = 0) {
        this.nodeOutputCache.clear();
        const context = this.createContext(deltaTime);
        this.nodes.filter(n => n.type === eventType).forEach(node => this.triggerOutput(node.id, 'execOut', context));
    }

    runTimerEvent(timerNodeId, pinId = 'onFinished') {
        const timerNode = this.nodes.find(n => n.id === timerNodeId);
        if (timerNode) this.triggerOutput(timerNode.id, pinId, this.createContext(0));
    }

    runCollisionEvent(objectAId, objectBId) {
        this.nodeOutputCache.clear();
        const context = this.createContext(0);
        this.nodes.filter(n => n.type === 'onCollision').forEach(node => {
            context.nodeOutputCache.set(\`\${node.id}-objectA\`, objectAId);
            context.nodeOutputCache.set(\`\${node.id}-objectB\`, objectBId);
            this.triggerOutput(node.id, 'execOut', context);
        });
    }

    runClickEvent(clickedObjectId) {
        this.nodeOutputCache.clear();
        const context = this.createContext(0);
        this.nodes
            .filter(n => n.type === 'onClickOrTouch' && (!n.properties.targetObjectId || n.properties.targetObjectId === clickedObjectId))
            .forEach(node => {
                this.triggerOutput(node.id, 'execOut', context);
            });
    }

    runVideoEvent(videoNodeId, pinId) {
        const videoNode = this.nodes.find(n => n.id === videoNodeId);
        if (videoNode) this.triggerOutput(videoNode.id, pinId, this.createContext(0));
    }

    evaluateInput(nodeId, pinId, context) {
        const connection = this.connections.find(c => c.toNodeId === nodeId && c.toInputId === pinId);
        if (!connection) return undefined;
        const sourceNodeId = connection.fromNodeId, sourcePinId = connection.fromOutputId;
        const cacheKey = \`\${sourceNodeId}-\${sourcePinId}\`;
        if (context.nodeOutputCache.has(cacheKey)) return context.nodeOutputCache.get(cacheKey);
        const sourceNode = this.nodes.find(n => n.id === sourceNodeId);
        if (sourceNode && this.nodeLogic[sourceNode.type]) {
            this.nodeLogic[sourceNode.type](sourceNode, context);
            return context.nodeOutputCache.get(cacheKey);
        }
        return undefined;
    }

    triggerOutput(nodeId, pinId, context) {
        this.connections.filter(c => c.fromNodeId === nodeId && c.fromOutputId === pinId).forEach(connection => {
            const nextNode = this.nodes.find(n => n.id === connection.toNodeId);
            if (nextNode && this.nodeLogic[nextNode.type]) {
                this.nodeLogic[nextNode.type](nextNode, {...context, triggeredPinId: connection.toInputId});
            }
        });
    }
    
    initializeNodeLogic() {
        this.nodeLogic = {
            'branch': (node, context) => {
                const condition = context.evaluateInput(node.id, 'condition', context);
                context.triggerOutput(node.id, condition ? 'execOutTrue' : 'execOutFalse', context);
            },
            'greaterThan': (node, context) => context.nodeOutputCache.set(\`\${node.id}-result\`, (context.evaluateInput(node.id, 'a', context) ?? 0) > (context.evaluateInput(node.id, 'b', context) ?? 0)),
            'lessThan': (node, context) => context.nodeOutputCache.set(\`\${node.id}-result\`, (context.evaluateInput(node.id, 'a', context) ?? 0) < (context.evaluateInput(node.id, 'b', context) ?? 0)),
            'add': (node, context) => context.nodeOutputCache.set(\`\${node.id}-result\`, Number(context.evaluateInput(node.id, 'a', context) ?? 0) + Number(context.evaluateInput(node.id, 'b', context) ?? 0)),
            'subtract': (node, context) => context.nodeOutputCache.set(\`\${node.id}-result\`, Number(context.evaluateInput(node.id, 'a', context) ?? 0) - Number(context.evaluateInput(node.id, 'b', context) ?? 0)),
            'multiply': (node, context) => context.nodeOutputCache.set(\`\${node.id}-result\`, Number(context.evaluateInput(node.id, 'a', context) ?? 1) * Number(context.evaluateInput(node.id, 'b', context) ?? 1)),
            'divide': (node, context) => { const b = context.evaluateInput(node.id, 'b', context) ?? 1; context.nodeOutputCache.set(\`\${node.id}-result\`, b !== 0 ? (Number(context.evaluateInput(node.id, 'a', context) ?? 0) / Number(b)) : 0); },
            'string': (node, context) => context.nodeOutputCache.set(\`\${node.id}-value\`, node.properties.value),
            'number': (node, context) => context.nodeOutputCache.set(\`\${node.id}-value\`, Number(node.properties.value)),
            'boolean': (node, context) => context.nodeOutputCache.set(\`\${node.id}-value\`, node.properties.value),
            'vector2': (node, context) => context.nodeOutputCache.set(\`\${node.id}-value\`, { x: Number(node.properties.x), y: Number(node.properties.y) }),
            'toString': (node, context) => context.nodeOutputCache.set(\`\${node.id}-string\`, String(context.evaluateInput(node.id, 'value', context) ?? '')),
            'concatenate': (node, context) => context.nodeOutputCache.set(\`\${node.id}-result\`, \`\${context.evaluateInput(node.id, 'a', context) ?? ''}\${context.evaluateInput(node.id, 'b', context) ?? ''}\`),
            'distance': (node, context) => context.nodeOutputCache.set(\`\${node.id}-distance\`, distance(context.evaluateInput(node.id, 'a', context), context.evaluateInput(node.id, 'b', context))),
            'addVector2': (node, context) => { const a = context.evaluateInput(node.id, 'a', context) || {x:0, y:0}; const b = context.evaluateInput(node.id, 'b', context) || {x:0, y:0}; context.nodeOutputCache.set(\`\${node.id}-result\`, { x: a.x + b.x, y: a.y + b.y }); },
            'getGameObject': (node, context) => context.nodeOutputCache.set(\`\${node.id}-objectOut\`, context.gameObjects.find(go => go.name === node.properties.objectName)?.id),
            'getProperty': (node, context) => { const targetId = context.evaluateInput(node.id, 'target', context), propertyName = node.properties.propertyName; if (!targetId || !propertyName) { context.nodeOutputCache.set(\`\${node.id}-value\`, undefined); return; } const target = context.gameObjects.find(go => go.id === targetId); if (!target) { context.nodeOutputCache.set(\`\${node.id}-value\`, undefined); return; } if (Object.prototype.hasOwnProperty.call(target, propertyName)) { context.nodeOutputCache.set(\`\${node.id}-value\`, target[propertyName]); return; } const script = target.behaviors.find(b => b.type === 'script'); if (script && Object.prototype.hasOwnProperty.call(script.properties, propertyName)) { context.nodeOutputCache.set(\`\${node.id}-value\`, script.properties[propertyName]); return; } context.nodeOutputCache.set(\`\${node.id}-value\`, undefined); },
            'setProperty': (node, context) => { const targetId = context.evaluateInput(node.id, 'target', context), value = context.evaluateInput(node.id, 'value', context), propertyName = node.properties.propertyName; if (targetId && propertyName && value !== undefined) { context.setGameObjects(gos => gos.map(go => { if (go.id === targetId) { const newGo = JSON.parse(JSON.stringify(go)); const script = newGo.behaviors.find(b => b.type === 'script'); if (script) { script.properties[propertyName] = value; } return newGo; } return go; })); } context.triggerOutput(node.id, 'execOut', context); },
            'moveObject': (node, context) => { const targetId = context.evaluateInput(node.id, 'target', context), dir = node.properties.direction, speed = Number(node.properties.speed) || 0; if (targetId && speed !== 0) { context.setGameObjects(gos => gos.map(go => { if (go.id === targetId) { const newGo = { ...go, position: { ...go.position } }; if (dir === 'X') { newGo.position.x += speed * context.deltaTime; } else if (dir === 'Y') { newGo.position.y += speed * context.deltaTime; } return newGo; } return go; })); } context.triggerOutput(node.id, 'execOut', context); },
            'setPosition': (node, context) => { const targetId = context.evaluateInput(node.id, 'target', context); if (!targetId) { context.triggerOutput(node.id, 'execOut', context); return; } let finalPosition = null; const objectToFollowId = context.evaluateInput(node.id, 'objectToFollow', context); const positionFromPin = context.evaluateInput(node.id, 'position', context); if (objectToFollowId) { const objectToFollow = context.gameObjects.find(go => go.id === objectToFollowId); if (objectToFollow) finalPosition = { ...objectToFollow.position }; } else if (node.properties.targetObjectName) { const objectToFollow = context.gameObjects.find(go => go.name === node.properties.targetObjectName); if (objectToFollow) { finalPosition = { ...objectToFollow.position }; } } else if (positionFromPin) { finalPosition = positionFromPin; } else { finalPosition = node.properties.position; } if (finalPosition) { context.setGameObjects(gos => gos.map(go => go.id === targetId ? { ...go, position: { ...finalPosition } } : go )); } context.triggerOutput(node.id, 'execOut', context); },
            'activateObject': (node, context) => { const targetId = context.evaluateInput(node.id, 'target', context); const action = node.properties.action || 'Activate'; const isActive = action === 'Activate'; if (targetId) { context.setGameObjects(gos => gos.map(go => go.id === targetId ? { ...go, isActive } : go )); } context.triggerOutput(node.id, 'execOut', context); },
            'changeAnimation': (node, context) => { const targetId = context.evaluateInput(node.id, 'target', context), name = node.properties.animationName, speed = Number(node.properties.animationSpeed) || 1, restart = node.properties.restartIfPlaying === true; if (targetId) { context.setGameObjects(gos => gos.map(go => { if (go.id === targetId && (restart || go.currentAnimation !== name)) { return { ...go, currentAnimation: name, animationSpeed: speed, animationTime: 0, currentFrame: 0 }; } return go; })); } context.triggerOutput(node.id, 'execOut', context); },
            'setText': (node, context) => { const targetId = context.evaluateInput(node.id, 'target', context), text = context.evaluateInput(node.id, 'text', context); if (targetId && typeof text === 'string') { context.setGameObjects(gos => gos.map(go => { if (go.id === targetId) { const newGo = JSON.parse(JSON.stringify(go)); const renderer = newGo.behaviors.find(b => b.type === 'textRenderer'); if (renderer) { renderer.properties.text = text; } else { console.warn(\`[Warning] Set Text: Target '\${go.name}' has no Text Renderer.\`); } return newGo; } return go; })); } context.triggerOutput(node.id, 'execOut', context); },
            'getText': (node, context) => { const targetId = context.evaluateInput(node.id, 'target', context); let text; if (targetId) { const target = context.gameObjects.find(go => go.id === targetId); if (target) { const renderer = target.behaviors.find(b => b.type === 'textRenderer'); if (renderer) text = renderer.properties.text; } } context.nodeOutputCache.set(\`\${node.id}-text\`, text); },
            'getKey': (node, context) => context.nodeOutputCache.set(\`\${node.id}-isDown\`, !!context.keyboardState[String(node.properties.key).toLowerCase()]),
            'getAxis': (node, context) => { const neg = String(node.properties.negativeKey).toLowerCase(), pos = String(node.properties.positiveKey).toLowerCase(); let axis = 0; if (context.keyboardState[pos]) axis += 1; if (context.keyboardState[neg]) axis -= 1; context.nodeOutputCache.set(\`\${node.id}-axis\`, axis); },
            'keyboardPlatformerController': (node, context) => {
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
                    key: (props[\`attack\${index}Key\`] || '')?.toLowerCase(),
                    anim: props[\`attack\${index}Anim\`]
                })).filter(a => a.key && a.anim);

                const attackAnims = new Set(attacks.map(a => a.anim));
                const collidables = context.gameObjects.filter(go => go.type === 'platform' || go.type === 'hitbox');

                context.setGameObjects(gos => gos.map(go => {
                    if (go.id !== targetId || !(go.isActive ?? true)) return go;
                    
                    if (!go._attackState) go._attackState = { keysDownPreviously: new Set() };
                    const keysDownPreviously = go._attackState.keysDownPreviously;
                    const newGo = { ...go, velocity: { ...go.velocity }, prevPosition: go.position };
                    
                    const wasJumpDown = keysDownPreviously.has(jumpKey);
                    const jumpJustPressed = jumpDown && !wasJumpDown;
                    if (jumpJustPressed) newGo.jumpRequested = true;
                    
                    const currentClip = newGo.animations?.find(a => a.name === newGo.currentAnimation);
                    const isAttacking = currentClip && attackAnims.has(currentClip.name);
                    let attackFinished = false;
                    if (isAttacking) {
                        const duration = currentClip.frames.length / (currentClip.fps || 10);
                        if (newGo.animationTime >= duration - 0.001) attackFinished = true;
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
                    let nearestVCollision = { time: 1, normal: {x: 0, y: 0} };
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
                    let nearestHCollision = { time: 1, normal: {x: 0, y: 0} };
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
                    
                    const currentKeysDown = new Set();
                    attacks.forEach(attack => {
                        if (!!context.keyboardState[attack.key]) currentKeysDown.add(attack.key);
                    });
                    if (jumpDown) currentKeysDown.add(jumpKey);
                    newGo._attackState = { keysDownPreviously: currentKeysDown };
                    return newGo;
                }));
                context.triggerOutput(node.id, 'execOut', context);
            },
            'logMessage': (node, context) => { console.log('[Node Log]:', context.evaluateInput(node.id, 'message', context)); context.triggerOutput(node.id, 'execOut', context); },
            'playMusic': (node, context) => { const { action='Play', musicAssetId, loop=true, volume=1, channel=0 } = node.properties; const channelNum = Number(channel) || 0; if (action === 'Play') { if (musicAssetId) { const audioAsset = context.audioPlayers.get(musicAssetId); if (audioAsset) { const existing = context.musicChannels.get(channelNum); if(existing) { existing.pause(); existing.currentTime = 0; } const newAudio = audioAsset.cloneNode(); newAudio.loop = loop; newAudio.volume = Math.max(0,Math.min(1,volume)); newAudio.play().catch(e=>console.error(e)); context.musicChannels.set(channelNum, newAudio); } } } else { const audioOnChannel = context.musicChannels.get(channelNum); if(audioOnChannel) { if(action === 'Pause') audioOnChannel.pause(); else if (action === 'Stop') { audioOnChannel.pause(); audioOnChannel.currentTime = 0; context.musicChannels.delete(channelNum); } } } context.triggerOutput(node.id, 'execOut', context); },
            'musicChannel': (node, context) => { const { action, channel } = node.properties; if (action === 'Stop Music on Channel') { const audio = context.musicChannels.get(Number(channel)||0); if (audio) { audio.pause(); audio.currentTime = 0; context.musicChannels.delete(Number(channel)||0); } } else if (action === 'Stop music on all channels') { context.musicChannels.forEach(audio => { audio.pause(); audio.currentTime = 0; }); context.musicChannels.clear(); } context.triggerOutput(node.id, 'execOut', context); },
            'sounds': (node, context) => { const { soundAssetId, volume=1, speed=1 } = node.properties; if (soundAssetId) { const audio = this.engine.assets[soundAssetId]; if (audio) { const sfx = audio.cloneNode(); sfx.volume = volume; sfx.playbackRate = speed; sfx.play().catch(e=>console.error(e)); } } context.triggerOutput(node.id, 'execOut', context); },
            'playVideo': (node, context) => { const { action='Play', videoAssetId, loop=false, volume=1 } = node.properties; if (action === 'Play' && videoAssetId) { context.setVideoState({ assetId: videoAssetId, nodeId: node.id, isPlaying: true, loop, volume }); } else { if (action === 'Pause' || action === 'Stop') { context.setVideoState(prev => prev ? ({ ...prev, isPlaying: false }) : null); } if (action === 'Stop') { context.setVideoState(null); } } context.triggerOutput(node.id, 'execOut', context); },
            'timer': (node, context) => { if (context.triggeredPinId === 'start') context.activeTimers.set(node.id, { startTime: performance.now(), duration: Number(node.properties.duration) || 1, loop: node.properties.loop === true }); else if (context.triggeredPinId === 'stop') context.activeTimers.delete(node.id); },
            'countdownClock': (node, context) => { const { activeCountdowns } = context; if (!activeCountdowns) { context.addLog('[Error] Countdown clock not initialized.'); return; } const duration = Number(node.properties.duration) || 60; if (context.triggeredPinId === 'start') { const targetId = node.properties.targetObjectId; if (!targetId) { context.addLog(\`[Warning] Countdown Clock (Node ID: \${node.id}) started with no Target selected.\`); return; } activeCountdowns.set(node.id, { nodeId: node.id, targetId, endTime: performance.now() + duration * 1000, duration, isFinished: false }); const initialFormattedTime = formatTime(duration); context.setGameObjects(gos => gos.map(go => { if (go.id === targetId) { const newGo = JSON.parse(JSON.stringify(go)); const textRenderer = newGo.behaviors.find(b => b.type === 'textRenderer'); if (textRenderer) { textRenderer.properties.text = initialFormattedTime; } return newGo; } return go; })); } else if (context.triggeredPinId === 'stop') { activeCountdowns.delete(node.id); } const countdownState = activeCountdowns.get(node.id); if (countdownState) { const remainingMs = Math.max(0, countdownState.endTime - performance.now()); context.nodeOutputCache.set(\`\${node.id}-remainingSeconds\`, remainingMs / 1000); } else { context.nodeOutputCache.set(\`\${node.id}-remainingSeconds\`, duration); } },
            'triggerOnce': (node, context) => { if (!context.triggeredOnceNodes.has(node.id)) { context.triggeredOnceNodes.add(node.id); context.triggerOutput(node.id, 'execOut', context); } },
            'changeScene': (node, context) => { if (node.properties.sceneId) this.engine.loadScene(node.properties.sceneId); },
            'pauseScene': (node, context) => { const a = node.properties.action || 'Toggle'; if(a==='Pause')this.engine.pause();else if(a==='Resume')this.engine.resume();else this.engine.togglePause(); context.triggerOutput(node.id, 'execOut', context); },
            'fullScreen': (node, context) => { if (context.setPreviewFullscreen) { const action = node.properties.action || 'Toggle'; switch(action) { case 'Enter': context.setPreviewFullscreen(true); break; case 'Exit': context.setPreviewFullscreen(false); break; case 'Toggle': context.setPreviewFullscreen(prev => !prev); break; } } context.triggerOutput(node.id, 'execOut', context); },
            'camera': (node, context) => { const { sensitivity=0.1, zoom=1, offset={x:0,y:0}, bounds } = node.properties; let target = context.gameObjects.find(go => go.id === context.evaluateInput(node.id, 'target', context)) || context.gameObjects.find(go => go.name === node.properties.targetName); context.setCameraState(prev => { let pos = target ? {x: target.position.x + offset.x, y: target.position.y + offset.y} : prev.position; let newX = prev.position.x + (pos.x - prev.position.x) * sensitivity; let newY = prev.position.y + (pos.y - prev.position.y) * sensitivity; if(bounds && typeof bounds.minX === 'number') { newX = Math.max(bounds.minX, Math.min(bounds.maxX, newX)); newY = Math.max(bounds.minY, Math.min(bounds.maxY, newY)); } return { position: { x: newX, y: newY }, zoom: zoom }; }); context.triggerOutput(node.id, 'execOut', context); },
            'getPosition': (node, context) => { const targetId = context.evaluateInput(node.id, 'target', context); const target = context.gameObjects.find(go => go.id === targetId); context.nodeOutputCache.set(\`\${node.id}-position\`, target?.position); },
            'setVelocity': (node, context) => { const targetId = context.evaluateInput(node.id, 'target', context), vel = context.evaluateInput(node.id, 'velocity', context); if (targetId && vel) { context.setGameObjects(gos => gos.map(go => go.id === targetId ? { ...go, velocity: { ...vel } } : go)); } context.triggerOutput(node.id, 'execOut', context); },
            'spawnObject': (node, context) => { const type = context.evaluateInput(node.id, 'objectType', context) || node.properties.objectType; const pos = context.evaluateInput(node.id, 'position', context); if (type && pos) { const newObj = this.engine.spawnGameObject(type, pos); context.nodeOutputCache.set(\`\${node.id}-spawnedObject\`, newObj.id); } context.triggerOutput(node.id, 'execOut', context); },
            'destroyObject': (node, context) => { const targetId = context.evaluateInput(node.id, 'target', context); if (targetId) { context.setGameObjects(gos => gos.filter(go => go.id !== targetId)); } else { console.warn('[Warning] Destroy Object node was triggered but no target was provided.'); } context.triggerOutput(node.id, 'execOut', context); },
            'enemyAIPlatformer': (node, context) => {
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
                                    targetPlayerId: playerId
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
    }
}

// --- Game Initialization ---
const engine = new GameEngine();
const startScreen = document.getElementById('start-screen');
const startButton = document.getElementById('start-button');
const gameContainer = document.getElementById('game-container');
const canvas = document.getElementById('game-canvas');

const projectConfig = BLITZBOOM_DATA;
if (projectConfig?.resolution) {
    const res = projectConfig.resolution;
    canvas.width = res.width;
    canvas.height = res.height;
    gameContainer.style.width = res.width + 'px';
    gameContainer.style.height = res.height + 'px';
}

startButton.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    if (projectConfig.startFullscreen) {
        gameContainer.requestFullscreen().catch(err => {
            console.error(\`Fullscreen request failed: \${err.message}\`);
        }).finally(() => {
            engine.start();
        });
    } else {
        engine.start();
    }
}, { once: true });
`;

const stringToHash = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const generateHslColor = (id: string) => {
  const hash = stringToHash(id);
  const h = hash % 360;
  return `hsl(${h}, 70%, 50%)`; // Hue, Saturation, Lightness
};


// --- Mock Data and Utils ---

const platformerScriptContent = `
// BlitzBoom Platformer Script

/**
 * This script provides platformer physics for a game object.
 * Define editable properties using the @property tag below.
 * The editor will automatically parse these and display them in the Properties panel.
 *
 * property schema: { "name": "Display Name", "type": "number" | "boolean", "default": any }
 */

// @property { "name": "Gravity", "type": "number", "default": 1200 }
// @property { "name": "Jump Strength", "type": "number", "default": 600 }
// @property { "name": "Max Speed", "type": "number", "default": 250 }
// @property { "name": "Health", "type": "number", "default": 100 }
// @property { "name": "Can Shoot", "type": "boolean", "default": false }

// The game engine's simulation will read these properties at runtime.
// You can add your own game logic in this file for a more advanced pipeline.
`;

const playerControllerScriptContent = `
// BlitzBoom Player Controller Script

/**
 * @property { "name": "Movement Speed", "type": "number", "default": 200 }
 * @property { "name": "Jump Force", "type": "number", "default": 500 }
 * @property { "name": "Is Facing Right", "type": "boolean", "default": true }
 */

// Engine Hooks (for illustration - not executed)

// function onUpdate(gameObject, input, deltaTime) {
//   // Horizontal Movement
//   if (input.isKeyDown('d')) {
//     gameObject.velocity.x = this.movementSpeed;
//     this.isFacingRight = true;
//   } else if (input.isKeyDown('a')) {
//     gameObject.velocity.x = -this.movementSpeed;
//     this.isFacingRight = false;
//   } else {
//     gameObject.velocity.x = 0;
//   }
//
//   // Jumping
//   if (input.isKeyDown('space') && gameObject.isGrounded) {
//     gameObject.velocity.y = -this.jumpForce;
//   }
// }
`;

const damageOnTouchScriptContent = `
// BlitzBoom Damage On Touch Script

/**
 * @property { "name": "Damage Amount", "type": "number", "default": 10 }
 * @property { "name": "Target Group", "type": "string", "default": "Player" }
 * @property { "name": "Destroy On Hit", "type": "boolean", "default": true }
 */

// Engine Hooks (for illustration - not executed)

// function onCollisionEnter(gameObject, other) {
//   if (other.belongsToGroup(this.targetGroup)) {
//     const health = other.getProperty('health');
//     if (health !== undefined) {
//       other.setProperty('health', health - this.damageAmount);
//     }
//
//     if (this.destroyOnHit) {
//       gameObject.destroy();
//     }
//   }
// }
`;

const simplePatrolScriptContent = `
// BlitzBoom Simple Patrol Script

/**
 * @property { "name": "Patrol Speed", "type": "number", "default": 50 }
 * @property { "name": "Patrol Distance", "type": "number", "default": 150 }
 */

// Internal state (for illustration)
// let startPositionX;
// let direction = 1;

// function onStart(gameObject) {
//   startPositionX = gameObject.position.x;
// }

// function onUpdate(gameObject, input, deltaTime) {
//   gameObject.position.x += this.patrolSpeed * direction * deltaTime;
//
//   if (direction === 1 && gameObject.position.x >= startPositionX + this.patrolDistance) {
//     direction = -1;
//   } else if (direction === -1 && gameObject.position.x <= startPositionX) {
//     direction = 1;
//   }
// }
`;

const initialAssets: Asset[] = [
  {
    id: 'root',
    name: 'Assets',
    type: AssetType.Folder,
    path: '/',
    children: [
      { id: 'sprites-folder', name: 'Sprites', type: AssetType.Folder, path: '/Sprites', children: [] },
      { id: 'platforms-folder', name: 'Platforms', type: AssetType.Folder, path: '/Platforms', children: [] },
      { id: 'textures-folder', name: 'Textures', type: AssetType.Folder, path: '/Textures', children: [] },
      { id: 'audio-folder', name: 'Audio', type: AssetType.Folder, path: '/Audio', children: [] },
      { id: 'video-folder', name: 'Video', type: AssetType.Folder, path: '/Video', children: [] },
      { id: 'fonts-folder', name: 'Fonts', type: AssetType.Folder, path: '/Fonts', children: [] },
      { id: 'scripts-folder', name: 'Scripts', type: AssetType.Folder, path: '/Scripts', children: [
        { id: 'platformer-script', name: 'platformer.js', type: AssetType.Script, path: '/Scripts/platformer.js', data: platformerScriptContent },
        { id: 'player-controller-script', name: 'PlayerController.js', type: AssetType.Script, path: '/Scripts/PlayerController.js', data: playerControllerScriptContent },
        { id: 'damage-touch-script', name: 'DamageOnTouch.js', type: AssetType.Script, path: '/Scripts/DamageOnTouch.js', data: damageOnTouchScriptContent },
        { id: 'patrol-script', name: 'SimplePatrol.js', type: AssetType.Script, path: '/Scripts/SimplePatrol.js', data: simplePatrolScriptContent },
      ]}
    ]
  }
];

// Helper function to add an asset to the tree immutably
const addAssetToTree = (assets: Asset[], newAsset: Asset, parentPath: string): Asset[] => {
    return assets.map(asset => {
        if (asset.path === parentPath && asset.type === AssetType.Folder) {
            return {
                ...asset,
                children: [...(asset.children || []), newAsset],
            };
        }
        if (asset.children) {
            return {
                ...asset,
                children: addAssetToTree(asset.children, newAsset, parentPath),
            };
        }
        return asset;
    });
};

// Helper function to ensure a folder path exists in the asset tree.
const ensurePath = (assets: Asset[], pathParts: string[], parentPath: string): Asset[] => {
    if (pathParts.length === 0) return assets;

    const [currentPart, ...rest] = pathParts;
    const currentFullPath = `${parentPath}/${currentPart}`;

    const existingFolder = assets.find(a => a.name === currentPart && a.type === AssetType.Folder);

    if (existingFolder) {
        // Folder exists, recurse into its children
        return assets.map(asset => {
            if (asset.id === existingFolder.id) {
                return {
                    ...asset,
                    children: ensurePath(asset.children || [], rest, currentFullPath)
                };
            }
            return asset;
        });
    } else {
        // Folder doesn't exist, create it and the rest of the path recursively
        const newFolder: Asset = {
            id: `asset-folder-${Date.now()}-${Math.random()}`,
            name: currentPart,
            type: AssetType.Folder,
            path: currentFullPath,
            children: ensurePath([], rest, currentFullPath)
        };
        return [...assets, newFolder];
    }
};

const createNewGameObject = (type: GameObjectType, position: Vector2, existingNames: string[], layer: string): GameObject => {
  const newId = `go-${Date.now()}`;
  let baseName = 'Object';
  if (type === 'player') baseName = 'Player';
  if (type === 'enemy') baseName = 'Enemy';
  if (type === 'platform') baseName = 'Platform';
  if (type === 'background') baseName = 'Background';
  if (type === 'bullet') baseName = 'Bullet';
  if (type === 'text') baseName = 'Text Object';
  if (type === 'hitbox') baseName = 'HitBox';
  
  let name = baseName;
  let counter = 1;
  while(existingNames.includes(name)) {
      name = `${baseName} ${counter}`;
      counter++;
  }

  const baseObject: Omit<GameObject, 'name' | 'type' | 'layer'> & { behaviors: any[] } = {
    id: newId,
    behaviors: [
      { type: 'transform', name: 'Transform', properties: { position, scale: { x: 1, y: 1 }, rotation: 0 } },
    ],
    animations: [],
    hitboxColor: generateHslColor(newId),
    isActive: true,
  };

  const scriptBehavior = { 
      type: 'script', 
      name: 'platformer.js', 
      properties: { 
          scriptAssetId: 'platformer-script', 
          ...Object.fromEntries(Object.entries(parseScriptProperties(platformerScriptContent)).map(([key, value]: [string, any]) => [key, value.default]))
      } 
  };
  
  const spriteRendererBehavior = { type: 'spriteRenderer', name: 'Sprite Renderer', properties: { assetId: null, renderMode: 'normal' } };

  const platformControllerBehavior = {
      type: 'platformController',
      name: 'Platform Controller',
      properties: {
          collisionType: 'solid',
          canGrab: false,
          moveDirection: 'None',
          moveSpeed: 50,
          moveDistance: 100,
          isVisible: true,
      }
  };

  const textRendererBehavior = {
    type: 'textRenderer',
    name: 'Text Renderer',
    properties: {
      text: 'New Text',
      font: 'sans-serif',
      size: 24,
      color: '#FFFFFF',
      style: 'normal',
      align: 'left',
      customFontAssetId: null,
    }
  };

  switch (type) {
    case 'sprite':
      return { ...baseObject, name: 'New Sprite', type, layer, behaviors: [...baseObject.behaviors, spriteRendererBehavior] };
    case 'platform':
      return { ...baseObject, name, type, layer, behaviors: [...baseObject.behaviors, spriteRendererBehavior, platformControllerBehavior] };
    case 'background':
      const backgroundControllerBehavior = {
        type: 'backgroundController',
        name: 'Background Controller',
        properties: {
          zIndex: -100,
          parallaxSpeed: { x: 0.5, y: 0.5 }
        }
      };
      return { 
          ...baseObject, 
          name, 
          type, 
          layer, 
          behaviors: [...baseObject.behaviors, spriteRendererBehavior, backgroundControllerBehavior],
          animations: [
              {id: 'anim-idle', name: 'Idle', frames: [], loop: true, fps: 10}
          ]
      };
    case 'player':
    case 'enemy':
      return { 
          ...baseObject, 
          name, 
          type,
          layer, 
          behaviors: [...baseObject.behaviors, spriteRendererBehavior, scriptBehavior],
          animations: [
              {id: 'anim-idle', name: 'Idle', frames: [], loop: true, fps: 10}, 
              {id: 'anim-run', name: 'Run', frames: [], loop: true, fps: 10},
              {id: 'anim-jump', name: 'Jump', frames: [], loop: false, fps: 10}
          ]
      };
    case 'bullet':
        const bulletSpriteRenderer = { type: 'spriteRenderer', name: 'Sprite Renderer', properties: { assetId: null, renderMode: 'normal' } };
        const bulletTransform = { type: 'transform', name: 'Transform', properties: { position, scale: { x: 0.25, y: 0.25 }, rotation: 0 } };
        return { ...baseObject, name, type, layer, behaviors: [bulletTransform, bulletSpriteRenderer] };
    case 'text':
      return { ...baseObject, name, type, layer, behaviors: [...baseObject.behaviors, textRendererBehavior] };
    case 'hitbox':
      return { ...baseObject, name, type, layer, behaviors: baseObject.behaviors, color: '#34d399' };
    default:
      return { ...baseObject, name: 'Empty Object', type: 'empty', layer, behaviors: baseObject.behaviors };
  }
};

const parseScriptProperties = (scriptContent: string): Record<string, any> => {
    const properties: Record<string, any> = {};
    if (!scriptContent) return properties;

    const regex = /@property\s*(\{.*?\})/g;
    let match;
    while ((match = regex.exec(scriptContent)) !== null) {
        try {
            const jsonString = match[1];
            const propDef = JSON.parse(jsonString);
            const key = propDef.name.replace(/\s+/g, ' ').trim().split(' ').map((word: string, index: number) => index > 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word.toLowerCase()).join('');
            properties[key] = propDef;
        } catch (e) {
            console.error('Failed to parse script property:', match[0], e);
        }
    }
    return properties;
};

type AppState = 'intro' | 'resolution' | 'editor';

interface TimerState {
    startTime: number;
    duration: number;
    loop: boolean;
}

interface VideoState {
    assetId: string;
    nodeId: string;
    isPlaying: boolean;
    loop: boolean;
    volume: number;
}

// --- Preview Simulation Helpers ---
const getActiveHitboxesForSim = (go: SimulatedGameObject) => {
    const getBoundingBox = (go: SimulatedGameObject) => {
        const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
        const scale = transform?.scale || { x: 1, y: 1 };
        const width = 32 * Math.abs(scale.x);
        const height = 32 * Math.abs(scale.y);
        return { x: go.position.x - width / 2, y: go.position.y - height / 2, width, height };
    };

    if (!go.useCustomHitboxes || !go.animations) {
        return [getBoundingBox(go)];
    }
    const transform = go.behaviors.find(b => b.type === 'transform')?.properties;
    if (!transform) return [getBoundingBox(go)];

    const activeClip = go.animations.find(anim => anim.name === go.currentAnimation);
    if (!activeClip || activeClip.frames.length === 0) {
        return [getBoundingBox(go)];
    }

    const frameIndex = activeClip.syncHitboxes ? 0 : (go.currentFrame || 0);
    const currentFrame = activeClip.frames[frameIndex];
    if (!currentFrame || !currentFrame.hitboxes || currentFrame.hitboxes.length === 0) {
        return [getBoundingBox(go)];
    }

    const scale = transform.scale || { x: 1, y: 1 };
    const spriteWidth = 32 * Math.abs(scale.x);
    const spriteHeight = 32 * Math.abs(scale.y);
    const spriteTopLeftX = go.position.x - spriteWidth / 2;
    const spriteTopLeftY = go.position.y - spriteHeight / 2;

    const lockedHitbox = currentFrame.hitboxes.find(hb => hb.isLockedToSpriteBounds);
    if (lockedHitbox) {
        return [{ x: spriteTopLeftX, y: spriteTopLeftY, width: spriteWidth, height: spriteHeight }];
    }

    const sourceSpriteWidth = currentFrame.spriteWidth || 32;
    const sourceSpriteHeight = currentFrame.spriteHeight || 32;

    if (sourceSpriteWidth === 0 || sourceSpriteHeight === 0) return [getBoundingBox(go)];

    const widthScaleFactor = spriteWidth / sourceSpriteWidth;
    const heightScaleFactor = spriteHeight / sourceSpriteHeight;
    
    return currentFrame.hitboxes.map(hb => ({
        x: spriteTopLeftX + (hb.x * widthScaleFactor),
        y: spriteTopLeftY + (hb.y * heightScaleFactor),
        width: hb.width * widthScaleFactor,
        height: hb.height * heightScaleFactor,
    }));
};

const aabbCollision = (rect1: {x:number,y:number,width:number,height:number}, rect2: {x:number,y:number,width:number,height:number}) => (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
);

const formatTime = (seconds: number): string => {
    const ceilSeconds = Math.ceil(seconds);
    const minutes = Math.floor(ceilSeconds / 60);
    const remainingSeconds = ceilSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

// Hook to find and load all font assets into the document
const useDynamicFontLoader = (assets: Asset[]) => {
    useEffect(() => {
        const fontAssets: Asset[] = [];
        const findFonts = (assetList: Asset[]) => {
            assetList.forEach(asset => {
                if (asset.type === AssetType.Font && asset.data) {
                    fontAssets.push(asset);
                }
                if (asset.children) findFonts(asset.children);
            });
        };
        findFonts(assets);

        // Keep track of fonts we've already added to avoid errors
        const loadedFontFamilies = new Set(Array.from(document.fonts).map(f => f.family));

        fontAssets.forEach(async (fontAsset) => {
            const fontName = fontAsset.id; // The name we will use in CSS and Canvas
            if (!loadedFontFamilies.has(fontName)) {
                try {
                    const fontFace = new FontFace(fontName, `url(${fontAsset.data})`);
                    await fontFace.load();
                    document.fonts.add(fontFace);
                } catch (e) {
                    console.error(`Failed to load font: ${fontAsset.name}`, e);
                }
            }
        });
    }, [assets]);
};


// Main App Component
const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>('intro');
    const [projectName, setProjectName] = useState('My BlitzBoom Game');
    const [resolution, setResolution] = useState<{ width: number; height: number } | null>(null);
    const [startFullscreen, setStartFullscreen] = useState(false);
    const [assets, setAssets] = useState<Asset[]>(initialAssets);
    
    // --- Scene Management State ---
    const [scenes, setScenes] = useState<Scene[]>([
        { id: 'scene-initial', name: 'Game Scene', type: '2d', gameObjects: [], layers: [{ name: 'Default', isVisible: true, isLocked: false }], activeLayerName: 'Default', nodes: [], connections: [] }
    ]);
    const [activeSceneId, setActiveSceneId] = useState<string>('scene-initial');
    
    // Derived state for the active scene
    const activeScene = scenes.find(s => s.id === activeSceneId)!;
    
    const setActiveScene = useCallback((updater: (scene: Scene) => Scene) => {
        setScenes(currentScenes => currentScenes.map(scene =>
            scene.id === activeSceneId ? updater(scene) : scene
        ));
    }, [activeSceneId]);

    const [objectGroups, setObjectGroups] = useState<ObjectGroup[]>([]);
    const [selectedItems, setSelectedItems] = useState<SelectedItems>(null);
    const [activeView, setActiveView] = useState<'Game Scene' | 'Events'>('Game Scene');
    
    // UI states
    const [isShowingAddObjectModal, setIsShowingAddObjectModal] = useState(false);
    const [isShowingAddObjectModal3D, setIsShowingAddObjectModal3D] = useState(false);
    const [editingAnimationsFor, setEditingAnimationsFor] = useState<GameObject | null>(null);
    const [parsedScripts, setParsedScripts] = useState<Record<string, any>>({});
    const [isShowingManual, setIsShowingManual] = useState(false);
    const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [showHitboxes, setShowHitboxes] = useState(false);
    const previewAudioPlayersRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    const previewMusicChannelsRef = useRef<Map<number, HTMLAudioElement>>(new Map());
    const projectLoadInputRef = useRef<HTMLInputElement>(null);
    
    // Simulation states
    const [previewingScene, setPreviewingScene] = useState<Scene | null>(null);
    const [isPreviewFullscreen, setPreviewFullscreen] = useState(false);
    const [liveSimObjects, setLiveSimObjects] = useState<SimulatedGameObject[]>([]);
    const [liveCameraState, setLiveCameraState] = useState<CameraState>({ position: { x: 0, y: 0 }, zoom: 1 });
    const [liveVideoState, setLiveVideoState] = useState<VideoState | null>(null);
    const [gameLogs, setGameLogs] = useState<string[]>(['Welcome to BlitzBoom!']);
    const clickedObjectIdRef = useRef<string | null>(null);

    // Call the hook to load custom fonts globally
    useDynamicFontLoader(assets);

    const addLog = useCallback((message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setGameLogs(prev => [...prev.slice(-100), `[${timestamp}] ${message}`]);
    }, []);

    const handleNewScene = useCallback(() => {
        const newSceneId = `scene-${Date.now()}`;
        let sceneName = `New Scene`;
        let counter = 1;
        while(scenes.some(s => s.name === sceneName)) {
            sceneName = `New Scene ${counter++}`;
        }

        const newScene: Scene = {
            id: newSceneId,
            name: sceneName,
            type: activeScene.type, // Create new scene of the same type
            gameObjects: [],
            layers: [{ name: 'Default', isVisible: true, isLocked: false }],
            activeLayerName: 'Default',
            nodes: [],
            connections: []
        };

        setScenes(s => [...s, newScene]);
        setActiveSceneId(newSceneId);
    }, [scenes, activeScene]);

    const handleSelectScene = (sceneId: string) => {
        setActiveSceneId(sceneId);
        const newSelection: SelectedItems = { type: 'scene', ids: [sceneId] };
        setSelectedItems(newSelection);
    };

    const handleRenameScene = (sceneId: string, newName: string) => {
        setScenes(scenes => scenes.map(s => s.id === sceneId ? { ...s, name: newName } : s));
    };

    const handleDeleteScene = (sceneId: string) => {
        if (scenes.length <= 1) {
            addLog("Cannot delete the last scene.");
            return;
        }
        const sceneToDelete = scenes.find(s => s.id === sceneId);
        if (!sceneToDelete) return;
    
        const confirmed = window.confirm(`Are you sure you want to delete the scene "${sceneToDelete.name}"? This cannot be undone.`);
        if (!confirmed) return;
    
        const newScenes = scenes.filter(s => s.id !== sceneId);
        const isDeletingActiveScene = activeSceneId === sceneId;
        const nextActiveSceneId = isDeletingActiveScene ? (newScenes[0]?.id || '') : activeSceneId;
        const nextSelectedItems: SelectedItems = isDeletingActiveScene ? (nextActiveSceneId ? { type: 'scene', ids: [nextActiveSceneId] } : null) : selectedItems;
    
        setScenes(newScenes);
        setActiveSceneId(nextActiveSceneId);
        setSelectedItems(nextSelectedItems);
        addLog(`Scene "${sceneToDelete.name}" deleted.`);
    };
    
    const handleReorderScenes = (dragIndex: number, hoverIndex: number) => {
      setScenes(prevScenes => {
        const newScenes = [...prevScenes];
        const [draggedItem] = newScenes.splice(dragIndex, 1);
        newScenes.splice(hoverIndex, 0, draggedItem);
        return newScenes;
      });
    };
    
    useEffect(() => {
        const scripts: Record<string, any> = {};
        function findScripts(assetList: Asset[]) {
            for (const asset of assetList) {
                if (asset.type === AssetType.Script && asset.data) {
                    scripts[asset.id] = parseScriptProperties(asset.data);
                }
                if (asset.children) {
                    findScripts(asset.children);
                }
            }
        }
        findScripts(assets);
        setParsedScripts(scripts);
    }, [assets]);

    // Delete selected items with Delete/Backspace key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Delete' && e.key !== 'Backspace') return;
            const activeEl = document.activeElement;
            if (activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName)) return;
            if (!selectedItems || selectedItems.ids.length === 0) return;
            e.preventDefault();

            switch (selectedItems.type) {
                case 'gameobject':
                    setActiveScene(scene => ({
                        ...scene,
                        gameObjects: scene.gameObjects.filter(go => !selectedItems.ids.includes(go.id))
                    }));
                    setSelectedItems(null);
                    break;
                case 'node':
                    const idsToDelete = new Set(selectedItems.ids);
                    setActiveScene(scene => ({
                        ...scene,
                        nodes: scene.nodes.filter(n => !idsToDelete.has(n.id)),
                        connections: scene.connections.filter(c => !idsToDelete.has(c.fromNodeId) && !idsToDelete.has(c.toNodeId))
                    }));
                    setSelectedItems(null);
                    break;
                case 'scene':
                    handleDeleteScene(selectedItems.ids[0]);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedItems, setActiveScene, handleDeleteScene]);

    const handleGameObjectUpdate = useCallback((updatedObject: GameObject) => {
        setActiveScene(scene => ({
            ...scene,
            gameObjects: scene.gameObjects.map(go => go.id === updatedObject.id ? updatedObject : go)
        }));
    }, [setActiveScene]);

    const handleNodeUpdate = useCallback((updatedNode: GraphNode) => {
        setActiveScene(scene => ({
            ...scene,
            nodes: scene.nodes.map(n => n.id === updatedNode.id ? updatedNode : n)
        }));
    }, [setActiveScene]);
    
    const handleSelectionChange = useCallback((selection: SelectedItems, options?: { addToSelection: boolean }) => {
        if (!options?.addToSelection) {
            setSelectedItems(selection);
            return;
        }
        setSelectedItems(prev => {
            if (!prev || !selection || prev.type !== selection.type) return selection;
            const newIds = [...new Set([...prev.ids, ...selection.ids])];
            return { type: prev.type, ids: newIds };
        });
    }, []);

    const handleCreateSprite = useCallback((asset: Asset, position: Vector2) => {
        const newSprite = createNewGameObject('sprite', position, activeScene.gameObjects.map(go => go.name), activeScene.activeLayerName);
        newSprite.name = asset.name.replace(/\..*$/, '');
        const spriteRenderer = newSprite.behaviors.find(b => b.type === 'spriteRenderer');
        if (spriteRenderer) spriteRenderer.properties.assetId = asset.id;
        setActiveScene(scene => ({ ...scene, gameObjects: [...scene.gameObjects, newSprite] }));
        const selection: SelectedItems = { type: 'gameobject', ids: [newSprite.id] };
        setSelectedItems(selection);
    }, [activeScene.gameObjects, activeScene.activeLayerName, setActiveScene]);

    const handleAddGameObject = useCallback((type: GameObjectType) => {
        const newObject = createNewGameObject(type, { x: 0, y: 0 }, activeScene.gameObjects.map(go => go.name), activeScene.activeLayerName);
        let newAssetsState = assets;
        if (type === 'player' || type === 'enemy') {
            const objectFolder: Asset = { id: `asset-${Date.now()}`, name: newObject.name, type: AssetType.Folder, path: `/Sprites/${newObject.name}`, children: [] };
            const idleFolder: Asset = { id: `asset-${Date.now()}-idle`, name: 'Idle', type: AssetType.Folder, path: `/Sprites/${newObject.name}/Idle`, children: [] };
            const runFolder: Asset = { id: `asset-${Date.now()}-run`, name: 'Run', type: AssetType.Folder, path: `/Sprites/${newObject.name}/Run`, children: [] };
            const jumpFolder: Asset = { id: `asset-${Date.now()}-jump`, name: 'Jump', type: AssetType.Folder, path: `/Sprites/${newObject.name}/Jump`, children: [] };
            objectFolder.children!.push(idleFolder, runFolder, jumpFolder);
            newAssetsState = addAssetToTree(newAssetsState, objectFolder, '/Sprites');
        }
        setAssets(newAssetsState);
        setActiveScene(scene => ({ ...scene, gameObjects: [...scene.gameObjects, newObject] }));
        setIsShowingAddObjectModal(false);
        const selection: SelectedItems = { type: 'gameobject', ids: [newObject.id] };
        setSelectedItems(selection);
    }, [assets, activeScene.gameObjects, activeScene.activeLayerName, setActiveScene]);

    const handleAddGameObject3D = useCallback((entityType: EntityType3D, gridPosition: Vector2, zIndex: number = 0) => {
        const newId = `go-${Date.now()}`;
        let baseName = entityType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        let name = baseName;
        let counter = 1;
        while(activeScene.gameObjects.some(go => go.name === name)) {
            name = `${baseName} ${counter++}`;
        }
        const newObject: GameObject = {
            id: newId,
            name,
            type: 'empty', // 3D objects don't use the 2D types
            layer: activeScene.activeLayerName,
            behaviors: [],
            entityType3D: entityType,
            gridPosition,
            zIndex,
            hitboxColor: generateHslColor(newId),
            isActive: true,
        };

        if (entityType === 'player_start') {
          newObject.player3dConfig = {
            cameraType: 'first_person',
            mouseLook: true,
            speed: 100,
            size: { x: 20, y: 40, z: 20 },
            position: { x: gridPosition.x * 32, y: zIndex * 32 + 20, z: gridPosition.y * 32 },
            rotation: { x: 0, y: 0, z: 0 },
          };
        }

        setActiveScene(scene => ({ ...scene, gameObjects: [...scene.gameObjects, newObject] }));
        setIsShowingAddObjectModal3D(false);
        const selection: SelectedItems = { type: 'gameobject', ids: [newObject.id] };
        setSelectedItems(selection);
    }, [activeScene.gameObjects, activeScene.activeLayerName, setActiveScene]);


    const handleSaveAnimations = useCallback((gameObjectId: string, animations: AnimationClip[]) => {
        const targetGameObject = activeScene.gameObjects.find(go => go.id === gameObjectId);
        if (!targetGameObject) return;

        let currentAssets = assets;
        // First, ensure all required animation folders exist in the asset tree.
        animations.forEach(clip => {
            // Only process clips that have new, unsaved frames to avoid creating empty folders needlessly.
            if (clip.frames.some(f => f.spriteSrc && !f.spriteAssetId)) {
                const parentPath = `/Sprites/${targetGameObject.name}/${clip.name}`;
                const pathParts = parentPath.split('/').filter(p => p);
                
                const root = currentAssets[0];
                const newChildren = ensurePath(root.children || [], pathParts, '');
                currentAssets = [{...root, children: newChildren}];
            }
        });

        const newAnimations = animations.map(clip => {
            const newFrames = clip.frames.map((frame, index) => {
                if (frame.spriteSrc && !frame.spriteAssetId) {
                    const parentPath = `/Sprites/${targetGameObject.name}/${clip.name}`;
                    const newAssetName = `frame_${Date.now()}_${index}.png`;
                    const newAsset: Asset = { id: `asset-${Date.now()}-${index}`, name: newAssetName, type: AssetType.Image, path: `${parentPath}/${newAssetName}`, data: frame.spriteSrc };
                    currentAssets = addAssetToTree(currentAssets, newAsset, parentPath); // Path is now guaranteed to exist
                    return { ...frame, spriteAssetId: newAsset.id, spriteSrc: undefined };
                }
                return frame;
            });
            return { ...clip, frames: newFrames };
        });

        setAssets(currentAssets);
        setActiveScene(scene => ({ ...scene, gameObjects: scene.gameObjects.map(go => go.id === gameObjectId ? { ...go, animations: newAnimations } : go) }));
        setEditingAnimationsFor(null);
    }, [assets, activeScene.gameObjects, setActiveScene]);
    
    const onTextureAssigned = useCallback((gameObjectId: string, face: string, fileData: string, fileName: string) => {
        const newAsset: Asset = {
            id: `asset-tex-${Date.now()}`,
            name: fileName,
            type: AssetType.Image,
            path: `/Textures/${fileName}`,
            data: fileData,
        };
        setAssets(prev => addAssetToTree(prev, newAsset, '/Textures'));
        setActiveScene(scene => ({
            ...scene,
            gameObjects: scene.gameObjects.map(go => {
                if (go.id === gameObjectId) {
                    const newGo = { ...go, textures: { ...go.textures, [face]: newAsset.id } };
                    return newGo;
                }
                return go;
            })
        }));
    }, [setActiveScene]);

    const handleAssetCreateForGameObject = useCallback((gameObjectId: string, behaviorType: string, propertyName: string, fileData: string, fileName: string) => {
        const go = activeScene.gameObjects.find(g => g.id === gameObjectId);
        if (!go) return;

        let assetType: AssetType;
        let parentPath: string;

        if (behaviorType === 'textRenderer' && propertyName === 'customFontAssetId') {
            assetType = AssetType.Font;
            parentPath = '/Fonts';
        } else { // Default to image for spriteRenderer etc.
            assetType = AssetType.Image;
            parentPath = '/Sprites'; // A sensible default folder
        }
        
        const newAsset: Asset = { id: `asset-${Date.now()}`, name: fileName, type: assetType, path: `${parentPath}/${fileName}`, data: fileData };
        
        const newAssetsState = addAssetToTree(assets, newAsset, parentPath);
        setAssets(newAssetsState);

        setActiveScene(scene => ({ ...scene, gameObjects: scene.gameObjects.map(g => {
            if (g.id === gameObjectId) {
                const newBehaviors = g.behaviors.map(b => {
                    if (b.type === behaviorType) {
                        if (assetType === AssetType.Font) {
                            return { 
                                ...b, 
                                properties: { 
                                    ...b.properties, 
                                    customFontAssetId: newAsset.id,
                                    font: newAsset.name,
                                } 
                            };
                        }
                        return { ...b, properties: { ...b.properties, [propertyName]: newAsset.id } };
                    }
                    return b;
                });
                return { ...g, behaviors: newBehaviors };
            }
            return g;
        })}));
    }, [assets, activeScene.gameObjects, setActiveScene]);

    const handleAssetCreateForNode = useCallback((nodeId: string, propertyName: string, fileData: string, fileName: string) => {
        const node = activeScene.nodes.find(n => n.id === nodeId);
        if (!node) return;
        let assetType: AssetType, parentFolder: string;
        switch(node.type) {
            case 'playMusic': case 'sounds': assetType = AssetType.Audio; parentFolder = '/Audio'; break;
            case 'playVideo': assetType = AssetType.Video; parentFolder = '/Video'; break;
            default: addLog(`Error: Asset creation is not supported for ${node.name} nodes.`); return;
        }
        const newAsset: Asset = { id: `asset-${Date.now()}`, name: fileName, type: assetType, path: `${parentFolder}/${fileName}`, data: fileData };
        setAssets(addAssetToTree(assets, newAsset, parentFolder));
        handleNodeUpdate({ ...node, properties: { ...node.properties, [propertyName]: newAsset.id } });
        addLog(`Created new asset: ${fileName}`);
    }, [assets, activeScene.nodes, handleNodeUpdate, addLog]);
    
    const handleAddConnection = useCallback((connection: Omit<Connection, 'id'>) => {
        setActiveScene(scene => ({ ...scene, connections: [...scene.connections, { ...connection, id: `conn-${Date.now()}` }] }));
    }, [setActiveScene]);

    const handleAddNode = useCallback((blueprint: NodeBlueprint, position: Vector2) => {
        const newNode: GraphNode = { id: `node-${Date.now()}`, type: blueprint.type, name: blueprint.name, position, inputs: JSON.parse(JSON.stringify(blueprint.inputs)), outputs: JSON.parse(JSON.stringify(blueprint.outputs)), properties: JSON.parse(JSON.stringify(blueprint.properties)) };
        setActiveScene(scene => ({ ...scene, nodes: [...scene.nodes, newNode] }));
    }, [setActiveScene]);

    const handleDeleteLayer = (layerName: string) => {
        if (layerName === 'Default') { alert("The 'Default' layer cannot be deleted."); return; }
        if (window.confirm(`Are you sure you want to delete the layer "${layerName}"? Objects on this layer will be moved to 'Default'.`)) {
            setActiveScene(scene => ({
                ...scene,
                gameObjects: scene.gameObjects.map(go => go.layer === layerName ? { ...go, layer: 'Default' } : go),
                activeLayerName: scene.activeLayerName === layerName ? 'Default' : scene.activeLayerName,
                layers: scene.layers.filter(l => l.name !== layerName),
            }));
        }
    };

    // --- Project Save/Load/Menu ---
    const handleNewProject = () => {
        if (window.confirm('Are you sure? All unsaved changes will be lost.')) {
            setProjectName('My BlitzBoom Game');
            setResolution(null);
            setStartFullscreen(false);
            setAssets(initialAssets);
            setScenes([ { id: 'scene-initial', name: 'Game Scene', type: '2d', gameObjects: [], layers: [{ name: 'Default', isVisible: true, isLocked: false }], activeLayerName: 'Default', nodes: [], connections: [] } ]);
            setActiveSceneId('scene-initial');
            setObjectGroups([]);
            setSelectedItems(null);
            setGameLogs(['Welcome to BlitzBoom!']);
            setAppState('resolution');
        }
    };

    const handleProjectSettings = () => setIsProjectSettingsOpen(true);

    const dataURIToBlob = (dataURI: string): Blob => {
        const splitDataURI = dataURI.split(','), byteString = splitDataURI[0].includes('base64') ? atob(splitDataURI[1]) : decodeURI(splitDataURI[1]), mimeString = splitDataURI[0].split(':')[1].split(';')[0];
        const ia = new Uint8Array(byteString.length); for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i); return new Blob([ia], { type: mimeString });
    };

    const handleSaveProject = async () => {
        addLog('Packaging project...');
        try {
            const zip = new JSZip();
            const assetsForSave = JSON.parse(JSON.stringify(assets));
            const allFileAssets: Asset[] = [];
            const collectFileAssets = (assetList: Asset[]) => { for (const asset of assetList) { if (asset.type !== 'folder' && asset.data) allFileAssets.push(asset); if (asset.children) collectFileAssets(asset.children); } };
            collectFileAssets(assetsForSave);
            for (const asset of allFileAssets) { if (asset.path && asset.data) { zip.file(`assets${asset.path}`, dataURIToBlob(asset.data)); delete asset.data; } }
            const projectData = { version: 2, projectName, resolution, startFullscreen, assets: assetsForSave, scenes, activeSceneId, objectGroups };
            zip.file('project.blitzboom.json', JSON.stringify(projectData, null, 2));
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(zipBlob); link.download = `${projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
            addLog('Project saved successfully.');
        } catch (err: any) { addLog(`Error saving project: ${err.message}`); }
    };

    const handleLoadProjectTrigger = () => projectLoadInputRef.current?.click();
    
    const handleLoadProjectFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return; addLog(`Loading project from '${file.name}'...`);
        try {
            const zip = await JSZip.loadAsync(file), projectFileArray = zip.file(/project\.blitzboom\.json$/);
            if (projectFileArray.length === 0) throw new Error('Could not find project.blitzboom.json in the zip file.');
            const projectData = JSON.parse(await projectFileArray[0].async('string'));
            if (!projectData.version || projectData.version < 2) {
                projectData.scenes = [{ id: 'scene-initial', name: 'Game Scene', type: '2d', gameObjects: projectData.gameObjects || [], layers: projectData.layers || [{ name: 'Default', isVisible: true, isLocked: false }], activeLayerName: projectData.activeLayerName || 'Default', nodes: projectData.nodes || [], connections: projectData.connections || [] }];
                projectData.activeSceneId = 'scene-initial';
                ['gameObjects', 'layers', 'activeLayerName', 'nodes', 'connections'].forEach(k => delete projectData[k]); addLog('Migrated legacy project to scene format.');
            }
            if (!projectData || !projectData.scenes) throw new Error('Invalid project file.');

            // Ensure all game objects have a hitbox color
            projectData.scenes.forEach((scene: Scene) => {
              scene.gameObjects.forEach(go => {
                if (!go.hitboxColor) {
                  go.hitboxColor = generateHslColor(go.id);
                }
              });
            });

            const assetPromises: Promise<void>[] = [];
            const processAssetsFromZip = (assetList: Asset[]) => { for (const asset of assetList) { if (asset.type === 'folder' && asset.children) processAssetsFromZip(asset.children); else if (asset.path && (asset.type === AssetType.Image || asset.type === AssetType.Audio || asset.type === AssetType.Video || asset.type === AssetType.Font)) { const assetFile = zip.file(`assets${asset.path}`); if (assetFile) assetPromises.push(assetFile.async('base64').then((base64: string) => { const ext = asset.name.split('.').pop()?.toLowerCase() || '', mime = {'png':'image/png','jpg':'image/jpeg','jpeg':'image/jpeg','mp3':'audio/mpeg','wav':'audio/wav','ogg':'audio/ogg','mp4':'video/mp4','webm':'video/webm','ttf':'font/ttf','otf':'font/otf'}[ext]||'application/octet-stream'; asset.data = `data:${mime};base64,${base64}`; })); } } };
            if (projectData.assets[0]?.children) processAssetsFromZip(projectData.assets[0].children);
            await Promise.all(assetPromises);
            setProjectName(projectData.projectName || 'My BlitzBoom Game'); setResolution(projectData.resolution || { width: 1280, height: 720 }); setStartFullscreen(projectData.startFullscreen || false); setAssets(projectData.assets || initialAssets); setScenes(projectData.scenes || []); setActiveSceneId(projectData.activeSceneId || projectData.scenes[0]?.id); setObjectGroups(projectData.objectGroups || []); setSelectedItems(null); setAppState('editor'); addLog('Project loaded successfully.');
        } catch (err: any) { addLog(`Error loading project: ${err.message}`); } finally { if (e.target) e.target.value = ''; }
    };

    const handleExportProject = async (options: ExportOptions, onProgress: (update: { step: string, status: 'running' | 'success' | 'error', log?: string }) => void): Promise<ExportResult> => {
        const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms)); let currentStep = '';
        try {
            const zip = new JSZip(); currentStep = 'Prepare Project Data'; onProgress({ step: currentStep, status: 'running' });
            const assetsForExport = JSON.parse(JSON.stringify(assets)); const assetFilesToAdd: {path: string, blob: Blob}[] = [];
            function processAssets(assetList: Asset[]) { for(const asset of assetList) { if (asset.data && (asset.type === AssetType.Image || asset.type === AssetType.Audio || asset.type === AssetType.Video || asset.type === AssetType.Font)) { const relPath = `assets${asset.path}`; assetFilesToAdd.push({ path: relPath, blob: dataURIToBlob(asset.data) }); asset.path = relPath; delete asset.data; } if (asset.children) processAssets(asset.children); } }
            processAssets(assetsForExport);
            const projectData = { projectName, resolution, startFullscreen, assets: assetsForExport, scenes, initialSceneId: scenes[0]?.id || activeSceneId };
            onProgress({ step: currentStep, status: 'success', log: `[${currentStep}] OK - Project data serialized.` }); await sleep(200);
            currentStep = 'Package Assets'; onProgress({ step: currentStep, status: 'running' });
            for(const file of assetFilesToAdd) zip.file(file.path, file.blob);
            onProgress({ step: currentStep, status: 'success', log: `[${currentStep}] OK - ${assetFilesToAdd.length} assets packaged.` }); await sleep(300);
            currentStep = 'Add Game Engine'; onProgress({ step: currentStep, status: 'running' });
            zip.file('index.html', EXPORT_HTML_TEMPLATE.replace(/<!--PROJECT_NAME_PLACEHOLDER-->/g, projectName));
            zip.file('runtime.js', EXPORT_RUNTIME_JS.replace('const BLITZBOOM_DATA = {/*DATA_PLACEHOLDER*/};', `const BLITZBOOM_DATA = ${JSON.stringify(projectData)};`));
            onProgress({ step: currentStep, status: 'success', log: `[${currentStep}] OK - Core engine files added.` }); await sleep(100);
            currentStep = 'Generate ZIP'; onProgress({ step: currentStep, status: 'running' });
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            onProgress({ step: currentStep, status: 'success', log: `[${currentStep}] OK - Package complete.` });
            return { downloadUrl: URL.createObjectURL(zipBlob) };
        } catch (e: any) { if (currentStep) onProgress({ step: currentStep, status: 'error', log: `[${currentStep}] ERROR: ${e.message}` }); throw e; }
    };

    const evaluateInput = useCallback((nodeId: string, pinId: string, context: NodeExecutionContext): any => {
        const connection = context.connections.find(c => c.toNodeId === nodeId && c.toInputId === pinId); if (!connection) return undefined;
        const sourceNode = context.nodes.find(n => n.id === connection.fromNodeId);
        if (sourceNode) { const cacheKey = `${sourceNode.id}-${connection.fromOutputId}`; if (context.nodeOutputCache.has(cacheKey)) return context.nodeOutputCache.get(cacheKey); const logic = nodeLogic[sourceNode.type]; if (logic) { logic(sourceNode, context); return context.nodeOutputCache.get(cacheKey); } } return undefined;
    }, []);
    
    const triggerOutput = useCallback((nodeId: string, pinId: string, context: NodeExecutionContext) => {
        const connections = context.connections.filter(c => c.fromNodeId === nodeId && c.fromOutputId === pinId);
        for(const connection of connections) { const nextNode = context.nodes.find(n => n.id === connection.toNodeId); if (nextNode) { const logic = nodeLogic[nextNode.type]; if (logic) logic(nextNode, { ...context, triggeredPinId: connection.toInputId }); } }
    }, []);

    const handlePreview = () => {
        if (scenes[0]) {
            setPreviewingScene(scenes[0]);
            if (startFullscreen) {
                setPreviewFullscreen(true);
            }
        } else {
            addLog("Cannot start preview: No scenes exist.");
        }
    };
    const stopPreview = () => {
        previewAudioPlayersRef.current.forEach(p => { p.pause(); p.currentTime = 0; });
        previewAudioPlayersRef.current.clear();
        previewMusicChannelsRef.current.forEach(p => { p.pause(); p.currentTime = 0; });
        previewMusicChannelsRef.current.clear();
        setPreviewingScene(null);
        setPreviewFullscreen(false);
    };
    
    useEffect(() => {
        if (!previewingScene) return;
        setLiveSimObjects([]); setLiveVideoState(null); setLiveCameraState({ position: { x: 0, y: 0 }, zoom: 1 }); addLog(`Starting simulation for scene: ${previewingScene.name}`);
        let gameLoopId = 0, keyboardState: Record<string, boolean> = {}, audioPlayers = new Map<string, HTMLAudioElement>(), musicChannels = new Map<number, HTMLAudioElement>(), videoState: VideoState | null = null, cameraState: CameraState = { position: { x: 0, y: 0 }, zoom: 1 }, activeTimers = new Map<string, TimerState>(), activeCountdowns = new Map<string, CountdownState>(), triggeredOnceNodes = new Set<string>(), lastFrameTime = 0, isPaused = false;
        let simulatedObjects: SimulatedGameObject[] = JSON.parse(JSON.stringify(previewingScene.gameObjects)).map((go: GameObject) => { const t = go.behaviors.find(b => b.type === 'transform'), p = t ? { ...t.properties.position } : { x: 0, y: 0 }; return { ...go, position: p, velocity: { x: 0, y: 0 }, initialPosition: p, patrolTime: 0, prevPosition: p, currentAnimation: 'Idle', animationTime: 0, animationSpeed: 1, currentFrame: 0, isActive: go.isActive ?? true }; });
        const findAudioAssets = (assetList: Asset[]) => { for (const asset of assetList) { if (asset.type === AssetType.Audio && asset.data) audioPlayers.set(asset.id, new Audio(asset.data)); if (asset.children) findAudioAssets(asset.children); } };
        previewAudioPlayersRef.current = audioPlayers;
        previewMusicChannelsRef.current = musicChannels;
        findAudioAssets(assets);
        const spawnGameObject = (type: GameObjectType, position: Vector2): SimulatedGameObject => { const newObj = createNewGameObject(type, position, simulatedObjects.map(go => go.name), activeScene.activeLayerName); const simObj: SimulatedGameObject = { ...newObj, position, velocity: { x: 0, y: 0 }, initialPosition: position, patrolTime: 0, prevPosition: position, isGrounded: false, currentAnimation: null, animationTime: 0, animationSpeed: 1, currentFrame: 0, isActive: true }; simulatedObjects.push(simObj); return simObj; };
        const engine = { loadScene: (id: string) => { const s = scenes.find(s => s.id === id); if (s) { addLog(`Node triggered scene change to: ${s.name}`); setPreviewingScene(s); } else addLog(`Error: Scene with ID ${id} not found.`); }, pause: () => isPaused = true, resume: () => isPaused = false, togglePause: () => isPaused = !isPaused, spawnGameObject };
        const executeGraph = (type: 'onStart' | 'onUpdate', ctx: Omit<NodeExecutionContext, 'nodes'|'connections'>) => { const fullCtx = { ...ctx, nodes: previewingScene.nodes, connections: previewingScene.connections }; previewingScene.nodes.filter(n => n.type === type).forEach(node => triggerOutput(node.id, 'execOut', fullCtx)); };
        const currentLogs: string[] = []; const addLogProxy = (msg: string) => currentLogs.push(`[${new Date().toLocaleTimeString()}] ${msg}`); const setSimProxy = (a: React.SetStateAction<SimulatedGameObject[]>) => simulatedObjects = typeof a === 'function' ? a(simulatedObjects) : a; const setVidProxy = (a: React.SetStateAction<VideoState | null>) => videoState = typeof a === 'function' ? a(videoState) : a; const setCamProxy = (a: React.SetStateAction<CameraState>) => cameraState = typeof a === 'function' ? a(cameraState) : a;
        const baseContext: Omit<NodeExecutionContext, 'nodes'|'connections'|'deltaTime'|'nodeOutputCache'> = { engine, gameObjects: simulatedObjects, keyboardState, audioPlayers, musicChannels, videoState, cameraState, activeTimers, activeCountdowns, triggeredOnceNodes, setGameObjects: setSimProxy, setVideoState: setVidProxy, setCameraState: setCamProxy, addLog: addLogProxy, evaluateInput, triggerOutput, setPreviewFullscreen };
        executeGraph('onStart', { ...baseContext, deltaTime: 0, nodeOutputCache: new Map() });
        setLiveSimObjects([...simulatedObjects]); setLiveVideoState(videoState); setLiveCameraState(cameraState); if (currentLogs.length > 0) setGameLogs(prev => [...prev.slice(-100), ...currentLogs]); currentLogs.length = 0;
        const handleKeyDown = (e: KeyboardEvent) => keyboardState[e.key.toLowerCase()] = true; const handleKeyUp = (e: KeyboardEvent) => keyboardState[e.key.toLowerCase()] = false; document.addEventListener('keydown', handleKeyDown); document.addEventListener('keyup', handleKeyUp);
        const gameLoop = () => {
            if (isPaused) { gameLoopId = requestAnimationFrame(gameLoop); return; }
            const now = performance.now(); let dt = (now - lastFrameTime) / 1000; lastFrameTime = now; if (dt > 1 / 30) dt = 1 / 30;
            const timerCtx = { ...baseContext, deltaTime: 0, nodeOutputCache: new Map(), nodes: previewingScene.nodes, connections: previewingScene.connections }; const timersToRemove: string[] = [], timersToReset: { id: string, timer: TimerState }[] = [];
            for (const [id, timer] of activeTimers.entries()) { if (now >= timer.startTime + timer.duration * 1000) { const node = previewingScene.nodes.find(n => n.id === id); if (node) triggerOutput(node.id, 'onFinished', timerCtx); if (timer.loop) timersToReset.push({ id, timer: { ...timer, startTime: now } }); else timersToRemove.push(id); } }
            timersToRemove.forEach(id => activeTimers.delete(id)); timersToReset.forEach(({ id, timer }) => activeTimers.set(id, timer));
            
            if (clickedObjectIdRef.current) {
                const clickedId = clickedObjectIdRef.current;
                clickedObjectIdRef.current = null; // Consume the click
                const clickCtx = { ...baseContext, gameObjects: simulatedObjects, deltaTime: 0, nodeOutputCache: new Map(), nodes: previewingScene.nodes, connections: previewingScene.connections };
                previewingScene.nodes
                    .filter(n => n.type === 'onClickOrTouch' && (!n.properties.targetObjectId || n.properties.targetObjectId === clickedId))
                    .forEach(node => {
                        triggerOutput(node.id, 'execOut', clickCtx);
                    });
            }

            const finishedCountdowns: string[] = [];
            if (activeCountdowns.size > 0) {
                activeCountdowns.forEach((countdown, nodeId) => {
                    if (countdown.isFinished) return;
                    const remainingMs = Math.max(0, countdown.endTime - now);
                    const formattedTime = formatTime(remainingMs / 1000);
                    simulatedObjects = simulatedObjects.map(go => {
                        if (go.id === countdown.targetId) {
                            const textRenderer = go.behaviors.find(b => b.type === 'textRenderer') as TextRendererBehavior | undefined;
                            if (textRenderer && textRenderer.properties.text !== formattedTime) {
                                const newGo: SimulatedGameObject = JSON.parse(JSON.stringify(go));
                                const newTextRenderer = newGo.behaviors.find(b => b.type === 'textRenderer') as TextRendererBehavior | undefined;
                                if(newTextRenderer) newTextRenderer.properties.text = formattedTime;
                                return newGo;
                            }
                        }
                        return go;
                    });
                    if (remainingMs === 0) {
                        countdown.isFinished = true;
                        finishedCountdowns.push(nodeId);
                    }
                });
            }
             if (finishedCountdowns.length > 0) {
                const finishCtx = { ...baseContext, gameObjects: simulatedObjects, deltaTime: 0, nodeOutputCache: new Map(), nodes: previewingScene.nodes, connections: previewingScene.connections };
                finishedCountdowns.forEach(nodeId => {
                    const node = previewingScene.nodes.find(n => n.id === nodeId);
                    if (node) triggerOutput(node.id, 'onFinished', finishCtx);
                    activeCountdowns.delete(nodeId);
                });
            }

            simulatedObjects = simulatedObjects.map(go => { if (go.animations?.length > 0 && go.currentAnimation) { const clip = go.animations.find(a => a.name === go.currentAnimation); if (clip?.frames.length > 0) { const dur = 1 / (clip.fps || 10); let time = (go.animationTime || 0) + (dt * (go.animationSpeed || 1)); let frame = Math.floor(time / dur); if (clip.loop) frame %= clip.frames.length; else frame = Math.min(frame, clip.frames.length - 1); return { ...go, animationTime: time, currentFrame: frame }; } } return go; });
            
            simulatedObjects = simulatedObjects.map(go => {
                if (go.aiControllerNodeId && (go.isActive ?? true)) {
                    const aiNode = previewingScene.nodes.find(n => n.id === go.aiControllerNodeId);
                    if (aiNode) {
                        const aiContext = { ...baseContext, gameObjects: simulatedObjects, deltaTime: dt, nodes: previewingScene.nodes, connections: previewingScene.connections, nodeOutputCache: new Map() };
                        return updateEnemyAI(go, aiNode, aiContext);
                    }
                }
                return go;
            });

            simulatedObjects = simulatedObjects.map(go => {
                if (!(go.isActive ?? true)) return go;
                if (go.type !== 'platform' || !go.initialPosition) return go.type === 'platform' ? { ...go, velocity: { x: 0, y: 0 } } : go;
                const ctrl = go.behaviors.find(b => b.type === 'platformController')?.properties;
                if (!ctrl || ctrl.moveDirection === 'None' || ctrl.moveSpeed <= 0) return { ...go, velocity: { x: 0, y: 0 } };
                const prevPos = { ...go.position },
                    newGo = { ...go, position: { ...go.position }, patrolTime: (go.patrolTime || 0) + dt },
                    { moveSpeed: s, moveDistance: d, moveDirection: dir } = ctrl,
                    dur = s > 0 ? d / s : 0;
                if (dur > 0) {
                    const offset = Math.sin((newGo.patrolTime / dur) * Math.PI) * (d / 2);
                    if (dir === 'Horizontal') {
                        newGo.position.x = go.initialPosition.x + offset;
                    } else if (dir === 'Vertical') {
                        newGo.position.y = go.initialPosition.y + offset;
                    }
                }
                newGo.velocity = { x: (newGo.position.x - prevPos.x) / dt, y: (newGo.position.y - prevPos.y) / dt };
                return newGo;
            });
            executeGraph('onUpdate', { ...baseContext, gameObjects: simulatedObjects, deltaTime: dt, nodeOutputCache: new Map() });
            const collidableObjects = simulatedObjects.filter(go => go.useCustomHitboxes && (go.isActive ?? true));
            for (let i = 0; i < collidableObjects.length; i++) {
                for (let j = i + 1; j < collidableObjects.length; j++) {
                    const objA = collidableObjects[i], objB = collidableObjects[j], hitboxesA = getActiveHitboxesForSim(objA), hitboxesB = getActiveHitboxesForSim(objB); let collisionFound = false;
                    for (const boxA of hitboxesA) {
                        for (const boxB of hitboxesB) {
                            if (aabbCollision(boxA, boxB)) {
                                const collisionCtx = { ...baseContext, deltaTime: 0, nodeOutputCache: new Map(), nodes: previewingScene.nodes, connections: previewingScene.connections };
                                previewingScene.nodes.filter(n => n.type === 'onCollision').forEach(node => { collisionCtx.nodeOutputCache.set(`${node.id}-objectA`, objA.id); collisionCtx.nodeOutputCache.set(`${node.id}-objectB`, objB.id); triggerOutput(node.id, 'execOut', collisionCtx); });
                                collisionFound = true; break;
                            }
                        } if (collisionFound) break;
                    }
                }
            }
            setLiveSimObjects([...simulatedObjects]); setLiveVideoState(videoState); setLiveCameraState(cameraState); if (currentLogs.length > 0) setGameLogs(prev => [...prev.slice(-100), ...currentLogs]); currentLogs.length = 0; gameLoopId = requestAnimationFrame(gameLoop);
        };
        lastFrameTime = performance.now(); gameLoopId = requestAnimationFrame(gameLoop);
        return () => { cancelAnimationFrame(gameLoopId); document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('keyup', handleKeyUp); };
    }, [previewingScene, assets, scenes, activeScene.activeLayerName, addLog, evaluateInput, triggerOutput]);

    if (appState === 'intro') {
        return <IntroScene onComplete={() => setAppState('resolution')} />;
    }

    if (appState === 'resolution' || !resolution) {
        return <ResolutionModal onConfirm={(res, name, type, startFs) => {
            setResolution(res);
            setProjectName(name);
            setStartFullscreen(startFs);
            if (type !== activeScene.type) {
                setScenes(s => s.map(scene => scene.id === activeSceneId ? { ...scene, type } : scene));
            }
            setAppState('editor');
        }} />;
    }

    const currentSceneType = activeScene?.type || '2d';

    return (
        <div className="bg-gray-800 text-gray-200 flex flex-col h-screen w-screen overflow-hidden font-sans">
            <Header
                activeView={activeView}
                onPreview={handlePreview}
                onViewChange={setActiveView}
                onShowManual={() => setIsShowingManual(true)}
                onNewProject={handleNewProject}
                onProjectSettings={handleProjectSettings}
                onSaveProject={handleSaveProject}
                onLoadProject={handleLoadProjectTrigger}
                onExportProject={() => setIsExportModalOpen(true)}
                is3DScene={currentSceneType === '3d'}
                showHitboxes={showHitboxes}
                onToggleHitboxes={() => setShowHitboxes(!showHitboxes)}
            />
             <input type="file" ref={projectLoadInputRef} onChange={handleLoadProjectFile} accept=".zip" className="hidden" />

            <main className="flex-grow flex p-3 space-x-3 overflow-hidden">
                {/* Left Column */}
                <div className="w-64 flex-shrink-0 flex flex-col space-y-3">
                    <div className="h-1/2">
                        <ObjectsPanel
                            scenes={scenes}
                            activeSceneId={activeSceneId}
                            gameObjects={activeScene.gameObjects}
                            selectedItems={selectedItems}
                            onSelect={handleSelectionChange}
                            onAddGameObject={() => currentSceneType === '2d' ? setIsShowingAddObjectModal(true) : setIsShowingAddObjectModal3D(true)}
                            onNewScene={handleNewScene}
                            onSelectScene={handleSelectScene}
                            onDeleteScene={handleDeleteScene}
                            onRenameScene={handleRenameScene}
                            onReorderScenes={handleReorderScenes}
                        />
                    </div>
                    <div className="h-1/2">
                        <AssetsPanel assets={assets} />
                    </div>
                </div>

                {/* Center Column */}
                <div className="flex-grow flex flex-col space-y-3">
                    <div className="flex-grow">
                        {activeView === 'Game Scene' ? (
                           currentSceneType === '2d' ? (
                                <SceneView
                                    onCreateSprite={handleCreateSprite}
                                    gameObjects={activeScene.gameObjects}
                                    layers={activeScene.layers}
                                    assets={assets}
                                    selectedItems={selectedItems}
                                    onSelectionChange={handleSelectionChange}
                                    onGameObjectUpdate={handleGameObjectUpdate}
                                    resolution={resolution}
                                    showHitboxes={showHitboxes}
                                />
                            ) : (
                                <SceneView3D
                                    gameObjects={activeScene.gameObjects}
                                    layers={activeScene.layers}
                                    activeScene={activeScene}
                                    selectedItems={selectedItems}
                                    onSelectionChange={handleSelectionChange}
                                    onGameObjectUpdate={handleGameObjectUpdate}
                                    onAddGameObject={handleAddGameObject3D}
                                    onDeleteGameObject={(id) => {
                                        setActiveScene(s => ({...s, gameObjects: s.gameObjects.filter(go => go.id !== id)}))
                                    }}
                                />
                            )
                        ) : (
                            <NodeEditorPanel
                                nodes={activeScene.nodes}
                                connections={activeScene.connections}
                                selectedItem={selectedItems}
                                onSelect={handleSelectionChange}
                                onNodesChange={(nodes) => setActiveScene(s => ({...s, nodes}))}
                                onAddConnection={handleAddConnection}
                                onAddNode={handleAddNode}
                            />
                        )}
                    </div>
                    <div className="h-48 flex-shrink-0">
                       <GameLogPanel logs={gameLogs} />
                    </div>
                </div>

                {/* Right Column */}
                <div className="w-80 flex-shrink-0 flex flex-col space-y-3">
                    <div className="h-2/3">
                        <PropertiesPanel
                            selectedItems={selectedItems}
                            scenes={scenes}
                            gameObjects={activeScene.gameObjects}
                            nodes={activeScene.nodes}
                            onGameObjectUpdate={handleGameObjectUpdate}
                            onNodeUpdate={handleNodeUpdate}
                            onRenameScene={handleRenameScene}
                            onEditAnimations={setEditingAnimationsFor}
                            parsedScripts={parsedScripts}
                            assets={assets}
                            onAssetCreateForGameObject={handleAssetCreateForGameObject}
                            onAssetCreateForNode={handleAssetCreateForNode}
                            onTextureAssigned={onTextureAssigned}
                        />
                    </div>
                    <div className="h-1/3">
                        <LayersPanel
                            layers={activeScene.layers}
                            activeLayerName={activeScene.activeLayerName}
                            onLayersChange={(layers) => setActiveScene(s => ({...s, layers}))}
                            onSetActiveLayer={(name) => setActiveScene(s => ({...s, activeLayerName: name}))}
                            onDeleteLayer={handleDeleteLayer}
                        />
                    </div>
                </div>
            </main>

            {isShowingAddObjectModal && <AddObjectModal onClose={() => setIsShowingAddObjectModal(false)} onSelectObjectType={handleAddGameObject} />}
            {isShowingAddObjectModal3D && <AddObjectModal3D onClose={() => setIsShowingAddObjectModal3D(false)} onSelectEntityType={handleAddGameObject3D} />}
            {editingAnimationsFor && <AnimationPanel gameObject={editingAnimationsFor} onClose={() => setEditingAnimationsFor(null)} onSave={handleSaveAnimations} assets={assets}/>}
            {previewingScene && <GamePreviewWindow scene={previewingScene} assets={assets} onClose={stopPreview} resolution={resolution} simulatedObjects={liveSimObjects} cameraState={liveCameraState} isFullscreen={isPreviewFullscreen} showHitboxes={showHitboxes} onObjectClicked={(id) => { clickedObjectIdRef.current = id; }} />}
            <AIAssistant />
            {isProjectSettingsOpen && <ResolutionModal isEditing onClose={() => setIsProjectSettingsOpen(false)} initialName={projectName} initialResolution={resolution} initialStartFullscreen={startFullscreen} onConfirm={(res, name, type, startFs) => { setResolution(res); setProjectName(name); setStartFullscreen(startFs); setIsProjectSettingsOpen(false); }} />}
            {isShowingManual && <ManualModal onClose={() => setIsShowingManual(false)} />}
            {isExportModalOpen && <ExportModal onClose={() => setIsExportModalOpen(false)} onExport={handleExportProject} />}
        </div>
    );
};

export default App;
