(() => {
  const canvas =
    document.getElementById("gameCanvas") ||
    (() => {
      const el = document.createElement("canvas");
      el.id = "gameCanvas";
      el.width = 360;
      el.height = 640;
      document.body.appendChild(el);
      return el;
    })();
  const ctx = canvas.getContext("2d");

  const positionDisplay =
    document.getElementById("positionDisplay") ||
    (() => {
      const el = document.createElement("div");
      el.id = "positionDisplay";
      document.body.appendChild(el);
      return el;
    })();

  const roundDisplay =
    document.getElementById("roundDisplay") ||
    (() => {
      const el = document.createElement("div");
      el.id = "roundDisplay";
      el.textContent = "Round 1";
      document.body.appendChild(el);
      return el;
    })();

  const raceStatus =
    document.getElementById("raceStatus") ||
    (() => {
      const el = document.createElement("div");
      el.id = "raceStatus";
      document.body.appendChild(el);
      return el;
    })();

  const reviveButton =
    document.getElementById("reviveButton") ||
    (() => {
      const el = document.createElement("button");
      el.id = "reviveButton";
      el.textContent = "Watch Ad to Revive";
      el.style.display = "none";
      document.body.appendChild(el);
      return el;
    })();

  const ROAD_LEFT = 40;
  const ROAD_WIDTH = canvas.width - ROAD_LEFT * 2;
  const LANE_COUNT = 3;
  const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;
  const FINISH_DISTANCE = 4200;
  const OPPONENT_COLORS = ["#ff4d4d", "#4d9dff", "#ffd24d"];

  const player = {
    x: ROAD_LEFT + ROAD_WIDTH / 2 - 18,
    y: canvas.height - 110,
    w: 36,
    h: 64,
    speed: 250,
    progress: 0,
    color: "#38d66b",
  };

  const opponents = [220, 240, 265].map((speed, i) => ({
    x: laneCenterToX(i),
    y: 120 + i * 90,
    w: 36,
    h: 64,
    speed,
    progress: 0,
    color: OPPONENT_COLORS[i],
  }));

  const obstacles = Array.from({ length: 6 }, (_, i) => createObstacle(i));

  let steerDirection = 0;
  let gameOver = false;
  let round = 1;
  let wonRound = false;
  let lastTime = performance.now();

  function laneCenterToX(laneIndex) {
    const lane = Math.max(0, Math.min(LANE_COUNT - 1, laneIndex));
    return ROAD_LEFT + lane * LANE_WIDTH + LANE_WIDTH / 2 - 16;
  }

  function createObstacle(index) {
    const lane = Math.floor(Math.random() * LANE_COUNT);
    return {
      x: laneCenterToX(lane),
      y: -index * 180 - 120,
      w: 32,
      h: 32,
    };
  }

  function isColliding(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function updatePositionDisplay() {
    const ranking = [player, ...opponents].sort((a, b) => b.progress - a.progress);
    const pos = ranking.indexOf(player) + 1;
    positionDisplay.textContent = `Position: ${pos}/4`;
    return pos;
  }

  function onSteerStart(clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    steerDirection = x < rect.width / 2 ? -1 : 1;
  }

  function onSteerEnd() {
    steerDirection = 0;
  }

  canvas.addEventListener("pointerdown", (e) => onSteerStart(e.clientX));
  canvas.addEventListener("pointermove", (e) => {
    if (e.buttons === 1) onSteerStart(e.clientX);
  });
  canvas.addEventListener("pointerup", onSteerEnd);
  canvas.addEventListener("pointercancel", onSteerEnd);
  canvas.addEventListener("pointerleave", onSteerEnd);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") steerDirection = -1;
    if (e.key === "ArrowRight") steerDirection = 1;
  });
  document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" && steerDirection === -1) steerDirection = 0;
    if (e.key === "ArrowRight" && steerDirection === 1) steerDirection = 0;
  });

  reviveButton.addEventListener("click", () => {
    gameOver = false;
    reviveButton.style.display = "none";
    raceStatus.textContent = "";
    player.x = ROAD_LEFT + ROAD_WIDTH / 2 - 18;
    player.progress = Math.max(0, player.progress - 250);
  });

  function advanceRound() {
    if (wonRound) return;
    wonRound = true;
    round = 2;
    roundDisplay.textContent = "Round 2";
    raceStatus.textContent = "Qualified! Moving to Round 2";
    window.dispatchEvent(new CustomEvent("roundChange", { detail: { round } }));
  }

  function update(dt) {
    if (gameOver || wonRound) return;

    player.x += steerDirection * player.speed * dt;
    player.x = Math.max(ROAD_LEFT, Math.min(ROAD_LEFT + ROAD_WIDTH - player.w, player.x));
    player.progress += 250 * dt;

    for (const car of opponents) {
      car.progress += car.speed * dt;
      car.y += (player.speed - car.speed) * dt * 0.6;
      if (car.y > canvas.height + 80) car.y = -80;
      if (car.y < -100) car.y = canvas.height + 20;
    }

    for (const obstacle of obstacles) {
      obstacle.y += 250 * dt;
      if (obstacle.y > canvas.height + 30) {
        const replacement = createObstacle(0);
        obstacle.x = replacement.x;
        obstacle.y = -40 - Math.random() * 260;
      }
      if (isColliding(player, obstacle)) {
        gameOver = true;
        reviveButton.style.display = "inline-block";
        raceStatus.textContent = "Crash! Watch Ad to Revive";
      }
    }

    const playerPosition = updatePositionDisplay();
    if (player.progress >= FINISH_DISTANCE) {
      if (playerPosition <= 2) {
        advanceRound();
      } else {
        gameOver = true;
        raceStatus.textContent = "Race finished below top 2";
      }
    }
  }

  function drawRoad(offset) {
    ctx.fillStyle = "#2f2f2f";
    ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, canvas.height);
    ctx.fillStyle = "#ffffff";
    for (let i = -1; i < 12; i++) {
      const y = ((i * 80 + offset) % (canvas.height + 80)) - 80;
      ctx.fillRect(canvas.width / 2 - 4, y, 8, 40);
    }
  }

  function drawCar(car) {
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y, car.w, car.h);
    ctx.fillStyle = "#111";
    ctx.fillRect(car.x + 6, car.y + 8, car.w - 12, 12);
  }

  function drawObstacle(obstacle) {
    ctx.fillStyle = "#ff7f2a";
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  }

  let roadOffset = 0;
  function render(dt) {
    roadOffset += 250 * dt;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawRoad(roadOffset);
    for (const obstacle of obstacles) drawObstacle(obstacle);
    for (const car of opponents) drawCar(car);
    drawCar(player);
  }

  function gameLoop(ts) {
    const dt = Math.min(0.033, (ts - lastTime) / 1000);
    lastTime = ts;
    update(dt);
    render(dt);
    requestAnimationFrame(gameLoop);
  }

  updatePositionDisplay();
  requestAnimationFrame(gameLoop);
})();
