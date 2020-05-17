let main = document.getElementById("main"),
  chatCommand = '!guess',
  chatCommandStartLC = 'start',
  chatCommandStopLC = 'stop',
  modControl = false,
  subMode = false,
  points = 97,
  roundTimer,
  countdownInterval,
  startGameTimer,
  gameTimeLimitTimer,
  gameRunning = false,
  logoImage = `https://cdn.streamelements.com/uploads/02176cd6-828a-4fb9-8b25-cf0c34967f50.jpg`,
  gridSize = 6,
  gameStartDelay = 30,
  roundDelay = 1,
  gameTimeout = 1,
  gameEndDelay = 1,
  answer = '',
  gameData = [],
  gameNumber = 0,
  jebaitedAPIToken = 'noTokenSupplied',
  gameDataURL = 'https://raw.githubusercontent.com/pjonp/pjTestBot/master/modules/reveal_game/RevealGameDataBase.json',
  isBroadcaster,
  isMod,
  isSub,
  canEdit,
  subCheck;

const GetData = (dbURL) => {
  return fetch(dbURL)
    .then(response => response.json())
    .then(data => {
      gameData = data;
    })
    .catch(error => {
      console.error(`Error Reading JSON file`)
    });
};

//EVENTS

window.addEventListener('onEventReceived', (obj) => {
  const event = obj.detail.listener;
  if (event !== 'message') {
    return;
  }
  onMessage(obj.detail.event.data);
  return;
});

window.addEventListener('onWidgetLoad', async (obj) => {

  const fieldData = obj.detail.fieldData;

  chatCommand = fieldData.chatCommand || chatCommand;
  chatCommandStartLC = fieldData.chatCommandStart.toLowerCase() || chatCommandStartLC;
  chatCommandStopLC = fieldData.chatCommandStop.toLowerCase() || chatCommandStopLC;
  modControl = fieldData.modControl === 'Yes';
  subMode = fieldData.subMode === 'Yes';
  points = fieldData.points;
  logoImage = fieldData.coverImageUpload;
  gridSize = fieldData.gridSize;
  gameStartDelay = fieldData.gameStartDelay;
  roundDelay = fieldData.roundDelay;
  gameTimeout = fieldData.gameTimeout;
  gameEndDelay = fieldData.gameEndDelay;
  jebaitedAPIToken = fieldData.jebaitedToken;
  gameDataURL = fieldData.databaseURL || gameDataURL;

  await GetData(gameDataURL);

  //on load for sizing
  buildGame()
  setTimeout(() => {
    gameOver();
  }, 10000);
});

//SERVER LOGIC
let onMessage = (msg) => {
  let res = '';
  if (!gameRunning && msg.text.toLowerCase().startsWith(`{chatCommand} ${chatCommandStartLC}`)) {
    isBroadcaster = msg.badges.some(i => i.type === 'broadcaster');
    isMod = msg.badges.some(i => i.type === 'mod');
    isSub = msg.tags.subscriber !== '0';
    canEdit = modControl && isMod;
    subCheck = subMode === isSub;

    if (isBroadcaster || canEdit) {
      buildGame();
      res = `Game started! what is the hidden image?!`
      sayMessage(res);
    };
    return;
  } else if (gameRunning && msg.text.toLowerCase().startsWith(`{chatCommand} ${chatCommandStopLC}`)) {
    isBroadcaster = msg.badges.some(i => i.type === 'broadcaster');
    isMod = msg.badges.some(i => i.type === 'mod');
    isSub = msg.tags.subscriber !== '0';
    canEdit = modControl && isMod;
    subCheck = subMode === isSub;

    if (isBroadcaster || canEdit) {
      gameOver();
      res = `{chatCommand} Game has been stopped.`
      console.log(res);
      sayMessage(res);
    };
    return;
  } else if (gameRunning && msg.text.toLowerCase().includes(answer)) {
    isBroadcaster = msg.badges.some(i => i.type === 'broadcaster');
    isSub = msg.tags.subscriber !== '0';
    subCheck = subMode === isSub;

    if (isBroadcaster || isSub || subCheck) {
      gameOver(msg.displayName);
    };
    return;
  } else {
    return;
  };
};

//OVERLAY LOGIC
let buildGame = () => {
  let startDelay = gameStartDelay,
    randAnswer = gameData[Math.floor(Math.random() * gameData.length)] || 150,
    bgImage = randAnswer.image;

  answer = randAnswer.name.toLowerCase();
  gameRunning = true;

  console.log('cheat mode:', answer);

  gameTimeLimitTimer = setTimeout(() => {
    gameOver();
  }, ((gameStartDelay + gameTimeout) + (gridSize * gridSize * roundDelay)) * 1000);

  gameRunning = true;
  main.style.backgroundImage = `url(${bgImage})`;

  let squares = gridSize * gridSize,
    squareArr = [],
    htmlString = '';
  for (i = 0; i < squares; i++) {
    let radius = i === 0 ? "80px 0px 0px 0px" :
      i === gridSize - 1 ? "0px 80px 0px 0px" :
      i === squares - 1 ? "0px 0px 80px 0px" :
      i === squares - gridSize ? "0px 0px 0px 80px" : "0px 0px 0px 0px";

    let row = Math.floor(i / gridSize),
      col = i % gridSize,
      bgX = -col * (800 / gridSize),
      bgY = -row * (800 / gridSize);

    htmlString += `
      <div id=${i} class="coverBox" style="background-image: url(${logoImage}); background-position: ${bgX}px ${bgY}px; width: ${800/gridSize}px; height: ${800/gridSize}px; border-radius: ${radius}">
      </div>`;
    squareArr.push(i)
  };

  htmlString += `<span id='status'>
  GAME STARTING IN&nbsp;<span id='timer'>${startDelay}</span>&nbsp;SECONDS!
</span>`
  main.innerHTML = htmlString;
  main.classList.remove("hide")
  main.classList.add("show");
  countdownInterval = setInterval(() => {
    startDelay--
    if (startDelay === 1) document.getElementById("status").classList.add("hide");
    document.getElementById("timer").innerHTML = startDelay;
  }, 1000);

  startGameTimer = setTimeout(() => {
    clearInterval(countdownInterval);
    gameRound(squareArr, roundDelay);
    document.getElementById("status").style.display = 'none';
  }, startDelay * 1000)
};

let gameRound = (squareArr, roundDelay) => {
  if (squareArr.length === 0 || !gameRunning) return;
  let randSquare = squareArr.splice(Math.floor(Math.random() * squareArr.length), 1)
  target = document.getElementById(randSquare);
  target.style.backgroundColor = 'transparent';
  target.style.backgroundImage = null;
  roundTimer = setTimeout(() => {
    gameRound(squareArr, roundDelay);
  }, roundDelay * 1000)
  return;
};

let gameOver = (winner) => {
  //clear all timers
  clearTimeout(roundTimer);
  clearInterval(countdownInterval);
  clearTimeout(startGameTimer);
  clearTimeout(gameTimeLimitTimer);

  gameRunning = false;

  let res = winner ? `${winner} caught ${answer}!` : `${answer} has escaped!`;

  main.innerHTML = `<span id='status'>${res.toUpperCase()}</span>`
  if (winner) {
    savePoints(winner);
  };
  setTimeout(() => {
    if (gameRunning) return;
    main.classList.add("hide");
  }, gameEndDelay * 1000);
  if (gameNumber) {
    sayMessage(res);
  };
  gameNumber++
  return;
};

//lx API
const savePoints = (username) => {
  /*
  socket.emit('saveSEPoints',
              {
    			'username': username,
    			'points': points
 			 }
   );
   */
  fetch(`https://api.jebaited.net/addPoints/${jebaitedAPIToken}/${username}/{points}`)
    .catch(error => {
      console.error(`Error saving points`)
    });
};

const sayMessage = (message) => {
  message = encodeURIComponent(message);
  fetch(`https://api.jebaited.net/botMsg/${jebaitedAPIToken}/${message}`)
    .catch(error => {
      console.error(`Error sending message to chat`)
    });
};
