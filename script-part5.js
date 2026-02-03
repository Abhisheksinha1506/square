const canvas = document.getElementById("gameCanvas");
const engine = new Engine();
const renderer = new Renderer(canvas, engine);
let lastTime = 0;

function loop(timestamp) {
  const dt = timestamp - lastTime;
  lastTime = timestamp;
  engine.update(dt);
  renderer.draw();
  requestAnimationFrame(loop);
}

window.Game = {
  startGame: () => {
    document.getElementById("start-screen").classList.add("hidden");
    SoundFX.init();
    Sprites.init();
    engine.loadLevel(0);
    requestAnimationFrame(loop);
    document.body.style.cursor = "none";
  },
  openLevelSelect: () => {
    document.getElementById("start-screen").classList.add("hidden");
    SoundFX.init();
    Sprites.init();
    engine.state = "LEVEL_SELECT";
    engine.selectedLvlIdx = 0;
    requestAnimationFrame(loop);
    document.body.style.cursor = "none";
  },
  showInfo: () => {
    document.getElementById("info-modal").classList.remove("hidden");
    SoundFX.move();
  },
  hideInfo: () => {
    document.getElementById("info-modal").classList.add("hidden");
    SoundFX.move();
  }
};

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (engine.state === "PLAY" || engine.state === "LEVEL_SELECT") {
      document.getElementById("start-screen").classList.remove("hidden");
      engine.state = "MENU";
      document.body.style.cursor = "auto";
      SoundFX.move();
    }
    return;
  }

  if (engine.state === "PLAY") {
    switch (e.key) {
      case "ArrowUp":
        engine.moveCursor(0, -1);
        break;
      case "ArrowDown":
        engine.moveCursor(0, 1);
        break;
      case "ArrowLeft":
        engine.moveCursor(-1, 0);
        break;
      case "ArrowRight":
        engine.moveCursor(1, 0);
        break;
      case "a":
      case "q":
      case "A":
      case "Q":
        engine.action(-1);
        break;
      case "d":
      case "e":
      case "D":
      case "E":
        engine.action(1);
        break;
      case "r":
      case "R":
        engine.restart();
        break;
    }
  } else if (engine.state === "LEVEL_SELECT") {
    switch (e.key) {
      case "ArrowUp":
        engine.moveCursor(0, -1);
        break;
      case "ArrowDown":
        engine.moveCursor(0, 1);
        break;
      case "ArrowLeft":
        engine.moveCursor(-1, 0);
        break;
      case "ArrowRight":
        engine.moveCursor(1, 0);
        break;
      case "Enter":
        if (engine.selectedLvlIdx < engine.unlocked)
          engine.loadLevel(engine.selectedLvlIdx);
        break;
    }
  } else if (["LEVEL_DONE", "GAMEOVER", "WIN"].includes(engine.state)) {
    if (e.key === "Enter") {
      if (
        engine.state === "LEVEL_DONE" &&
        engine.currentLevelIdx + 1 < LEVELS.length
      ) {
        engine.loadLevel(engine.currentLevelIdx + 1);
      } else {
        document.getElementById("start-screen").classList.remove("hidden");
        engine.state = "MENU";
        document.body.style.cursor = "auto";
      }
    }
  }
});

window.addEventListener("resize", () => {
  renderer.resize();
  renderer.draw();
});

canvas.addEventListener("click", (e) => {
  if (engine.state === "LEVEL_SELECT") {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cols = 4;
    const cellSize = 60;
    const gap = 20;
    const startX = (canvas.width - (cols * cellSize + (cols - 1) * gap)) / 2;
    const startY =
      (canvas.height - Math.ceil(LEVELS.length / cols) * (cellSize + gap)) / 2;
    
    // Check if info button was clicked
    const infoBtnY = startY + Math.ceil(LEVELS.length / cols) * (cellSize + gap) + 40;
    const infoBtnX = canvas.width / 2 - 60;
    const infoBtnWidth = 120;
    const infoBtnHeight = 40;
    
    if (x >= infoBtnX && x <= infoBtnX + infoBtnWidth &&
        y >= infoBtnY && y <= infoBtnY + infoBtnHeight) {
      Game.showInfo();
    }
  }
});

renderer.resize();
