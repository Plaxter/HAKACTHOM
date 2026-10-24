(function () {
  "use strict";

  const MOVE_CODES = new Set([
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "KeyW", "KeyA", "KeyS", "KeyD",
  ]);
  const SPEED = 320;
  const NEAR_DISTANCE = 112;
  const SANDBOX_DISTANCE = 96;
  const SPARK_RADIUS = 34;
  const SPARK_COLORS = ["#FFD166", "#43E7FF", "#FF6BD6", "#7CFFCB", "#FF9F5A"];
  const SPARKS = [
    { x: 8, y: 28 },
    { x: 23, y: 16 },
    { x: 42, y: 11 },
    { x: 57, y: 14 },
    { x: 73, y: 11 },
    { x: 88, y: 15 },
    { x: 14, y: 53 },
    { x: 58, y: 87 },
    { x: 31, y: 89 },
  ];

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const compactQuery = window.matchMedia("(max-width: 760px)");
  const touchQuery = window.matchMedia("(hover: none)");

  const position = { x: 0.5, y: 0.88 };
  const view = {
    initialized: false,
    running: false,
    raf: 0,
    lastTs: 0,
    codes: new Set(),
    pad: new Set(),
    nearNode: null,
    nearKey: "",
    moving: false,
    facingLeft: false,
    moved: false,
    firstVisit: true,
    sparkEls: [],
    collected: 0,
    bubbleTimer: 0,
    introTimer: 0,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isCompact() {
    return compactQuery.matches;
  }

  function isTouch() {
    return touchQuery.matches;
  }

  function hasModal() {
    return Boolean(QQ.state.modalStack && QQ.state.modalStack.length);
  }

  function onMap() {
    const screen = $("#screen-map");
    return QQ.state.currentScreen === "screen-map" && Boolean(screen && !screen.hidden);
  }

  function playable() {
    return view.running && onMap() && !isCompact() && !hasModal();
  }

  function isTyping(target) {
    return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function mount() {
    const board = $("#map-board");
    if (!board) return false;

    const avatar = $("#map-avatar", board);
    if (avatar) {
      avatar.innerHTML = `
        <div class="map-avatar-glow"></div>
        <div class="map-avatar-body">${window.QSVG ? window.QSVG.qubi("happy") : ""}</div>
        <span class="map-avatar-tag">Qubi</span>
        <div class="map-qubi-bubble" id="map-qubi-bubble"></div>`;
    }

    const layer = $("#map-sparks", board);
    if (layer) {
      const fragment = document.createDocumentFragment();
      SPARKS.forEach((spark, index) => {
        const el = document.createElement("span");
        el.className = "map-spark";
        el.style.setProperty("--sx", `${spark.x}%`);
        el.style.setProperty("--sy", `${spark.y}%`);
        el.style.setProperty("--spark-color", SPARK_COLORS[index % SPARK_COLORS.length]);
        el.style.animationDelay = `${(index * 0.17).toFixed(2)}s`;
        el.innerHTML = '<span class="spark-halo"></span><svg class="spark-ico" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-spark"/></svg>';
        fragment.appendChild(el);
        view.sparkEls.push({ x: spark.x / 100, y: spark.y / 100, el, collected: false });
      });
      layer.appendChild(fragment);
    }

    updateSparkCounter();
    applyAvatarPosition();
    return true;
  }

  function init() {
    if (view.initialized) return;
    if (!mount()) return;
    view.initialized = true;

    const enter = $("#map-near-enter");
    if (enter) {
      enter.addEventListener("click", (event) => {
        event.preventDefault();
        enterNear();
      });
    }
    $$("#map-dpad [data-dir]").forEach(bindPadButton);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("qq:screen", onScreen);
    window.addEventListener("blur", clearInputs);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearInputs();
    });
    window.addEventListener("resize", () => {
      view.lastTs = 0;
      applyAvatarPosition();
      if (isCompact()) {
        clearInputs();
        setMoving(false);
        clearNear();
      }
    });

    if (onMap()) start();
  }

  function onScreen(event) {
    const id = event.detail && event.detail.id;
    if (id === "screen-map") start();
    else stop();
  }

  function start() {
    if (!view.initialized) return;
    applyAvatarPosition();
    if (!view.running) {
      view.running = true;
      view.lastTs = 0;
      view.raf = requestAnimationFrame(frame);
    }
    if (view.firstVisit) {
      view.firstVisit = false;
      window.clearTimeout(view.introTimer);
      view.introTimer = window.setTimeout(() => {
        if (!onMap() || hasModal() || isCompact()) return;
        say(isTouch() ? "¡Muéveme con la cruceta!" : "¡Muéveme con WASD o las flechas!", 5000);
      }, 700);
    }
  }

  function stop() {
    view.running = false;
    if (view.raf) cancelAnimationFrame(view.raf);
    view.raf = 0;
    view.lastTs = 0;
    window.clearTimeout(view.introTimer);
    clearInputs();
    setMoving(false);
    clearNear();
    hideBubble();
  }

  function frame(ts) {
    if (!view.running) return;
    view.raf = requestAnimationFrame(frame);

    const board = $("#map-board");
    if (!board) return;

    if (!playable()) {
      if (view.codes.size || view.pad.size) clearInputs();
      setMoving(false);
      clearNear();
      return;
    }

    const rect = board.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dt = view.lastTs ? Math.min((ts - view.lastTs) / 1000, 0.05) : 0;
    view.lastTs = ts;

    updateMovement(dt, rect);
    updateNear(rect);
    updateSparks(rect);
  }

  function updateMovement(dt, rect) {
    const left = view.codes.has("ArrowLeft") || view.codes.has("KeyA") || view.pad.has("left");
    const right = view.codes.has("ArrowRight") || view.codes.has("KeyD") || view.pad.has("right");
    const up = view.codes.has("ArrowUp") || view.codes.has("KeyW") || view.pad.has("up");
    const down = view.codes.has("ArrowDown") || view.codes.has("KeyS") || view.pad.has("down");
    let dx = (right ? 1 : 0) - (left ? 1 : 0);
    let dy = (down ? 1 : 0) - (up ? 1 : 0);

    if (!dx && !dy) {
      setMoving(false);
      return;
    }

    const length = Math.hypot(dx, dy);
    dx /= length;
    dy /= length;

    const padX = 50 / rect.width;
    const padTop = 52 / rect.height;
    const padBottom = 66 / rect.height;

    position.x = clamp(position.x + (dx * SPEED * dt) / rect.width, padX, 1 - padX);
    position.y = clamp(position.y + (dy * SPEED * dt) / rect.height, padTop, 1 - padBottom);

    if (dx !== 0) {
      const facingLeft = dx < 0;
      if (facingLeft !== view.facingLeft) {
        view.facingLeft = facingLeft;
        const avatar = $("#map-avatar");
        if (avatar) avatar.classList.toggle("facing-left", facingLeft);
      }
    }

    setMoving(true);
    applyAvatarPosition();

    if (!view.moved) {
      view.moved = true;
      window.clearTimeout(view.introTimer);
      say("¡Así se hace! Acércate a un portal.", 2600);
    }
  }

  function applyAvatarPosition() {
    const avatar = $("#map-avatar");
    if (!avatar) return;
    avatar.style.left = `${(position.x * 100).toFixed(2)}%`;
    avatar.style.top = `${(position.y * 100).toFixed(2)}%`;
    avatar.classList.toggle("bubble-below", position.y < 0.24);
  }

  function setMoving(on) {
    if (view.moving === on) return;
    view.moving = on;
    const avatar = $("#map-avatar");
    if (avatar) avatar.classList.toggle("is-moving", on);
  }

  function updateNear(rect) {
    const layer = $("#map-nodes");
    if (!layer) {
      clearNear();
      return;
    }
    const nodes = $$(".world-node, .sandbox-node", layer);
    if (!nodes.length) {
      clearNear();
      return;
    }

    const px = position.x * rect.width;
    const py = position.y * rect.height;
    let best = null;
    let bestDist = Infinity;

    nodes.forEach((node) => {
      const box = node.getBoundingClientRect();
      const cx = box.left - rect.left + box.width / 2;
      const cy = box.top - rect.top + box.height / 2;
      const distance = Math.hypot(px - cx, py - cy);
      if (distance < bestDist) {
        bestDist = distance;
        best = node;
      }
    });

    const limit = best && best.classList.contains("sandbox-node") ? SANDBOX_DISTANCE : NEAR_DISTANCE;
    if (!best || bestDist > limit) {
      clearNear();
      return;
    }

    const key = best.dataset.level || "sandbox";
    if (view.nearNode === best && view.nearKey === key) return;

    view.nearNode = best;
    view.nearKey = key;
    nodes.forEach((node) => node.classList.toggle("is-near", node === best));
    showPrompt(best);
  }

  function nodeInfo(node) {
    if (node.dataset.level) {
      const nameEl = node.querySelector(".node-name");
      const locked = node.classList.contains("is-locked");
      const complete = node.classList.contains("is-complete");
      return {
        name: nameEl ? nameEl.textContent.trim() : "Portal",
        status: complete
          ? "Restaurado · puedes repetir"
          : locked
            ? "Sellado · restaura el mundo anterior"
            : "Portal disponible",
        locked,
      };
    }
    const nameEl = node.querySelector("strong");
    const detailEl = node.querySelector("small");
    const locked = node.classList.contains("is-locked");
    return {
      name: nameEl ? nameEl.textContent.trim() : "Patio de Juegos",
      status: locked
        ? "Sellado · enciende tu primer portal"
        : detailEl ? detailEl.textContent.trim() : "Zona libre",
      locked,
    };
  }

  function showPrompt(node) {
    const prompt = $("#map-near-prompt");
    if (!prompt) return;
    const info = nodeInfo(node);
    const nameEl = $("#map-near-name");
    const statusEl = $("#map-near-status");
    const enter = $("#map-near-enter");
    if (nameEl) nameEl.textContent = info.name;
    if (statusEl) statusEl.textContent = info.status;
    if (enter) enter.setAttribute("aria-label", `Entrar a ${info.name}`);
    prompt.classList.toggle("is-locked", info.locked);
    prompt.hidden = false;
    const board = $("#map-board");
    if (board) board.classList.add("has-near");
  }

  function clearNear() {
    if (view.nearNode) view.nearNode.classList.remove("is-near");
    view.nearNode = null;
    view.nearKey = "";
    const prompt = $("#map-near-prompt");
    if (prompt) prompt.hidden = true;
    const board = $("#map-board");
    if (board) board.classList.remove("has-near");
  }

  function enterNear() {
    if (!view.nearNode || !view.running || !onMap() || hasModal()) return;
    const node = view.nearNode;
    clearInputs();
    setMoving(false);
    node.click();
  }

  function updateSparks(rect) {
    if (!view.sparkEls.length) return;
    const px = position.x * rect.width;
    const py = position.y * rect.height;
    let picked = 0;

    view.sparkEls.forEach((spark) => {
      if (spark.collected) return;
      const distance = Math.hypot(px - spark.x * rect.width, py - spark.y * rect.height);
      if (distance > SPARK_RADIUS) return;
      spark.collected = true;
      spark.el.classList.add("is-collected");
      view.collected += 1;
      picked += 1;
    });

    if (!picked) return;

    updateSparkCounter();
    const counter = $("#map-spark-counter");
    if (counter) {
      counter.classList.remove("is-bumped");
      void counter.offsetWidth;
      counter.classList.add("is-bumped");
    }

    const allCollected = view.collected === view.sparkEls.length;
    if (window.Sound) window.Sound.play(allCollected ? "success" : "star");
    if (allCollected) {
      if (typeof QQ.confetti === "function") QQ.confetti(90);
      say("¡Todas las chispas! El mapa brilla.", 4200);
    } else {
      say(`¡Chispa ${view.collected} de ${view.sparkEls.length}!`, 1800);
    }
  }

  function updateSparkCounter() {
    const count = $("#map-spark-count");
    const total = $("#map-spark-total");
    if (count) count.textContent = String(view.collected);
    if (total) total.textContent = String(view.sparkEls.length);
  }

  function say(message, duration) {
    if (!onMap() || hasModal() || isCompact()) return;
    const avatar = $("#map-avatar");
    const bubble = $("#map-qubi-bubble");
    if (!avatar || !bubble) return;
    bubble.textContent = message;
    avatar.classList.add("has-bubble");
    window.clearTimeout(view.bubbleTimer);
    view.bubbleTimer = window.setTimeout(() => {
      avatar.classList.remove("has-bubble");
    }, duration || 2600);
  }

  function hideBubble() {
    window.clearTimeout(view.bubbleTimer);
    const avatar = $("#map-avatar");
    if (avatar) avatar.classList.remove("has-bubble");
  }

  function onKeyDown(event) {
    if (!view.running || !onMap() || isCompact()) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (hasModal() || isTyping(event.target)) return;

    if (MOVE_CODES.has(event.code)) {
      event.preventDefault();
      view.codes.add(event.code);
      return;
    }

    if (event.code === "KeyE" || event.key === "e" || event.key === "E") {
      event.preventDefault();
      if (event.repeat) return;
      if (view.nearNode) enterNear();
      else say(isTouch() ? "Acércate a un portal y toca Entrar." : "Acércate a un portal y pulsa E.", 2200);
    }
  }

  function onKeyUp(event) {
    if (MOVE_CODES.has(event.code)) view.codes.delete(event.code);
  }

  function clearInputs() {
    view.codes.clear();
    view.pad.clear();
    $$("#map-dpad [data-dir]").forEach((button) => button.classList.remove("is-pressed"));
  }

  function bindPadButton(button) {
    const dir = button.dataset.dir;
    const press = (event) => {
      if (!view.running || isCompact() || hasModal()) return;
      event.preventDefault();
      view.pad.add(dir);
      button.classList.add("is-pressed");
      if (typeof button.setPointerCapture === "function" && event.pointerId != null) {
        try {
          button.setPointerCapture(event.pointerId);
        } catch (_error) {
          /* la captura es opcional */
        }
      }
    };
    const release = () => {
      view.pad.delete(dir);
      button.classList.remove("is-pressed");
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    button.addEventListener("click", (event) => event.preventDefault());
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  QQ.initMapWorld = init;
})();
