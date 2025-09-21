import React from 'react';
import CloseIcon from './icons/CloseIcon';

// --- Diagram Components ---
interface DiagramNodeProps {
  title: string;
  inputs?: { name: string; type: 'exec' | 'data' | 'number' | 'boolean' | 'gameObject' | 'any' | 'string' | 'vector2' }[];
  outputs?: { name: string; type: 'exec' | 'data' | 'number' | 'boolean' | 'gameObject' | 'any' | 'string' | 'vector2' }[];
  position: { top: number; left: number };
  width?: number;
}

const pinColorClasses: Record<string, string> = {
  exec: 'bg-white',
  number: 'bg-cyan-400',
  boolean: 'bg-pink-500',
  string: 'bg-violet-400',
  gameObject: 'bg-yellow-400',
  vector2: 'bg-green-400',
  any: 'bg-gray-400',
  data: 'bg-gray-400', // fallback
};

const DiagramNode: React.FC<DiagramNodeProps> = ({ title, inputs = [], outputs = [], position, width = 192 }) => (
  <div
    className="absolute bg-gray-800 rounded-md shadow-lg border border-gray-700 text-xs"
    style={{ top: `${position.top}px`, left: `${position.left}px`, width: `${width}px` }}
  >
    <div className="bg-gray-900 p-2 rounded-t-md font-bold select-none">{title}</div>
    <div className="p-2 flex justify-between">
      {/* Inputs */}
      <div className="space-y-2">
        {inputs.map(input => (
          <div key={input.name} className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ring-2 ring-gray-900 ${pinColorClasses[input.type]}`}></div>
            <span className="select-none">{input.name}</span>
          </div>
        ))}
      </div>
      {/* Outputs */}
      <div className="space-y-2 text-right">
        {outputs.map(output => (
          <div key={output.name} className="flex items-center space-x-2 justify-end">
            <span className="select-none">{output.name}</span>
            <div className={`w-3 h-3 rounded-full ring-2 ring-gray-900 ${pinColorClasses[output.type]}`}></div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

interface DiagramConnectionProps {
    from: { x: number, y: number };
    to: { x: number, y: number };
    color: string;
}

const DiagramConnection: React.FC<DiagramConnectionProps> = ({ from, to, color }) => {
    const dx = Math.abs(from.x - to.x) * 0.6;
    const path = `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
    return <path d={path} stroke={color} strokeWidth="2" fill="none" />;
};

const PlayerControllerDiagram = () => (
    <div className="relative h-64 bg-gray-900/50 rounded-lg p-4 my-4 overflow-hidden border border-gray-700">
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            {/* Exec */}
            <DiagramConnection from={{ x: 192, y: 39 }} to={{ x: 300, y: 39 }} color="#FFFFFF" />
            {/* Data */}
            <DiagramConnection from={{ x: 192, y: 147 }} to={{ x: 300, y: 75 }} color="#facc15" />
        </svg>

        <DiagramNode 
            title="Event: On Update" 
            position={{ top: 20, left: 10 }}
            outputs={[{ name: '', type: 'exec' }]}
        />
        <DiagramNode 
            title="Get Object By Name (Player)" 
            position={{ top: 128, left: 10 }}
            outputs={[{ name: 'Object', type: 'gameObject' }]}
        />
        <DiagramNode 
            title="Keyboard Platformer Controller" 
            position={{ top: 20, left: 300 }}
            width={240}
            inputs={[
                { name: '', type: 'exec' },
                { name: 'Target', type: 'gameObject' },
            ]}
            outputs={[
                { name: '', type: 'exec' }
            ]}
        />
    </div>
);

const StatefulAnimationDiagram = () => (
    <div className="relative h-[600px] bg-gray-900/50 rounded-lg p-4 my-4 overflow-hidden border border-gray-700">
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            {/* EXEC FLOW */}
            <DiagramConnection from={{ x: 202, y: 70 }} to={{ x: 220, y: 184 }} color="#FFFFFF" />
            <DiagramConnection from={{ x: 412, y: 184 }} to={{ x: 430, y: 84 }} color="#FFFFFF" />
            <DiagramConnection from={{ x: 412, y: 212 }} to={{ x: 430, y: 294 }} color="#FFFFFF" />
            <DiagramConnection from={{ x: 622, y: 294 }} to={{ x: 640, y: 194 }} color="#FFFFFF" />
            <DiagramConnection from={{ x: 622, y: 322 }} to={{ x: 640, y: 394 }} color="#FFFFFF" />

            {/* DATA FLOW */}
            <DiagramConnection from={{ x: 202, y: 156 }} to={{ x: 220, y: 212 }} color="#ec4899" />
            <DiagramConnection from={{ x: 202, y: 294 }} to={{ x: 430, y: 322 }} color="#ec4899" />
            <DiagramConnection from={{ x: 202, y: 444 }} to={{ x: 430, y: 212 }} color="#ec4899" />

            {/* GameObject Data Flow (long paths) */}
            <path d="M 202 544 C 100 544, 300 120, 430 112" stroke="#facc15" strokeWidth="2" fill="none" />
            <path d="M 202 544 C 250 544, 500 230, 640 222" stroke="#facc15" strokeWidth="2" fill="none" />
            <path d="M 202 544 C 300 544, 550 430, 640 422" stroke="#facc15" strokeWidth="2" fill="none" />
            <path d="M 202 544 C 100 544, 150 190, 220 180" stroke="#facc15" strokeWidth="2" fill="none" />
        </svg>
        {/* Col 1 */}
        <DiagramNode title="Event: On Update" position={{top: 20, left: 10}} outputs={[{name: '', type: 'exec'}]} />
        <DiagramNode title="Get Property (isGrounded)" position={{top: 106, left: 10}} inputs={[{name: 'Target', type: 'gameObject'}]} outputs={[{name: 'Value', type: 'boolean'}]} />
        <DiagramNode title="Get Key (d)" position={{top: 244, left: 10}} outputs={[{name: 'Is Down', type: 'boolean'}]} />
        <DiagramNode title="Get Key (a)" position={{top: 394, left: 10}} outputs={[{name: 'Is Down', type: 'boolean'}]} />
        <DiagramNode title="Get Object By Name (Player)" position={{top: 500, left: 10}} outputs={[{name: 'Object', type: 'gameObject'}]} />
        
        {/* Col 2 */}
        <DiagramNode title="Branch (isGrounded?)" position={{top: 140, left: 220}} inputs={[{name: '', type: 'exec'}, {name: 'Condition', type: 'boolean'}]} outputs={[{name: 'True', type: 'exec'}, {name: 'False', type: 'exec'}]} />
        
        {/* Col 3 */}
        <DiagramNode title="Change Animation (Jump)" position={{top: 40, left: 430}} width={220} inputs={[{name: '', type: 'exec'}, {name: 'Target', type: 'gameObject'}]} />
        <DiagramNode title="Branch (is 'd' down?)" position={{top: 250, left: 430}} inputs={[{name: '', type: 'exec'}, {name: 'Condition', type: 'boolean'}]} outputs={[{name: 'True', type: 'exec'}, {name: 'False', type: 'exec'}]} />

        {/* Col 4 */}
        <DiagramNode title="Change Animation (Run)" position={{top: 150, left: 640}} width={220} inputs={[{name: '', type: 'exec'}, {name: 'Target', type: 'gameObject'}]} />
        <DiagramNode title="Change Animation (Idle)" position={{top: 350, left: 640}} width={220} inputs={[{name: '', type: 'exec'}, {name: 'Target', type: 'gameObject'}]} />
    </div>
);

const ShootingDiagram = () => (
    <div className="relative h-[480px] bg-gray-900/50 rounded-lg p-4 my-4 overflow-hidden border border-gray-700">
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            {/* Exec */}
            <DiagramConnection from={{x: 192, y: 39}} to={{x: 240, y: 39}} color="#FFFFFF" />
            <DiagramConnection from={{x: 432, y: 39}} to={{x: 490, y: 159}} color="#FFFFFF" />
            <DiagramConnection from={{x: 682, y: 159}} to={{x: 740, y: 159}} color="#FFFFFF" />
            <DiagramConnection from={{x: 932, y: 159}} to={{x: 990, y: 159}} color="#FFFFFF" />

            {/* Data */}
            <DiagramConnection from={{x: 192, y: 125}} to={{x: 240, y: 75}} color="#ec4899" />
            <DiagramConnection from={{x: 192, y: 233}} to={{x: 240, y: 207}} color="#facc15" />
            <DiagramConnection from={{x: 432, y: 207}} to={{x: 490, y: 231}} color="#4ade80" />
            <DiagramConnection from={{x: 432, y: 315}} to={{x: 490, y: 267}} color="#4ade80" />
            <DiagramConnection from={{x: 682, y: 231}} to={{x: 740, y: 195}} color="#facc15" />
            <DiagramConnection from={{x: 682, y: 315}} to={{x: 740, y: 231}} color="#c084fc" />
            <DiagramConnection from={{x: 932, y: 195}} to={{x: 990, y: 195}} color="#facc15" />
            <DiagramConnection from={{x: 932, y: 275}} to={{x: 990, y: 231}} color="#4ade80" />
        </svg>

        <DiagramNode title="Event: On Update" position={{top:20, left:10}} outputs={[{name:'', type:'exec'}]} />
        <DiagramNode title="Get Key (f)" position={{top:106, left:10}} outputs={[{name:'Is Down', type:'boolean'}]} />
        <DiagramNode title="Get Object By Name (Player)" position={{top:214, left:10}} outputs={[{name:'Object', type:'gameObject'}]} />
        
        <DiagramNode title="Branch (If)" position={{top:20, left:240}} inputs={[{name:'',type:'exec'}, {name:'Condition', type:'boolean'}]} outputs={[{name:'True',type:'exec'}]} />
        <DiagramNode title="Get Position" position={{top:158, left:240}} inputs={[{name:'Target', type:'gameObject'}]} outputs={[{name:'Position', type:'vector2'}]} />
        <DiagramNode title="Vector2 (Offset)" position={{top:296, left:240}} outputs={[{name:'', type:'vector2'}]} />

        <DiagramNode title="Add Vector2" position={{top:212, left:490}} inputs={[{name:'A', type:'vector2'}, {name:'B', type:'vector2'}]} outputs={[{name:'Result', type:'vector2'}]} />
        <DiagramNode title="String (bullet)" position={{top:296, left:490}} outputs={[{name:'', type:'string'}]} />
        <DiagramNode title="Trigger Once" position={{top:20, left:490}} inputs={[{name:'', type:'exec'}]} outputs={[{name:'', type:'exec'}]} />

        <DiagramNode title="Spawn Object" position={{top:140, left:740}} inputs={[{name:'', type:'exec'},{name:'Type Name', type:'string'},{name:'Position', type:'vector2'}]} outputs={[{name:'execOut', type:'exec'},{name:'Spawned Object', type:'gameObject'}]} />
        <DiagramNode title="Vector2 (Velocity)" position={{top:256, left:740}} outputs={[{name:'', type:'vector2'}]} />
        
        <DiagramNode title="Set Velocity" position={{top:140, left:990}} inputs={[{name:'', type:'exec'},{name:'Target', type:'gameObject'},{name:'Velocity', type:'vector2'}]} outputs={[{name:'execOut', type:'exec'}]} />
    </div>
);

const CollectionDiagram = () => (
    <div className="relative h-[600px] bg-gray-900/50 rounded-lg p-4 my-4 overflow-hidden border border-gray-700">
        <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
            {/* Exec Flow */}
            <DiagramConnection from={{x:202, y:39}} to={{x:220, y:319}} color="#FFFFFF" />
            <DiagramConnection from={{x:412, y:319}} to={{x:430, y:127}} color="#FFFFFF" />
            <DiagramConnection from={{x:622, y:127}} to={{x:640, y:127}} color="#FFFFFF" />
            <DiagramConnection from={{x:832, y:127}} to={{x:850, y:339}} color="#FFFFFF" />

            {/* Data Flow */}
            <DiagramConnection from={{x:202, y:127}} to={{x:220, y:355}} color="#facc15" />
            <DiagramConnection from={{x:202, y:235}} to={{x:220, y:391}} color="#facc15" />
            <DiagramConnection from={{x:412, y:391}} to={{x:430, y:275}} color="#4ade80" />
            <DiagramConnection from={{x:412, y:499}} to={{x:430, y:311}} color="#4ade80" />
            <DiagramConnection from={{x:622, y:275}} to={{x:640, y:375}} color="#22d3ee" />
            <DiagramConnection from={{x:622, y:499}} to={{x:640, y:411}} color="#22d3ee" />
            <DiagramConnection from={{x:832, y:375}} to={{x:850, y:375}} color="#22d3ee" />
            <DiagramConnection from={{x:412, y:127}} to={{x:430, y:163}} color="#facc15" />
        </svg>

        <DiagramNode title="Event: On Update" position={{top:20, left:10}} outputs={[{name:'',type:'exec'}]} />
        <DiagramNode title="Get Object By Name (Player)" position={{top:108, left:10}} outputs={[{name:'Object', type:'gameObject'}]} />
        <DiagramNode title="Get Object By Name (Coin)" position={{top:216, left:10}} outputs={[{name:'Object', type:'gameObject'}]} />

        <DiagramNode title="Branch" position={{top:300, left:220}} inputs={[{name:'',type:'exec'},{name:'Condition',type:'boolean'}]} outputs={[{name:'True',type:'exec'}]} />
        <DiagramNode title="Get Position" position={{top:372, left:220}} inputs={[{name:'Target', type:'gameObject'}]} outputs={[{name:'Position', type:'vector2'}]} />
        <DiagramNode title="Get Position" position={{top:480, left:220}} inputs={[{name:'Target', type:'gameObject'}]} outputs={[{name:'Position', type:'vector2'}]} />

        <DiagramNode title="Destroy Object" position={{top:108, left:430}} inputs={[{name:'',type:'exec'},{name:'Target',type:'gameObject'}]} outputs={[{name:'execOut',type:'exec'}]} />
        <DiagramNode title="Distance" position={{top:256, left:430}} inputs={[{name:'A',type:'vector2'},{name:'B',type:'vector2'}]} outputs={[{name:'Distance',type:'number'}]} />
        <DiagramNode title="Less Than" position={{top:356, left:430}} inputs={[{name:'A',type:'number'},{name:'B',type:'number'}]} outputs={[{name:'Result',type:'boolean'}]} />
        <DiagramNode title="Number (20)" position={{top:436, left:430}} outputs={[{name:'',type:'number'}]} />

        <DiagramNode title="Play Sound" position={{top:108, left:640}} inputs={[{name:'',type:'exec'}]} outputs={[{name:'execOut',type:'exec'}]} />
        <DiagramNode title="Get Property (score)" position={{top:356, left:640}} inputs={[{name:'Target',type:'gameObject'}]} outputs={[{name:'Value',type:'number'}]} />
        <DiagramNode title="Number (1)" position={{top:456, left:640}} outputs={[{name:'',type:'number'}]} />
        
        <DiagramNode title="Set Property (score)" position={{top:320, left:850}} inputs={[{name:'',type:'exec'},{name:'Target',type:'gameObject'},{name:'Value',type:'number'}]} />
    </div>
);


interface ManualModalProps {
  onClose: () => void;
}

const ManualModal: React.FC<ManualModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-8 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] border border-gray-700 flex flex-col text-gray-300">
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 className="font-bold text-lg">Visual Scripting Manual</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full">
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>
        <main className="flex-grow p-6 overflow-y-auto">
            <div className="prose prose-sm prose-invert max-w-none prose-p:text-gray-400 prose-headings:text-gray-100 prose-strong:text-white prose-code:text-cyan-400 prose-code:bg-gray-900/50 prose-code:p-1 prose-code:rounded-md prose-code:font-semibold prose-ul:text-gray-400 prose-li:marker:text-cyan-400">
                <h2>Introduction</h2>
                <p>Visual scripting allows you to build complex game logic without writing code. You create logic by connecting nodes together in the <strong>Events</strong> view. This manual provides a recipe book of common patterns you can build.</p>
                
                <hr className="border-gray-700 my-8" />

                <h2>Example 1: The New Player Controller</h2>
                <p>Creating a fully-featured, animated platformer character is now incredibly simple. The new <code>Keyboard Platformer Controller</code> node handles all the complex physics and animation logic for you. Just connect it to an <code>On Update</code> event and tell it which object to control.</p>
                <PlayerControllerDiagram />
                <h3>Breakdown</h3>
                <ul>
                    <li><code>Event: On Update</code>: This node starts the logic flow on every single frame of the game.</li>
                    <li><code>Get Object By Name</code>: This node finds your "Player" object in the scene and passes a reference to it into the controller.</li>
                    <li><code>Keyboard Platformer Controller</code>: This is the all-in-one powerhouse.
                        <ul>
                            <li>It automatically listens for the 'a', 'd', and 'space' keys.</li>
                            <li>It applies movement speed, gravity, and jumping forces.</li>
                            <li>It checks for collisions with platforms and knows when the player is on the ground.</li>
                            <li>Most importantly, it automatically switches between the "Idle", "Run", "Jump", and "Fall" animations you specify in its properties based on the player's actions.</li>
                        </ul>
                    </li>
                </ul>

                <hr className="border-gray-700 my-8" />

                <h2>Example 2: Manual Animation Control</h2>
                <p>While the new controller is great for standard characters, you might need more specific control. This example builds a manual "state machine" for a character's animations. It checks if the character is in the air or on the ground, and if on the ground, it checks if they are moving. This allows you to have separate animations for jumping, running, and standing still.</p>
                <StatefulAnimationDiagram />
                <h3>Breakdown</h3>
                <ol>
                    <li>First, we need the Player object. A single <code>Get Object By Name</code> node (set to 'Player') provides the reference for all other nodes that need it.</li>
                    <li>The <code>On Update</code> event triggers a <code>Branch (isGrounded?)</code>. This is our first major decision.</li>
                    <li>The condition for this branch comes from a <code>Get Property</code> node. We feed it the Player reference and set its Property Name to <code>isGrounded</code>. The physics engine automatically sets this to true or false.</li>
                    <li><strong>If <code>isGrounded</code> is False (the "False" exec path):</strong> The player is in the air. We immediately trigger a <code>Change Animation</code> node set to play the "Jump" animation.</li>
                    <li><strong>If <code>isGrounded</code> is True (the "True" exec path):</strong> The player is on the ground. Now we need to decide between "Idle" and "Run". The flow goes to a second <code>Branch</code>.</li>
                    <li>This second branch checks if either the 'd' key or 'a' key is pressed. If true, it plays the "Run" animation. If false, it plays "Idle". (Diagram shows a simplified version checking only 'd').</li>
                </ol>

                <hr className="border-gray-700 my-8" />

                <h2>Example 3: Shooting a Projectile</h2>
                <p>This graph shows how to make a character shoot a bullet. It involves getting player input, finding the player's location, creating a new object (the bullet) at that location, and giving it an initial velocity.</p>
                <ShootingDiagram />
                <h3>Breakdown</h3>
                <ol>
                    <li><code>Get Key (f)</code> checks if the fire button is pressed. The <code>Trigger Once</code> node ensures that holding the key down only fires one shot, preventing a continuous stream. You can remove it for automatic fire.</li>
                    <li>The <code>Branch</code> node only allows the logic to continue if the key was pressed.</li>
                    <li>We get the <code>Player</code>'s current <code>Position</code>. We use an <code>Add Vector2</code> node to add a small offset, so the bullet appears in front of the player, not in the center.</li>
                    <li>The <code>Spawn Object</code> node is the core of this mechanic. It takes the calculated position and a <code>String</code> node (with the value 'bullet') to create a new 'bullet' type object in the scene.</li>
                    <li>The newly created bullet object is passed out of the <code>Spawned Object</code> pin.</li>
                    <li>Finally, the <code>Set Velocity</code> node takes the new bullet as a target and a <code>Vector2</code> data node to give it instant speed (e.g., X=500, Y=0 to shoot right).</li>
                </ol>

                 <hr className="border-gray-700 my-8" />

                <h2>Example 4: Item Collection & Score UI</h2>
                <p>This example demonstrates how to detect if the player is close to a "Coin" object. If they are, the coin is destroyed, a sound plays, and the player's "score" property is increased. Another part of the graph then updates a Text object on screen.</p>
                <CollectionDiagram />
                <h3>Breakdown</h3>
                <ol>
                    <li><strong>Proximity Check:</strong> On every frame (<code>On Update</code>), we get the position of the Player and the Coin using <code>Get Position</code> nodes. The <code>Distance</code> node calculates how far apart they are.</li>
                    <li>A <code>Less Than</code> node checks if this distance is less than a small <code>Number</code> (e.g., 20). This acts as our "collision" check.</li>
                    <li><strong>Action on Collect:</strong> A <code>Branch</code> node checks the result. If true, the execution flow continues.
                        <ul>
                            <li><code>Destroy Object</code> removes the Coin from the game.</li>
                            <li><code>Play Sound</code> plays a collection sound effect.</li>
                            <li><code>Get Property</code> reads the Player's current "score". We <code>Add</code> 1 to it, and then use <code>Set Property</code> to save the new score back to the Player object.</li>
                        </ul>
                    </li>
                    <li><strong>UI Update:</strong> A separate logic chain (which could also be triggered by <code>On Update</code>) gets the player's score, converts it to a string with <code>To String</code>, joins it with a label using <code>Concatenate</code>, and finally uses <code>Set Text</code> to display it on a Text object.</li>
                </ol>

            </div>
        </main>
      </div>
    </div>
  );
};

export default ManualModal;