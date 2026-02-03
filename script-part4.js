class Renderer {
  constructor(canvas, engine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.engine = engine;
    this.ctx.imageSmoothingEnabled = false;
  }
  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  draw() {
    const { ctx, canvas, engine } = this;
    const { gridWidth, gridHeight, tileSize, scale } = CONFIG;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (engine.shakeTimer > 0)
      ctx.translate((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);

    if (engine.state === "LEVEL_SELECT") {
      ctx.restore();
      this.drawLevelSelect(ctx, canvas);
      this.drawHUD();
      return;
    }

    const gameW = gridWidth * tileSize * scale;
    const gameH = gridHeight * tileSize * scale;
    const screenScale =
      Math.min(canvas.width / gameW, canvas.height / gameH) * 0.95;
    const finalScale = scale * screenScale;
    const offsetX = (canvas.width - gameW * screenScale) / 2;
    const offsetY = (canvas.height - gameH * screenScale) / 2;

    ctx.translate(offsetX, offsetY);
    ctx.scale(finalScale, finalScale);

    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, gridWidth * tileSize, gridHeight * tileSize);
    ctx.strokeStyle = "#151515";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y <= gridHeight; y++) {
      ctx.moveTo(0, y * tileSize);
      ctx.lineTo(gridWidth * tileSize, y * tileSize);
    }
    for (let x = 0; x <= gridWidth; x++) {
      ctx.moveTo(x * tileSize, 0);
      ctx.lineTo(x * tileSize, gridHeight * tileSize);
    }
    ctx.stroke();

    engine.particles.forEach((p) => p.draw(ctx, tileSize));
    [...engine.blocks]
      .sort((a, b) => a.y - b.y)
      .forEach((b) => {
        const sprite = Sprites.get(b.type);
        if (sprite)
          ctx.drawImage(
            sprite,
            Math.floor(b.x * tileSize),
            Math.floor(b.y * tileSize)
          );
      });
    if (engine.state === "PLAY") {
      const curSprite = Sprites.get("CURSOR");
      if (Math.floor(Date.now() / 200) % 2 === 0)
        ctx.drawImage(
          curSprite,
          engine.cursor.x * tileSize,
          engine.cursor.y * tileSize
        );
    }
    ctx.restore();
    this.drawHUD();
  }

  drawLevelSelect(ctx, canvas) {
    const cols = 4;
    const cellSize = 60;
    const gap = 20;
    const startX = (canvas.width - (cols * cellSize + (cols - 1) * gap)) / 2;
    const startY =
      (canvas.height - Math.ceil(LEVELS.length / cols) * (cellSize + gap)) / 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = '20px "Press Start 2P"';

    LEVELS.forEach((lvl, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cellSize + gap);
      const y = startY + row * (cellSize + gap);
      const isUnlocked = i < this.engine.unlocked;
      const isSelected = i === this.engine.selectedLvlIdx;

      ctx.fillStyle = isSelected ? "#222" : "#050505";
      ctx.fillRect(x, y, cellSize, cellSize);
      ctx.lineWidth = 3;
      ctx.strokeStyle = isSelected ? "#FFF" : isUnlocked ? "#444" : "#111";
      ctx.strokeRect(x, y, cellSize, cellSize);

      if (isUnlocked) {
        ctx.fillStyle = isSelected ? "#FFF" : "#666";
        ctx.fillText(i + 1, x + cellSize / 2, y + cellSize / 2);
      } else {
        ctx.fillStyle = "#111";
        ctx.fillText("--", x + cellSize / 2, y + cellSize / 2);
      }
    });

    // Draw info button
    const infoBtnY = startY + Math.ceil(LEVELS.length / cols) * (cellSize + gap) + 40;
    const infoBtnX = canvas.width / 2 - 60;
    const infoBtnWidth = 120;
    const infoBtnHeight = 40;
    
    ctx.fillStyle = "#2a4a8a";
    ctx.fillRect(infoBtnX, infoBtnY, infoBtnWidth, infoBtnHeight);
    ctx.strokeStyle = "#4a7aca";
    ctx.lineWidth = 2;
    ctx.strokeRect(infoBtnX, infoBtnY, infoBtnWidth, infoBtnHeight);
    
    ctx.fillStyle = "#cafaff";
    ctx.font = '14px "Press Start 2P"';
    ctx.fillText("ℹ️ INFO", canvas.width / 2, infoBtnY + infoBtnHeight / 2);
  }

  drawHUD() {
    const ctx = this.ctx;
    const eng = this.engine;
    if (eng.state === "LEVEL_SELECT" || eng.state === "MENU") return;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, this.canvas.width, 60);
    ctx.shadowBlur = 4;

    const scoreText = `SCORE: ${eng.score}`;
    const hiText = `HI: ${eng.highScore}`;
    const lvlText = `LVL: ${(eng.currentLevelIdx + 1)
      .toString()
      .padStart(2, "0")}`;
    const timeText = Math.ceil(eng.timeLeft).toString().padStart(2, "0");

    ctx.shadowColor = "#0FF";
    ctx.fillStyle = "#0FF";
    ctx.font = '16px "Press Start 2P"';
    ctx.textAlign = "left";
    ctx.fillText(scoreText, 20, 35);
    ctx.shadowColor = "#0F0";
    ctx.fillStyle = "#0F0";
    ctx.fillText(lvlText, 20, 55);

    ctx.textAlign = "right";
    ctx.shadowColor = "#FF0";
    ctx.fillStyle = "#FF0";
    ctx.fillText(hiText, this.canvas.width - 20, 35);

    ctx.textAlign = "center";
    ctx.shadowColor = eng.timeLeft < 30 ? "#F00" : "#F80";
    ctx.fillStyle =
      eng.timeLeft < 30
        ? Math.floor(Date.now() / 100) % 2
          ? "#F00"
          : "#500"
        : "#F80";
    ctx.font = '24px "Press Start 2P"';
    ctx.fillText(timeText, this.canvas.width / 2, 45);

    ctx.shadowBlur = 0;
    if (eng.state === "LEVEL_DONE") this.drawMsg("STAGE CLEAR", "PRESS ENTER");
    if (eng.state === "GAMEOVER") this.drawMsg("GAME OVER", "PRESS ENTER");
    if (eng.state === "WIN") this.drawMsg("CONGRATULATIONS!", "ALL CLEARED");
  }

  drawMsg(title, sub) {
    const ctx = this.ctx;
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.textAlign = "center";
    ctx.fillStyle = "#FFF";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.font = '32px "Press Start 2P"';
    ctx.fillText(title, this.canvas.width / 2, this.canvas.height / 2 - 20);
    ctx.font = '14px "Press Start 2P"';
    ctx.fillStyle = "#0FF";
    ctx.shadowColor = "#0FF";
    ctx.fillText(sub, this.canvas.width / 2, this.canvas.height / 2 + 40);
    ctx.shadowBlur = 0;
  }
}
