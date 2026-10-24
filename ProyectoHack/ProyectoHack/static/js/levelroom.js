(function () {
  "use strict";

  const QQ = window.QQ;
  if (!QQ) return;

  const MOVE_CODES = new Set([
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
    "KeyW", "KeyA", "KeyS", "KeyD",
  ]);
  const SPEED = 240;
  const GATE_DISTANCE = 86;
  const PORTAL_DISTANCE = 112;
  const GATE_COPY = {
    x: {
      short: "Cambiar",
      what: "El poder X gira el qubit de 0 a 1. Es el interruptor cuántico.",
      meta: "1 qubit · Toca un cable del constructor para colocarlo.",
    },
    h: {
      short: "Superponer",
      what: "El poder H abre dos caminos a la vez: el qubit queda en 0 y 1 al mismo tiempo.",
      meta: "1 qubit · Toca un cable del constructor para colocarlo.",
    },
    z: {
      short: "Girar fase",
      what: "El poder Z gira la fase del qubit. No cambia las probabilidades, pero sí cómo interfieren los caminos.",
      meta: "1 qubit · Toca un cable del constructor para colocarlo.",
    },
    cx: {
      short: "Entrelazar",
      what: "CNOT entrelaza dos qubits: si el control vale 1, invierte el objetivo.",
      meta: "2 qubits · Elige primero el cable de control y luego el objetivo.",
    },
  };
  const POSITIONS = {
    three: [{ x: 15, y: 24 }, { x: 85, y: 24 }, { x: 85, y: 50 }],
    four: [{ x: 15, y: 24 }, { x: 85, y: 24 }, { x: 15, y: 50 }, { x: 85, y: 50 }],
  };

  const $ = QQ.$;
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));
  const touchQuery = window.matchMedia("(hover: none)");

  const position = { x: 0.5, y: 0.88 };
  const view = {
    initialized: false,
    running: false,
    raf: 0,
    lastTs: 0,
    codes: new Set(),
    pad: new Set(),
    level: null,
    gates: [],
    discovered: new Set(),
    near: null,
    nearType: null,
    tipOpen: false,
    activeGate: null,
    returnFocus: null,
    introTimer: 0,
    completeTimer: 0,
    moving: false,
  };

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isTouch() {
    return touchQuery.matches;
  }

  function hasModal() {
    return Boolean(QQ.state.modalStack && QQ.state.modalStack.length);
  }

  function onLevel() {
    const screen = $("#screen-level");
    return QQ.state.currentScreen === "screen-level" && Boolean(screen && !screen.hidden);
  }

  function isTyping(target) {
    return target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
  }

  function gateInfo(id) {
    const gates = (QQ.state.data && QQ.state.data.gates) || {};
    return gates[id] || {
      label: id,
      symbol: id === "cx" ? "CNOT" : id.toUpperCase(),
      color: "var(--cyan)",
    };
  }

  function playable() {
    return view.running
      && onLevel()
      && Boolean(view.level)
      && !hasModal()
      && !view.tipOpen
      && !QQ.state.runBusy;
  }

  function mount(level) {
    if (!level || level.type !== "circuit") return;
    const room = $("#level-room");
    const stage = $("#portal-stage");
    const pedestals = $("#room-pedestals");
    const qubi = $("#room-qubi");
    if (!room || !stage || !pedestals || !qubi) return;

    closeTip(false);
    view.level = level;
    view.discovered.clear();
    view.near = null;
    view.nearType = null;
    view.activeGate = null;
    view.moving = false;
    view.lastTs = 0;
    view.codes.clear();
    view.pad.clear();
    position.x = 0.5;
    position.y = 0.88;

    view.gates = level.qubits >= 2 ? ["x", "h", "z", "cx"] : ["x", "h", "z"];
    const layout = view.gates.length > 3 ? POSITIONS.four : POSITIONS.three;

    stage.classList.add("has-room");
    room.hidden = false;
    qubi.innerHTML = window.QSVG ? window.QSVG.qubi("happy") : "";
    pedestals.innerHTML = view.gates.map((id, index) => {
      const info = gateInfo(id);
      const copy = GATE_COPY[id] || {};
      const spot = layout[index] || layout[0];
      return `
        <button type="button" class="room-pedestal" data-room-gate="${id}"
          style="--gate-color:${info.color};--x:${spot.x}%;--y:${spot.y}%"
          aria-label="Pedestal de ${QQ.esc(info.label)}, poder ${QQ.esc(info.symbol)}. Pulsa para descubrir qué hace.">
          <span class="pedestal-icon" aria-hidden="true">${QQ.esc(info.symbol)}</span>
          <span class="pedestal-name">${QQ.esc(copy.short || info.label)}</span>
          <span class="pedestal-check" aria-hidden="true">✓</span>
        </button>`;
    }).join("");

    $$(".room-pedestal", pedestals).forEach((button) => button.classList.remove("is-discovered"));
    updateCounter();
    clearNear();
    applyPosition();
    start();

    window.clearTimeout(view.introTimer);
    window.clearTimeout(view.completeTimer);
    view.introTimer = window.setTimeout(() => {
      if (!onLevel() || hasModal() || view.tipOpen) return;
      say(
        isTouch()
          ? "Muéveme con la cruceta y toca los pedestales. ¡Descubramos los poderes!"
          : "Muéveme con WASD o las flechas. Acércate a un pedestal y pulsa E.",
        "happy"
      );
    }, 500);
  }

  function init() {
    if (view.initialized) return;
    const room = $("#level-room");
    if (!room) return;
    view.initialized = true;

    const promptButton = $("#room-prompt-btn");
    if (promptButton) promptButton.addEventListener("click", interact);

    const pedestals = $("#room-pedestals");
    if (pedestals) {
      pedestals.addEventListener("click", (event) => {
        const pedestal = event.target.closest("[data-room-gate]");
        if (!pedestal) return;
        event.preventDefault();
        openGate(pedestal.dataset.roomGate, pedestal);
      });
    }

    const portal = $("#room-portal-hit");
    if (portal) portal.addEventListener("click", activatePortal);

    const use = $("#room-tip-use");
    if (use) use.addEventListener("click", useGate);
    const close = $("#room-tip-close");
    if (close) close.addEventListener("click", () => closeTip(true));

    $$("#room-dpad [data-room-dir]").forEach(bindPadButton);

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("qq:screen", onScreen);
    document.addEventListener("pointerdown", onDocPointerDown);
    window.addEventListener("blur", clearInputs);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) clearInputs();
    });
    window.addEventListener("resize", () => {
      view.lastTs = 0;
      applyPosition();
    });

    if (onLevel() && view.level) start();
  }

  function start() {
    if (!view.initialized || !view.level || !onLevel()) return;
    applyPosition();
    if (!view.running) {
      view.running = true;
      view.lastTs = 0;
      view.raf = requestAnimationFrame(frame);
    }
  }

  function stop() {
    view.running = false;
    if (view.raf) cancelAnimationFrame(view.raf);
    view.raf = 0;
    view.lastTs = 0;
    window.clearTimeout(view.introTimer);
    window.clearTimeout(view.completeTimer);
    clearInputs();
    setMoving(false);
    clearNear();
    closeTip(false);
  }

  function onScreen(event) {
    const id = event.detail && event.detail.id;
    if (id === "screen-level") start();
    else stop();
  }

  function frame(ts) {
    if (!view.running) return;
    view.raf = requestAnimationFrame(frame);
    if (!playable()) {
      if (view.codes.size || view.pad.size) clearInputs();
      setMoving(false);
      if (!view.tipOpen) clearNear();
      return;
    }

    const room = $("#level-room");
    const stage = $("#portal-stage");
    if (!room || !stage || room.hidden) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dt = view.lastTs ? Math.min((ts - view.lastTs) / 1000, 0.05) : 0;
    view.lastTs = ts;

    updateMovement(dt, rect);
    updateNear(rect);
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

    const padX = 27 / rect.width;
    const padTop = 60 / rect.height;
    const padBottom = 30 / rect.height;

    position.x = clamp(position.x + (dx * SPEED * dt) / rect.width, padX, 1 - padX);
    position.y = clamp(position.y + (dy * SPEED * dt) / rect.height, padTop, 1 - padBottom);

    setMoving(true);
    applyPosition();
  }

  function applyPosition() {
    const qubi = $("#room-qubi");
    if (!qubi) return;
    qubi.style.left = `${(position.x * 100).toFixed(2)}%`;
    qubi.style.top = `${(position.y * 100).toFixed(2)}%`;
  }

  function setMoving(moving) {
    if (view.moving === moving) return;
    view.moving = moving;
    const qubi = $("#room-qubi");
    if (qubi) qubi.classList.toggle("is-moving", moving);
  }

  function updateNear(rect) {
    const px = position.x * rect.width;
    const py = position.y * rect.height;
    let best = null;
    let bestType = null;
    let bestDistance = Infinity;

    $$(".room-pedestal").forEach((pedestal) => {
      const box = pedestal.getBoundingClientRect();
      const cx = box.left - rect.left + box.width / 2;
      const cy = box.top - rect.top + box.height / 2;
      const distance = Math.hypot(px - cx, py - cy);
      if (distance < bestDistance) {
        best = pedestal;
        bestType = "gate";
        bestDistance = distance;
      }
    });

    const portal = $("#room-portal-hit");
    if (portal) {
      const box = portal.getBoundingClientRect();
      const cx = box.left - rect.left + box.width / 2;
      const cy = box.top - rect.top + box.height / 2;
      const distance = Math.hypot(px - cx, py - cy);
      if (distance < bestDistance) {
        best = portal;
        bestType = "portal";
        bestDistance = distance;
      }
    }

    const limit = bestType === "portal" ? PORTAL_DISTANCE : GATE_DISTANCE;
    if (!best || bestDistance > limit) {
      clearNear();
      return;
    }
    if (view.near === best) return;
    setNear(best, bestType);
  }

  function setNear(element, type) {
    clearNearClasses();
    view.near = element;
    view.nearType = type;
    element.classList.add("is-near");

    const prompt = $("#room-prompt");
    const text = $("#room-prompt-text");
    const button = $("#room-prompt-btn");
    if (type === "portal") {
      if (text) text.textContent = `${isTouch() ? "" : "E · "}Activar el portal`;
      if (button) button.textContent = "Activar";
    } else {
      const gate = element.dataset.roomGate;
      const info = gateInfo(gate);
      if (text) text.textContent = `${isTouch() ? "" : "E · "}Descubrir ${info.symbol}`;
      if (button) button.textContent = "Descubrir";
    }
    if (prompt) prompt.hidden = false;
  }

  function clearNearClasses() {
    $$(".room-pedestal.is-near, .room-portal-hit.is-near").forEach((element) => element.classList.remove("is-near"));
  }

  function clearNear() {
    clearNearClasses();
    const prompt = $("#room-prompt");
    if (prompt) prompt.hidden = true;
    view.near = null;
    view.nearType = null;
  }

  function interact() {
    if (!playable() || !view.near) return;
    if (view.nearType === "portal") activatePortal();
    else if (view.near.dataset.roomGate) openGate(view.near.dataset.roomGate, view.near);
  }

  function openGate(gate, source) {
    if (!onLevel() || hasModal() || QQ.state.runBusy) return;
    const info = gateInfo(gate);
    const copy = GATE_COPY[gate] || { what: "Un poder cuántico para tu circuito.", meta: "" };
    const builder = QQ.state.builders.level;
    view.tipOpen = true;
    view.activeGate = gate;
    view.returnFocus = source || view.near || null;
    clearInputs();
    setMoving(false);
    clearNear();

    const tip = $("#room-tip");
    const icon = $("#room-tip-icon");
    const name = $("#room-tip-name");
    const description = $("#room-tip-desc");
    const meta = $("#room-tip-meta");
    const use = $("#room-tip-use");
    if (tip) {
      tip.style.setProperty("--gate-color", info.color);
      tip.hidden = false;
    }
    if (icon) icon.textContent = info.symbol;
    if (name) name.textContent = `${info.symbol} · ${info.label}`;
    if (description) description.textContent = copy.what;
    if (meta) meta.textContent = copy.meta || "";
    if (use) use.disabled = !builder || builder.locked;

    if (source) source.classList.add("is-discovered");
    view.discovered.add(gate);
    updateCounter();
    if (window.Sound) window.Sound.play("select");
    say(`${info.label}: ${copy.what}`, "happy");
    if (use) use.focus({ preventScroll: true });

    if (view.discovered.size === view.gates.length) {
      const counter = $("#room-counter");
      if (counter) counter.classList.add("is-complete");
      if (typeof QQ.confetti === "function") QQ.confetti(70);
      window.clearTimeout(view.completeTimer);
      view.completeTimer = window.setTimeout(() => {
        if (!onLevel() || view.tipOpen) return;
        say("¡Descubriste todos los poderes! Ahora combínalos en el circuito.", "happy");
      }, 900);
    }
  }

  function useGate() {
    if (!view.tipOpen || !view.activeGate) return;
    const builder = QQ.state.builders.level;
    const gate = view.activeGate;
    closeTip(true);
    if (!builder || builder.locked) return;
    builder.choose(gate);
    if (window.Sound) window.Sound.play("place");
    say("¡Poder elegido! Toca un cable del constructor para colocarlo.", "happy");
    QQ.toast(`Poder ${gateInfo(gate).symbol} seleccionado.`, "success", 2600);
  }

  function closeTip(restoreFocus) {
    if (!view.tipOpen) return;
    view.tipOpen = false;
    view.activeGate = null;
    const tip = $("#room-tip");
    if (tip) tip.hidden = true;
    const target = view.returnFocus;
    view.returnFocus = null;
    if (restoreFocus && target && document.contains(target)) {
      try {
        target.focus({ preventScroll: true });
      } catch (_error) {
        /* el foco es opcional */
      }
    }
  }

  function activatePortal() {
    if (!playable()) return;
    const builder = QQ.state.builders.level;
    if (!builder) return;
    closeTip(false);
    clearInputs();
    setMoving(false);
    clearNear();

    if (!builder.hasOperations()) {
      builder.guide("Coloca al menos un poder en un circuito antes de activar el portal.", "warn");
      QQ.toast("Tu hechizo está vacío. Coloca al menos un poder.", "warn");
      if (window.Sound) window.Sound.play("error");
      say("Aún no hay poderes en tu hechizo. Descubre un pedestal y colócalo en el circuito.", "happy");
      return;
    }

    const run = $("#btn-run");
    if (run && !run.disabled) {
      say("¡El portal está leyendo tu hechizo! No respires todavía.", "happy");
      run.click();
    }
  }

  function updateCounter() {
    const counter = $("#room-counter");
    if (!counter) return;
    const done = view.discovered.size;
    const total = view.gates.length;
    counter.textContent = `Descubiertos ${done}/${total}`;
    counter.classList.toggle("is-complete", total > 0 && done === total);
    counter.setAttribute("aria-label", `Poderes descubiertos: ${done} de ${total}`);
  }

  function say(message, mood) {
    if (!onLevel()) return;
    if (typeof QQ.setLevelQubi === "function") {
      QQ.setLevelQubi(message, mood || "");
      return;
    }
    const text = $("#qubi-line");
    if (text) text.textContent = message;
    const qubi = $("#level-qubi");
    if (qubi && window.QSVG) qubi.innerHTML = window.QSVG.qubi(mood || "");
  }

  function onKeyDown(event) {
    if (!onLevel()) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTyping(event.target)) return;

    if (view.tipOpen) {
      if (event.code === "Escape") {
        event.preventDefault();
        closeTip(true);
      }
      return;
    }
    if (hasModal() || QQ.state.runBusy) return;

    if (MOVE_CODES.has(event.code)) {
      event.preventDefault();
      view.codes.add(event.code);
      return;
    }

    if (event.code === "KeyE") {
      event.preventDefault();
      if (event.repeat) return;
      if (view.near) interact();
      else say(
        isTouch()
          ? "Acércate a un pedestal o al portal y toca la acción."
          : "Acércate a un pedestal o al portal y pulsa E.",
        "happy"
      );
    }
  }

  function onKeyUp(event) {
    if (MOVE_CODES.has(event.code)) view.codes.delete(event.code);
  }

  function clearInputs() {
    view.codes.clear();
    view.pad.clear();
    $$("#room-dpad [data-room-dir]").forEach((button) => button.classList.remove("is-pressed"));
  }

  function onDocPointerDown(event) {
    if (!view.tipOpen) return;
    const tip = $("#room-tip");
    if (tip && !tip.contains(event.target)) closeTip(false);
  }

  function bindPadButton(button) {
    const dir = button.dataset.roomDir;
    const press = (event) => {
      if (!onLevel() || hasModal() || view.tipOpen || QQ.state.runBusy) return;
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

  QQ.mountLevelRoom = mount;
  QQ.initLevelRoom = init;
})();
