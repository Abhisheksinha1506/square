const Sprites = (() => {
  const cache = {};
  function createBlock(id, colors) {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = colors.main;
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillRect(2, 2, 12, 4);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(2, 11, 12, 4);
    ctx.fillStyle = colors.dark;
    ctx.fillRect(4, 4, 8, 8);
    ctx.fillStyle = colors.main;
    ctx.fillRect(6, 6, 4, 4);
    return c;
  }
  function createWall() {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = "#333";
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(0, 0, 2, 16);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillRect(14, 0, 2, 16);
    ctx.fillStyle = "#555";
    ctx.fillRect(4, 4, 2, 2);
    ctx.fillRect(10, 4, 2, 2);
    ctx.fillRect(4, 10, 2, 2);
    ctx.fillRect(10, 10, 2, 2);
    return c;
  }
  function createCursor() {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext("2d");
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, 14, 14);
    ctx.fillStyle = "#FFF";
    ctx.fillRect(0, 0, 3, 3);
    ctx.fillRect(13, 0, 3, 3);
    ctx.fillRect(0, 13, 3, 3);
    ctx.fillRect(13, 13, 3, 3);
    return c;
  }
  return {
    init: () => {
      for (let id = 1; id <= 6; id++)
        if (BLOCK_COLORS[id]) cache[id] = createBlock(id, BLOCK_COLORS[id]);
      cache[-1] = createWall();
      cache["CURSOR"] = createCursor();
    },
    get: (id) => cache[id]
  };
})();

class Engine {
  constructor() {
    this.state = "MENU";
    this.currentLevelIdx = 0;
    this.blocks = [];
    this.particles = [];
    this.cursor = { x: 4, y: 4 };
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem("puzznic_hi") || "0");
    this.unlocked = parseInt(localStorage.getItem("puzznic_unlock") || "1");
    this.timeLeft = 0;
    this.selectedLvlIdx = 0;
    this.shakeTimer = 0;
  }

  loadLevel(idx) {
    if (idx < 0 || idx >= LEVELS.length) return;
    this.currentLevelIdx = idx;
    const lvl = LEVELS[idx];
    this.timeLeft = lvl.timeLimit;
    this.blocks = [];
    this.particles = [];

    lvl.grid.forEach((row, y) => {
      row.forEach((type, x) => {
        if (type !== 0) {
          this.blocks.push({
            id: Math.random().toString(36).substr(2, 9),
            type: type,
            x: x,
            y: y,
            tx: x,
            ty: y,
            isMoving: false,
            isWall: type === -1
          });
        }
      });
    });
    this.state = "PLAY";
    const firstBlock = this.blocks.find((b) => !b.isWall);
    if (firstBlock) {
      this.cursor.x = firstBlock.x;
      this.cursor.y = firstBlock.y;
    }
  }

  spawnExplosion(x, y, color) {
    for (let i = 0; i < 20; i++)
      this.particles.push(new Particle(x, y, color, "debris"));
    for (let i = 0; i < 15; i++)
      this.particles.push(new Particle(x, y, "#FFF", "spark"));
    this.shakeTimer = 8;
  }

  flashScreen() {
    const f = document.getElementById("flash-overlay");
    f.style.opacity = 0.8;
    setTimeout(() => (f.style.opacity = 0), 60);
  }

  update(dt) {
    if (this.shakeTimer > 0) this.shakeTimer--;
    if (this.state === "PLAY") {
      this.timeLeft -= dt / 1000;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.state = "GAMEOVER";
        SoundFX.gameOver();
        this.flashScreen();
        return;
      }

      let stable = true;
      this.blocks.forEach((b) => {
        if (b.isWall) return;
        const dx = b.tx - b.x;
        const dy = b.ty - b.y;
        if (Math.abs(dx) > 0.01) {
          b.x += dx * CONFIG.moveSpeed;
          stable = false;
        } else {
          b.x = b.tx;
        }
        if (Math.abs(dy) > 0.01) {
          b.y += dy * CONFIG.gravitySpeed;
          stable = false;
          if (Math.abs(dy) > 0.5 && !b.isFalling) b.isFalling = true;
        } else {
          b.y = b.ty;
          if (b.isFalling) {
            b.isFalling = false;
            SoundFX.fall();
            if (this.shakeTimer <= 0) this.shakeTimer = 2;
          }
        }
      });
      this.particles.forEach((p) => p.update());
      this.particles = this.particles.filter((p) => p.life > 0);
      if (stable) {
        this.applyGravity();
        this.checkMatches();
        this.checkWin();
      }
    }
  }

  applyGravity() {
    const sorted = [...this.blocks]
      .filter((b) => !b.isWall)
      .sort((a, b) => b.ty - a.ty);
    sorted.forEach((b) => {
      let destY = b.ty;
      while (destY < CONFIG.gridHeight - 1) {
        const blockBelow = this.getBlockAt(b.tx, destY + 1);
        if (!blockBelow) destY++;
        else break;
      }
      if (destY !== b.ty) b.ty = destY;
    });
  }

  getBlockAt(x, y) {
    return this.blocks.find(
      (b) => Math.abs(b.tx - x) < 0.1 && Math.abs(b.ty - y) < 0.1
    );
  }

  checkMatches() {
    const matches = new Set();
    this.blocks
      .filter(
        (b) =>
          !b.isWall && Math.abs(b.tx - b.x) < 0.1 && Math.abs(b.ty - b.y) < 0.1
      )
      .forEach((b) => {
        [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1]
        ].forEach(([dx, dy]) => {
          const n = this.getBlockAt(b.tx + dx, b.ty + dy);
          if (
            n &&
            !n.isWall &&
            n.type === b.type &&
            Math.abs(n.tx - n.x) < 0.1
          ) {
            matches.add(b);
            matches.add(n);
          }
        });
      });
    if (matches.size > 0) {
      matches.forEach((b) =>
        this.spawnExplosion(
          b.x + 0.5,
          b.y + 0.5,
          BLOCK_COLORS[b.type]?.main || "#FFF"
        )
      );
      this.blocks = this.blocks.filter((b) => !matches.has(b));
      this.score += matches.size * 100;
      this.timeLeft += 2;
      SoundFX.match();
      this.flashScreen();
    }
  }

  checkWin() {
    if (this.blocks.filter((b) => !b.isWall).length === 0) {
      this.state = "LEVEL_DONE";
      SoundFX.win();
      this.score += Math.floor(this.timeLeft * 10);
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem("puzznic_hi", this.highScore);
      }
      if (
        this.currentLevelIdx + 1 >= this.unlocked &&
        this.currentLevelIdx + 1 < LEVELS.length
      ) {
        this.unlocked = this.currentLevelIdx + 2;
        localStorage.setItem("puzznic_unlock", this.unlocked);
      }
    }
  }

  moveCursor(dx, dy) {
    if (this.state === "LEVEL_SELECT") {
      const cols = 4;
      let nx = (this.selectedLvlIdx % cols) + dx;
      let ny = Math.floor(this.selectedLvlIdx / cols) + dy;
      const rows = Math.ceil(LEVELS.length / cols);
      if (nx < 0) nx = cols - 1;
      if (nx >= cols) nx = 0;
      if (ny < 0) ny = rows - 1;
      if (ny >= rows) ny = 0;
      let newIdx = ny * cols + nx;
      if (newIdx >= LEVELS.length) newIdx = LEVELS.length - 1;
      this.selectedLvlIdx = newIdx;
      SoundFX.move();
    } else if (this.state === "PLAY") {
      let nx = this.cursor.x + dx;
      let ny = this.cursor.y + dy;
      if (nx >= 0 && nx < CONFIG.gridWidth) this.cursor.x = nx;
      if (ny >= 0 && ny < CONFIG.gridHeight) this.cursor.y = ny;
      SoundFX.move();
    }
  }

  action(dir) {
    if (this.state !== "PLAY") return;
    const target = this.getBlockAt(this.cursor.x, this.cursor.y);
    if (!target || target.isWall || Math.abs(target.x - target.tx) > 0.1)
      return;
    const destX = target.tx + dir;
    if (destX < 0 || destX >= CONFIG.gridWidth) return;
    const obstacle = this.getBlockAt(destX, target.ty);
    if (obstacle) return;
    target.tx = destX;
    this.cursor.x = destX;
    SoundFX.push();
  }

  restart() {
    if (["PLAY", "GAMEOVER"].includes(this.state))
      this.loadLevel(this.currentLevelIdx);
  }
}
