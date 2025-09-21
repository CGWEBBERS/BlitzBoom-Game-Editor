
// services/nodeLogic/index.ts

import { NodeLogicHandler } from "./types";
import { logic as branchLogic } from './branch';
import { logic as comparisonLogic } from './comparisonNodes';
import { logic as dataLogic } from './dataNodes';
import { logic as getGameObjectLogic } from './getGameObject';
import { logic as getPropertyLogic } from './getProperty';
import { logic as getKeyLogic } from './isKeyDown';
import { logic as getAxisLogic } from './getAxis';
import { logic as keyboardPlatformerControllerLogic } from './keyboardPlatformerController';
import { logic as logMessageLogic } from './logMessage';
import { logic as moveObjectLogic } from './moveObject';
import { logic as setPropertyLogic } from './setProperty';
import { logic as changeAnimationLogic } from './changeAnimation';
import { logic as playMusicLogic } from './playMusic';
import { logic as soundsLogic } from './sounds';
import { logic as playVideoLogic } from './playVideo';
import { logic as timerLogic } from './timer';
import { logic as triggerOnceLogic } from './triggerOnce';
import { logic as changeSceneLogic } from './changeScene';
import { logic as pauseSceneLogic } from './pauseScene';
import { logic as cameraLogic } from './camera';
import { logic as fullScreenLogic } from './fullScreen';
import { logic as getPositionLogic } from './getPosition';
import { logic as addVector2Logic } from './addVector2';
import { logic as setVelocityLogic } from './setVelocity';
import { logic as spawnObjectLogic } from './spawnObject';
import { logic as enemyAIPlatformerLogic } from './enemyAIPlatformer';
import { logic as setTextLogic } from './setText';
import { logic as getTextLogic } from './getText';
import { logic as destroyObjectLogic } from './destroyObject';
import { logic as mathLogic } from './mathNodes';
import { logic as stringLogic } from './stringNodes';
import { logic as vector2Logic } from './vector2Nodes';
import { logic as countdownClockLogic } from './countdownClock';
import { logic as distanceCheckLogic } from './distanceCheck';
import { logic as musicChannelLogic } from './musicChannel';
import { logic as healthLogic } from './health';

export const nodeLogic: Record<string, NodeLogicHandler> = {
  ...branchLogic,
  ...comparisonLogic,
  ...dataLogic,
  ...getGameObjectLogic,
  ...getPropertyLogic,
  ...getKeyLogic,
  ...getAxisLogic,
  ...keyboardPlatformerControllerLogic,
  ...logMessageLogic,
  ...moveObjectLogic,
  ...setPropertyLogic,
  ...changeAnimationLogic,
  ...playMusicLogic,
  ...soundsLogic,
  ...playVideoLogic,
  ...timerLogic,
  ...triggerOnceLogic,
  ...changeSceneLogic,
  ...pauseSceneLogic,
  ...cameraLogic,
  ...fullScreenLogic,
  ...getPositionLogic,
  ...addVector2Logic,
  ...setVelocityLogic,
  ...spawnObjectLogic,
  ...enemyAIPlatformerLogic,
  ...setTextLogic,
  ...getTextLogic,
  ...destroyObjectLogic,
  ...mathLogic,
  ...stringLogic,
  ...vector2Logic,
  ...countdownClockLogic,
  ...distanceCheckLogic,
  ...musicChannelLogic,
  ...healthLogic,
};
