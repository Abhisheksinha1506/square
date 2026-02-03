class SoundFX {
  static ctx = null;
  static init() {
    if (!this.ctx)
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === "suspended") this.ctx.resume();
  }
  static playTone(freq, type, duration, vol = 0.1, slideTo = null) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (slideTo)
      osc.frequency.exponentialRampToValueAtTime(
        slideTo,
        this.ctx.currentTime + duration
      );
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      this.ctx.currentTime + duration
    );
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
  static move() {
    this.playTone(300, "triangle", 0.03, 0.03);
  }
  static push() {
    this.playTone(100, "square", 0.08, 0.1, 50);
  }
  static match() {
    this.playTone(600, "square", 0.1, 0.1);
    setTimeout(() => this.playTone(1200, "square", 0.1, 0.1), 60);
  }
  static fall() {
    this.playTone(150, "sawtooth", 0.05, 0.05);
  }
  static win() {
    [523, 659, 783, 1046, 1318, 1568].forEach((f, i) =>
      setTimeout(() => this.playTone(f, "square", 0.2, 0.1), i * 70)
    );
  }
  static gameOver() {
    [300, 280, 260, 240, 220].forEach((f, i) =>
      setTimeout(() => this.playTone(f, "sawtooth", 0.3, 0.1), i * 150)
    );
  }
}

class Particle {
  constructor(x, y, color, type = "debris") {
    this.x = x;
    this.y = y;
    this.color = color;
    this.type = type;
    this.life = 1.0;

    if (type === "debris") {
      this.vx = (Math.random() - 0.5) * 16;
      this.vy = (Math.random() - 0.5) * 16 - 2;
      this.decay = 0.02 + Math.random() * 0.02;
      this.size = 1 + Math.random() * 2.5;
      this.gravity = 0.35;
      this.friction = 0.96;
    } else if (type === "spark") {
      this.vx = (Math.random() - 0.5) * 20;
      this.vy = (Math.random() - 0.5) * 20;
      this.decay = 0.04 + Math.random() * 0.03;
      this.size = 1 + Math.random();
      this.gravity = 0.1;
      this.friction = 0.92;
    }
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity || 0;
    this.vx *= this.friction || 1;
    this.vy *= this.friction || 1;
    this.life -= this.decay;
  }
  draw(ctx, ts) {
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    const px = this.x * ts;
    const py = this.y * ts;
    ctx.fillRect(px, py, this.size, this.size);
    ctx.globalAlpha = 1.0;
  }
}
