// Fix: Re-organize nodes into categories for a structured library menu.
import { PinDef } from './types';

export interface NodeBlueprint {
  type: string;
  name: string;
  category: string;
  icon: string;
  inputs: PinDef[];
  outputs: PinDef[];
  properties: Record<string, any>;
}

export const nodeBlueprints: NodeBlueprint[] = [
    // Events
    { type: 'onStart', name: 'Event: At Start', category: 'Events', icon: 'events', inputs: [], outputs: [{ id: 'execOut', name: '', type: 'exec' }], properties: {} },
    { type: 'onUpdate', name: 'Event: On Update', category: 'Events', icon: 'events', inputs: [], outputs: [{ id: 'execOut', name: '', type: 'exec' }], properties: {} },
    { 
        type: 'onCollision', 
        name: 'Event: On Collision', 
        category: 'Events', 
        icon: 'events', 
        inputs: [], 
        outputs: [
            { id: 'execOut', name: '', type: 'exec' },
            { id: 'objectA', name: 'Object A', type: 'gameObject' },
            { id: 'objectB', name: 'Object B', type: 'gameObject' },
        ], 
        properties: {}
    },
    { 
        type: 'onClickOrTouch', 
        name: 'Event: On Click/Touch', 
        category: 'Events', 
        icon: 'input',
        inputs: [], 
        outputs: [
            { id: 'execOut', name: '', type: 'exec' },
        ], 
        properties: { targetObjectId: null }
    },
    
    // Scene
    {
        type: 'changeScene',
        name: 'Change Scene',
        category: 'Scene',
        icon: 'scene',
        inputs: [{ id: 'execIn', name: '', type: 'exec' }],
        outputs: [],
        properties: { sceneId: '' }
    },
    {
        type: 'pauseScene',
        name: 'Pause Scene',
        category: 'Scene',
        icon: 'scene',
        inputs: [{ id: 'execIn', name: '', type: 'exec' }],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: { action: 'Toggle' }
    },
    {
        type: 'fullScreen',
        name: 'Full Screen',
        category: 'Scene',
        icon: 'scene',
        inputs: [{ id: 'execIn', name: '', type: 'exec' }],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: { action: 'Toggle' }
    },
    {
        type: 'camera',
        name: 'Camera Controller',
        category: 'Scene',
        icon: 'camera',
        inputs: [{ id: 'execIn', name: '', type: 'exec' }, { id: 'target', name: 'Target', type: 'gameObject' }],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {
            cameraType: '2D Follow',
            targetName: 'Player',
            sensitivity: 0.1,
            zoom: 1,
            offset: { x: 0, y: 0 },
            bounds: { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 }
        }
    },

    // Game Object
    { type: 'getGameObject', name: 'Get Object By Name', category: 'Game Object', icon: 'gameObject', inputs: [], outputs: [{ id: 'objectOut', name: 'Object', type: 'gameObject' }], properties: { objectName: 'Player' } },
    { type: 'getProperty', name: 'Get Property', category: 'Game Object', icon: 'gameObject', inputs: [{ id: 'target', name: 'Target', type: 'gameObject' }], outputs: [{ id: 'value', name: 'Value', type: 'any' }], properties: { propertyName: 'health' } },
    { type: 'setProperty', name: 'Set Property', category: 'Game Object', icon: 'gameObject', inputs: [{ id: 'execIn', name: '', type: 'exec' }, { id: 'target', name: 'Target', type: 'gameObject' }, { id: 'value', name: 'Value', type: 'any' }], outputs: [{ id: 'execOut', name: '', type: 'exec' }], properties: { propertyName: 'health' } },
    { type: 'moveObject', name: 'Move Object', category: 'Game Object', icon: 'gameObject', inputs: [{ id: 'execIn', name: '', type: 'exec' }, { id: 'target', name: 'Target', type: 'gameObject' }], outputs: [{ id: 'execOut', name: '', type: 'exec' }], properties: { direction: 'X', speed: 100 } },
    {
        type: 'setPosition',
        name: 'Set Position',
        category: 'Game Object',
        icon: 'gameObject',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'target', name: 'Target', type: 'gameObject' },
            { id: 'position', name: 'Position', type: 'vector2' },
            { id: 'objectToFollow', name: 'Object To Follow', type: 'gameObject' },
        ],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {
            position: { x: 0, y: 0 },
            targetObjectName: '',
            offset: { x: 0, y: 0 },
        }
    },
    {
        type: 'activateObject',
        name: 'Activate Object',
        category: 'Game Object',
        icon: 'zap',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'target', name: 'Target', type: 'gameObject' },
        ],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {
            action: 'Activate'
        }
    },
    {
        type: 'changeAnimation',
        name: 'Change Animation',
        category: 'Game Object',
        icon: 'gameObject',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'target', name: 'Target', type: 'gameObject' }
        ],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {
            animationName: 'Idle',
            animationSpeed: 1,
            restartIfPlaying: false,
        }
    },
    {
        type: 'getPosition',
        name: 'Get Position',
        category: 'Game Object',
        icon: 'gameObject',
        inputs: [{ id: 'target', name: 'Target', type: 'gameObject' }],
        outputs: [{ id: 'position', name: 'Position', type: 'vector2' }],
        properties: {}
    },
    {
        type: 'setVelocity',
        name: 'Set Velocity',
        category: 'Game Object',
        icon: 'gameObject',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'target', name: 'Target', type: 'gameObject' },
            { id: 'velocity', name: 'Velocity', type: 'vector2' },
        ],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {}
    },
    {
        type: 'spawnObject',
        name: 'Spawn Object',
        category: 'Game Object',
        icon: 'gameObject',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'objectType', name: 'Type Name', type: 'string' },
            { id: 'position', name: 'Position', type: 'vector2' },
        ],
        outputs: [
            { id: 'execOut', name: '', type: 'exec' },
            { id: 'spawnedObject', name: 'Spawned Object', type: 'gameObject' },
        ],
        properties: { objectType: 'bullet' }
    },
    {
        type: 'destroyObject',
        name: 'Destroy Object',
        category: 'Game Object',
        icon: 'gameObject',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'target', name: 'Target', type: 'gameObject' }
        ],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {}
    },
    
    // 3D
    {
      type: 'playerController3D',
      name: '3D Player Controller',
      category: '3D',
      icon: 'player3d',
      inputs: [
          { id: 'execIn', name: '', type: 'exec' },
          { id: 'target', name: 'Target', type: 'gameObject' },
          { id: 'movement', name: 'Movement', type: 'vector2' }, // x for strafe, y for forward
      ],
      outputs: [{ id: 'execOut', name: '', type: 'exec' }],
      properties: { gravity: 9.8 }
    },
    {
        type: 'raycast3D',
        name: 'Raycast 3D',
        category: '3D',
        icon: 'action',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'origin', name: 'Origin', type: 'vector3' },
            { id: 'direction', name: 'Direction', type: 'vector3' },
        ],
        outputs: [
            { id: 'onHit', name: 'On Hit', type: 'exec' },
            { id: 'onMiss', name: 'On Miss', type: 'exec' },
            { id: 'hitObject', name: 'Hit Object', type: 'gameObject' },
            { id: 'hitPoint', name: 'Hit Point', type: 'vector3' },
        ],
        properties: { distance: 100 }
    },
    {
        type: 'getPosition3D',
        name: 'Get 3D Position',
        category: '3D',
        icon: 'gameObject',
        inputs: [{ id: 'target', name: 'Target', type: 'gameObject' }],
        outputs: [{ id: 'position', name: 'Position', type: 'vector3' }],
        properties: {}
    },
    {
        type: 'setPosition3D',
        name: 'Set 3D Position',
        category: '3D',
        icon: 'gameObject',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'target', name: 'Target', type: 'gameObject' },
            { id: 'position', name: 'Position', type: 'vector3' },
        ],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {}
    },
     {
        type: 'spawnObject3D',
        name: 'Spawn 3D Object',
        category: '3D',
        icon: 'gameObject',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'objectType', name: 'Type Name', type: 'string' },
            { id: 'position', name: 'Position', type: 'vector3' },
        ],
        outputs: [
            { id: 'execOut', name: '', type: 'exec' },
            { id: 'spawnedObject', name: 'Spawned Object', type: 'gameObject' },
        ],
        properties: { objectType: 'obstacle' }
    },

    // AI
    {
        type: 'enemyAIPlatformer',
        name: 'Enemy AI - Platformer',
        category: 'AI',
        icon: 'ai',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'target', name: 'Target', type: 'gameObject' },
            { id: 'player', name: 'Player', type: 'gameObject' },
        ],
        outputs: [
            { id: 'execOut', name: '', type: 'exec' },
            { id: 'onHit', name: 'On Hit', type: 'exec' },
            { id: 'damageDealt', name: 'Damage Dealt', type: 'number' },
            { id: 'hitTarget', name: 'Hit Target', type: 'gameObject' },
        ],
        properties: {
            difficulty: 5,
            healthPropertyName: 'health',
            speed: 150,
            jumpStrength: 600,
            gravity: 800,
            idleAnim: "Idle",
            walkAnim: "Walk",
            jumpAnim: "Jump",
            fallAnim: "Fall",
            blockAnim: "Block",
            hitAnim: "Hit",
            attack1Anim: "Attack1",
            attack1Range: 50,
            attack1Damage: 10,
            attack2Anim: "",
            attack2Range: 100,
            attack2Damage: 20,
            attack3Anim: "",
            attack3Range: 75,
            attack3Damage: 15,
        }
    },

    // Combat
    {
        type: 'activateHitbox',
        name: 'Activate Hitbox',
        category: 'Combat',
        icon: 'action',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'target', name: 'Target', type: 'gameObject' },
        ],
        outputs: [
            { id: 'onHit', name: 'On Hit', type: 'exec' },
            { id: 'onFinished', name: 'On Finished', type: 'exec' },
            { id: 'hitObject', name: 'Hit Object', type: 'gameObject' },
            { id: 'damage', name: 'Damage', type: 'number' },
            { id: 'knockback', name: 'Knockback', type: 'vector2' },
            { id: 'hitStun', name: 'Hit Stun (s)', type: 'number' },
        ],
        properties: {
            hitboxName: 'attack',
            duration: 0.2,
            damage: 10,
            knockback: { x: 100, y: -100 },
            hitStun: 0.3,
        }
    },
    {
        type: 'health',
        name: 'Modify Health',
        category: 'Combat',
        icon: 'health',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'target', name: 'Target', type: 'gameObject' },
            { id: 'amount', name: 'Amount', type: 'number' },
        ],
        outputs: [
            { id: 'execOut', name: '', type: 'exec' },
            { id: 'onDeath', name: 'On Death', type: 'exec' },
        ],
        properties: {
            action: 'Subtract',
            healthPropertyName: 'health',
            hitAnimationName: 'Hit',
            healAnimationName: 'Heal',
            deathAnimationName: 'Death',
        }
    },

    // Action Nodes
    {
        type: 'triggerOnce',
        name: 'Trigger Once',
        category: 'Action Nodes',
        icon: 'action',
        inputs: [{ id: 'execIn', name: '', type: 'exec' }],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {},
    },

    // Media
    {
        type: 'playMusic',
        name: 'Play Music',
        category: 'Media',
        icon: 'playMusic',
        inputs: [{ id: 'execIn', name: '', type: 'exec' }],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {
            action: 'Play',
            musicAssetId: null,
            loop: true,
            volume: 1.0,
            channel: 0,
        }
    },
    {
        type: 'musicChannel',
        name: 'Music Channel',
        category: 'Media',
        icon: 'speaker',
        inputs: [{ id: 'execIn', name: '', type: 'exec' }],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {
            action: 'Stop Music on Channel',
            channel: 0,
        }
    },
    {
        type: 'sounds',
        name: 'Play Sound',
        category: 'Media',
        icon: 'speaker',
        inputs: [{ id: 'execIn', name: '', type: 'exec' }],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {
            soundAssetId: null,
            volume: 1.0,
            speed: 1.0,
        }
    },
    {
        type: 'playVideo',
        name: 'Play Video',
        category: 'Media',
        icon: 'playVideo',
        inputs: [{ id: 'execIn', name: '', type: 'exec' }],
        outputs: [
          { id: 'onFinished', name: 'On Finished', type: 'exec' }
        ],
        properties: {
            action: 'Play',
            videoAssetId: null,
            loop: false,
            volume: 1.0,
        }
    },

    // Text
    {
        type: 'setText',
        name: 'Set Text',
        category: 'Text',
        icon: 'type',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'target', name: 'Target', type: 'gameObject' },
            { id: 'text', name: 'Text', type: 'string' },
        ],
        outputs: [{ id: 'execOut', name: '', type: 'exec' }],
        properties: {}
    },
    {
        type: 'getText',
        name: 'Get Text',
        category: 'Text',
        icon: 'type',
        inputs: [{ id: 'target', name: 'Target', type: 'gameObject' }],
        outputs: [{ id: 'text', name: 'Text', type: 'string' }],
        properties: {}
    },

    // Time
    {
        type: 'timer',
        name: 'Timer',
        category: 'Time',
        icon: 'time',
        inputs: [
            { id: 'start', name: 'Start', type: 'exec' },
            { id: 'stop', name: 'Stop', type: 'exec' },
        ],
        outputs: [
            { id: 'onFinished', name: 'On Finished', type: 'exec' },
        ],
        properties: {
            duration: 1.0,
            loop: false,
        }
    },
    {
        type: 'countdownClock',
        name: 'Countdown Clock',
        category: 'Time',
        icon: 'time',
        inputs: [
            { id: 'start', name: 'Start', type: 'exec' },
            { id: 'stop', name: 'Stop', type: 'exec' },
        ],
        outputs: [
            { id: 'onFinished', name: 'On Finished', type: 'exec' },
            { id: 'remainingSeconds', name: 'Remaining (s)', type: 'number' },
        ],
        properties: {
            duration: 60,
            targetObjectId: null,
        }
    },

    // Logic
    { type: 'branch', name: 'Branch (If)', category: 'Logic', icon: 'logic', inputs: [{ id: 'execIn', name: '', type: 'exec' }, { id: 'condition', name: 'Condition', type: 'boolean' }], outputs: [{ id: 'execOutTrue', name: 'True', type: 'exec' }, { id: 'execOutFalse', name: 'False', type: 'exec' }], properties: {} },
    { type: 'greaterThan', name: 'Greater Than', category: 'Logic', icon: 'logic', inputs: [{ id: 'a', name: 'A', type: 'number' }, { id: 'b', name: 'B', type: 'number' }], outputs: [{ id: 'result', name: '', type: 'boolean' }], properties: {} },
    { type: 'lessThan', name: 'Less Than', category: 'Logic', icon: 'logic', inputs: [{ id: 'a', name: 'A', type: 'number' }, { id: 'b', name: 'B', type: 'number' }], outputs: [{ id: 'result', name: '', type: 'boolean' }], properties: {} },
    { type: 'add', name: 'Add', category: 'Logic', icon: 'logic', inputs: [{ id: 'a', name: 'A', type: 'number' }, { id: 'b', name: 'B', type: 'number' }], outputs: [{ id: 'result', name: '', type: 'number' }], properties: {} },
    { type: 'subtract', name: 'Subtract', category: 'Logic', icon: 'logic', inputs: [{ id: 'a', name: 'A', type: 'number' }, { id: 'b', name: 'B', type: 'number' }], outputs: [{ id: 'result', name: '', type: 'number' }], properties: {} },
    { type: 'multiply', name: 'Multiply', category: 'Logic', icon: 'logic', inputs: [{ id: 'a', name: 'A', type: 'number' }, { id: 'b', name: 'B', type: 'number' }], outputs: [{ id: 'result', name: '', type: 'number' }], properties: {} },
    { type: 'divide', name: 'Divide', category: 'Logic', icon: 'logic', inputs: [{ id: 'a', name: 'A', type: 'number' }, { id: 'b', name: 'B', type: 'number' }], outputs: [{ id: 'result', name: '', type: 'number' }], properties: {} },
    {
        type: 'distanceCheck',
        name: 'Distance Check',
        category: 'Logic',
        icon: 'logic',
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
        ],
        outputs: [
            { id: 'isWithin', name: 'Is Within', type: 'exec' },
            { id: 'isNotWithin', name: 'Is Not Within', type: 'exec' },
            { id: 'distance', name: 'Distance', type: 'number' },
        ],
        properties: {
            objectAId: null,
            objectBId: null,
            distance: 100
        }
    },
    
    // Input
    { type: 'getKey', name: 'Get Key', category: 'Input', icon: 'input', inputs: [], outputs: [{ id: 'isDown', name: 'Is Down', type: 'boolean' }], properties: { key: 'space' } },
    { type: 'getAxis', name: 'Get Axis', category: 'Input', icon: 'input', inputs: [], outputs: [{ id: 'axis', name: 'Axis', type: 'number' }], properties: { negativeKey: 'a', positiveKey: 'd' } },
    { 
        type: 'keyboardPlatformerController', 
        name: 'Keyboard Platformer Controller', 
        category: 'Input',
        icon: 'input', 
        inputs: [
            { id: 'execIn', name: '', type: 'exec' },
            { id: 'target', name: 'Target', type: 'gameObject' },
        ], 
        outputs: [
            { id: 'execOut', name: '', type: 'exec' }
        ], 
        properties: {
            targetName: "Player",
            speed: 250,
            jumpStrength: 600,
            gravity: 800,
            leftKey: 'a',
            rightKey: 'd',
            jumpKey: 'space',
            idleAnim: "Idle",
            runAnim: "Run",
            jumpAnim: "Jump",
            fallAnim: "Fall",
            attack1Key: 'j',
            attack1Anim: 'Punch1',
            attack2Key: 'k',
            attack2Anim: '',
            attack3Key: 'l',
            attack3Anim: '',
            attack4Key: 'u',
            attack4Anim: '',
            attack5Key: 'i',
            attack5Anim: '',
            attack6Key: 'o',
            attack6Anim: '',
        } 
    },

    // Data
    { type: 'string', name: 'String', category: 'Data', icon: 'data', inputs: [], outputs: [{ id: 'value', name: '', type: 'string' }], properties: { value: 'Hello' } },
    { type: 'number', name: 'Number', category: 'Data', icon: 'data', inputs: [], outputs: [{ id: 'value', name: '', type: 'number' }], properties: { value: 100 } },
    { type: 'boolean', name: 'Boolean', category: 'Data', icon: 'data', inputs: [], outputs: [{ id: 'value', name: '', type: 'boolean' }], properties: { value: true } },
    { type: 'vector2', name: 'Vector2', category: 'Data', icon: 'data', inputs: [], outputs: [{ id: 'value', name: '', type: 'vector2' }], properties: { x: 0, y: 0 } },
    {
        type: 'addVector2',
        name: 'Add Vector2',
        category: 'Data',
        icon: 'data',
        inputs: [
            { id: 'a', name: 'A', type: 'vector2' },
            { id: 'b', name: 'B', type: 'vector2' }
        ],
        outputs: [{ id: 'result', name: '', type: 'vector2' }],
        properties: {}
    },
    {
        type: 'distance',
        name: 'Distance (Vector2)',
        category: 'Data',
        icon: 'data',
        inputs: [
            { id: 'a', name: 'A', type: 'vector2' },
            { id: 'b', name: 'B', type: 'vector2' }
        ],
        outputs: [{ id: 'distance', name: 'Distance', type: 'number' }],
        properties: {}
    },
    {
        type: 'toString',
        name: 'To String',
        category: 'Data',
        icon: 'data',
        inputs: [{ id: 'value', name: 'Value', type: 'any' }],
        outputs: [{ id: 'string', name: 'String', type: 'string' }],
        properties: {}
    },
    {
        type: 'concatenate',
        name: 'Concatenate Strings',
        category: 'Data',
        icon: 'data',
        inputs: [
            { id: 'a', name: 'A', type: 'string' },
            { id: 'b', name: 'B', type: 'string' }
        ],
        outputs: [{ id: 'result', name: '', type: 'string' }],
        properties: {}
    },

    // Debugging
    { type: 'logMessage', name: 'Log Message', category: 'Debugging', icon: 'debugging', inputs: [{ id: 'execIn', name: '', type: 'exec' }, { id: 'message', name: 'Message', type: 'any' }], outputs: [{ id: 'execOut', name: '', type: 'exec' }], properties: {} },
];

// Helper to get blueprints grouped by category
export const getNodeBlueprintsByCategory = () => {
    const categories: Record<string, NodeBlueprint[]> = {};
    for (const bp of nodeBlueprints) {
        if (!categories[bp.category]) {
            categories[bp.category] = [];
        }
        categories[bp.category].push(bp);
    }
    return categories;
};