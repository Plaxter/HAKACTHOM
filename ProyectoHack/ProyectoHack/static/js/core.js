(function () {
  "use strict";

  const QQ = window.QQ = window.QQ || {};
  const SAVE_KEY = "quantumquest.save.v2"; // conserva las partidas creadas antes del cambio de nombre
  const SCREENS = ["screen-intro", "screen-map", "screen-level", "screen-qml", "screen-sandbox"];
  const GATE_HELP = {
    x: "Interruptor cuántico: convierte |0⟩ en |1⟩.",
    h: "Crea dos caminos a la vez: superposición.",
    z: "Cambia la fase. Invisible hasta que interfieres.",
    cx: "Entrelaza dos qubits: el control decide al objetivo.",
  };

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  const state = QQ.state = {
    data: null,
    save: null,
    currentScreen: "screen-intro",
    activeLevel: null,
    builders: { level: null, sandbox: null },
    modalStack: [],
    hintIndex: 0,
    hintsThisVisit: 0,
    qmlRewardedThisVisit: false,
    qmlResultShown: false,
    finaleTimer: null,
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function cleanName(raw) {
    const name = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 14);
    return name || "Cadete";
  }

  function formatDate(iso) {
    try {
      return new Intl.DateTimeFormat("es", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
    } catch (_error) {
      return "Hoy";
    }
  }

  function formatNumber(value) {
    const number = Number(value) || 0;
    return Math.round(number).toLocaleString("es");
  }

  async function postJson(url, payload) {
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
    } catch (_error) {
      throw new Error("No pudimos contactar al simulador cuántico. Revisa tu conexión.");
    }
    let data = {};
    try {
      data = await response.json();
    } catch (_error) {
      throw new Error("El servidor envió una respuesta inesperada.");
    }
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "El simulador cuántico no pudo completar la operación.");
    }
    return data;
  }

  function toast(message, type, timeout) {
    const root = $("#toast-root");
    if (!root) return;
    const tone = type || "info";
    const icons = { success: "i-check", warn: "i-info", error: "i-close", info: "i-spark" };
    while (root.children.length >= 4) root.firstElementChild.remove();
    const node = document.createElement("div");
    node.className = "toast " + tone;
    node.innerHTML = `<span class="toast-icon"><svg><use href="#${icons[tone] || "i-info"}"/></svg></span><span>${esc(message)}</span>`;
    root.appendChild(node);
    window.setTimeout(() => {
      node.classList.add("is-leaving");
      window.setTimeout(() => node.remove(), 280);
    }, timeout || 3400);
  }

  QQ.$ = $;
  QQ.$$ = $$;
  QQ.esc = esc;
  QQ.clamp = clamp;
  QQ.wait = wait;
  QQ.cleanName = cleanName;
  QQ.formatDate = formatDate;
  QQ.formatNumber = formatNumber;
  QQ.postJson = postJson;
  QQ.toast = toast;

  /* ---------- Save data ---------- */
  function newSave(name) {
    const now = new Date().toISOString();
    return {
      version: 2,
      name: cleanName(name),
      createdAt: now,
      lastPlayed: now,
      energy: state.data ? state.data.start_energy : 20,
      xp: 0,
      levels: {},
      badges: [],
      qml: { trained: false, accuracy: 0, theta: 0 },
      sandbox: { visited: false, completed: [] },
      stats: { runs: 0, hints: 0, portals: 0 },
      flags: { started: true, finaleShown: false },
      settings: { sound: !window.Sound || window.Sound.isEnabled() },
    };
  }

  function sanitizeSave(raw) {
    if (!raw || typeof raw !== "object") return null;
    const save = newSave(raw.name);
    save.createdAt = typeof raw.createdAt === "string" ? raw.createdAt : save.createdAt;
    save.lastPlayed = typeof raw.lastPlayed === "string" ? raw.lastPlayed : save.lastPlayed;
    save.energy = clamp(Number(raw.energy) || 0, 0, 100);
    save.xp = Math.max(0, Number(raw.xp) || 0);
    save.levels = {};
    if (raw.levels && typeof raw.levels === "object") {
      const known = new Set((state.data ? state.data.levels : []).map((level) => level.id));
      Object.keys(raw.levels).forEach((id) => {
        if (known.size && !known.has(id)) return;
        const record = raw.levels[id];
        if (!record || typeof record !== "object") return;
        save.levels[id] = {
          cleared: Boolean(record.cleared),
          stars: clamp(Math.round(Number(record.stars) || 0), 0, 3),
          plays: Math.max(0, Math.round(Number(record.plays) || 0)),
          bestGates: Number.isFinite(Number(record.bestGates)) ? Math.max(0, Math.round(Number(record.bestGates))) : null,
          hintsUsed: Math.max(0, Math.round(Number(record.hintsUsed) || 0)),
          clearedAt: typeof record.clearedAt === "string" ? record.clearedAt : null,
        };
      });
    }
    const validBadges = new Set(state.data ? Object.keys(state.data.badges || {}) : []);
    save.badges = Array.isArray(raw.badges)
      ? Array.from(new Set(raw.badges.filter((id) => typeof id === "string" && (!validBadges.size || validBadges.has(id)))))
      : [];
    if (raw.qml && typeof raw.qml === "object") {
      save.qml = {
        trained: Boolean(raw.qml.trained),
        accuracy: clamp(Number(raw.qml.accuracy) || 0, 0, 1),
        theta: Number(raw.qml.theta) || 0,
      };
    }
    if (raw.sandbox && typeof raw.sandbox === "object") {
      const validChallenges = new Set(["zeros", "four-ways", "bell", "ghz"]);
      save.sandbox = {
        visited: Boolean(raw.sandbox.visited),
        completed: Array.isArray(raw.sandbox.completed)
          ? Array.from(new Set(raw.sandbox.completed.filter((id) => validChallenges.has(id))))
          : [],
      };
    }
    if (raw.stats && typeof raw.stats === "object") {
      save.stats = {
        runs: Math.max(0, Math.round(Number(raw.stats.runs) || 0)),
        hints: Math.max(0, Math.round(Number(raw.stats.hints) || 0)),
        portals: Math.max(0, Math.round(Number(raw.stats.portals) || 0)),
      };
    }
    if (raw.flags && typeof raw.flags === "object") {
      save.flags = {
        started: raw.flags.started !== false,
        finaleShown: Boolean(raw.flags.finaleShown),
      };
    }
    if (raw.settings && typeof raw.settings === "object") {
      save.settings = { sound: raw.settings.sound !== false };
    }
    return save;
  }

  function loadSave() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return sanitizeSave(JSON.parse(raw));
    } catch (_error) {
      return null;
    }
  }

  function persist() {
    if (!state.save) return;
    state.save.lastPlayed = new Date().toISOString();
    state.save.version = 2;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(state.save));
    } catch (_error) {
      toast("No pudimos guardar el progreso en este navegador.", "warn");
    }
  }

  function getRecord(id) {
    return state.save && state.save.levels[id] ? state.save.levels[id] : null;
  }

  function ensureRecord(id) {
    if (!state.save.levels[id]) {
      state.save.levels[id] = {
        cleared: false,
        stars: 0,
        plays: 0,
        bestGates: null,
        hintsUsed: 0,
        clearedAt: null,
      };
    }
    return state.save.levels[id];
  }

  function levelById(id) {
    return state.data ? state.data.levels.find((level) => level.id === id) : null;
  }

  function firstPending() {
    if (!state.data) return null;
    return state.data.levels.find((level) => {
      const record = getRecord(level.id);
      return !record || !record.cleared;
    }) || null;
  }

  function isUnlocked(level) {
    if (!level) return false;
    const record = getRecord(level.id);
    if (record && record.cleared) return true;
    const pending = firstPending();
    return Boolean(pending && pending.id === level.id);
  }

  function isSandboxUnlocked() {
    if (!state.data || !state.data.levels.length) return false;
    const first = getRecord(state.data.levels[0].id);
    return Boolean(first && first.cleared);
  }

  function allClear() {
    if (!state.data) return false;
    return state.data.levels.every((level) => {
      const record = getRecord(level.id);
      return Boolean(record && record.cleared);
    });
  }

  function totalStars() {
    if (!state.data) return 0;
    return state.data.levels.reduce((sum, level) => {
      const record = getRecord(level.id);
      return sum + (record ? record.stars : 0);
    }, 0);
  }

  function circuitLevels() {
    return state.data ? state.data.levels.filter((level) => level.type === "circuit") : [];
  }

  function perfectConstellation() {
    const circuits = circuitLevels();
    return circuits.length > 0 && circuits.every((level) => {
      const record = getRecord(level.id);
      return Boolean(record && record.cleared && record.stars === 3);
    });
  }

  function rankFor(xp) {
    const ranks = state.data ? state.data.ranks : [];
    if (!ranks.length) return { current: { name: "Cadete", min_xp: 0 }, next: null, progress: 0 };
    let index = 0;
    ranks.forEach((rank, i) => {
      if (xp >= rank.min_xp) index = i;
    });
    const current = ranks[index];
    const next = ranks[index + 1] || null;
    const span = next ? Math.max(1, next.min_xp - current.min_xp) : 1;
    const progress = next ? clamp((xp - current.min_xp) / span, 0, 1) : 1;
    return { current, next, progress };
  }

  function syncHud() {
    if (!state.save) return;
    const energy = clamp(Math.round(state.save.energy), 0, 100);
    const rank = rankFor(state.save.xp);
    const energyValue = $("#energy-value");
    if (energyValue) energyValue.textContent = `${energy}%`;
    const energyFill = $("#energy-fill");
    if (energyFill) energyFill.style.width = `${energy}%`;
    const rankName = $("#rank-name");
    if (rankName) rankName.textContent = rank.current.name;
    const xpValue = $("#xp-value");
    if (xpValue) xpValue.textContent = `${formatNumber(state.save.xp)} XP`;
    const xpFill = $("#xp-fill");
    if (xpFill) xpFill.style.width = `${Math.round(rank.progress * 100)}%`;
    const badgeCount = $("#badge-count");
    if (badgeCount) badgeCount.textContent = String(state.save.badges.length);
    const mapName = $("#map-name");
    if (mapName) mapName.textContent = state.save.name;
  }

  function applySoundSetting() {
    const enabled = state.save ? state.save.settings.sound !== false : true;
    if (window.Sound) window.Sound.setEnabled(enabled);
    document.body.classList.toggle("sound-off", !enabled);
    $$("[data-sound]").forEach((button) => {
      button.setAttribute("aria-pressed", String(enabled));
      button.setAttribute("aria-label", enabled ? "Desactivar sonido" : "Activar sonido");
      button.title = enabled ? "Desactivar sonido" : "Activar sonido";
    });
  }

  function toggleSound() {
    const enabled = !(window.Sound && window.Sound.isEnabled());
    if (window.Sound) window.Sound.setEnabled(enabled);
    document.body.classList.toggle("sound-off", !enabled);
    if (state.save) {
      state.save.settings.sound = enabled;
      persist();
    }
    applySoundSetting();
    if (enabled && window.Sound) window.Sound.play("click");
    toast(enabled ? "Sonido activado." : "Sonido silenciado.", "info", 1800);
  }

  QQ.getSave = () => state.save;
  QQ.setSave = (save) => { state.save = save; };
  QQ.newSave = newSave;
  QQ.loadSave = loadSave;
  QQ.persist = persist;
  QQ.getRecord = getRecord;
  QQ.ensureRecord = ensureRecord;
  QQ.levelById = levelById;
  QQ.firstPending = firstPending;
  QQ.isUnlocked = isUnlocked;
  QQ.isSandboxUnlocked = isSandboxUnlocked;
  QQ.allClear = allClear;
  QQ.totalStars = totalStars;
  QQ.perfectConstellation = perfectConstellation;
  QQ.rankFor = rankFor;
  QQ.syncHud = syncHud;
  QQ.applySoundSetting = applySoundSetting;
  QQ.toggleSound = toggleSound;

  /* ---------- Badges ---------- */
  function awardBadge(id, options) {
    const silent = options && options.silent;
    if (!id || !state.save || state.save.badges.includes(id)) return false;
    state.save.badges.push(id);
    persist();
    syncHud();
    if (!silent) {
      const badge = state.data && state.data.badges ? state.data.badges[id] : null;
      if (window.Sound) window.Sound.play("badge");
      toast(`Insignia desbloqueada: ${badge ? badge.name : id}`, "success", 4600);
    }
    return true;
  }

  function checkDerivedBadges() {
    const awarded = [];
    if (perfectConstellation() && awardBadge("perfect-constellation", { silent: true })) {
      awarded.push("perfect-constellation");
    }
    return awarded;
  }

  QQ.awardBadge = awardBadge;
  QQ.checkDerivedBadges = checkDerivedBadges;

  /* ---------- Modal stack ---------- */
  function focusableIn(modal) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', modal)
      .filter((element) => element.offsetParent !== null || element === document.activeElement);
  }

  function openModal(html, options) {
    const config = options || {};
    const root = $("#modal-root");
    if (!root) return null;
    const backdrop = document.createElement("div");
    backdrop.className = "modal-backdrop";
    const modal = document.createElement("div");
    modal.className = "modal " + (config.size || "") + (config.className ? " " + config.className : "");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("tabindex", "-1");
    modal.innerHTML = `
      ${config.closable === false ? "" : '<button type="button" class="modal-close" data-modal-close aria-label="Cerrar"><svg><use href="#i-close"/></svg></button>'}
      ${html}
    `;
    backdrop.appendChild(modal);
    const active = document.activeElement;
    const record = {
      backdrop,
      modal,
      previousFocus: active instanceof HTMLElement ? active : null,
      onClose: config.onClose,
      closed: false,
    };
    record.close = () => closeModal(record);
    state.modalStack.push(record);
    document.body.style.overflow = "hidden";

    root.appendChild(backdrop);
    $$("[data-modal-close]", modal).forEach((button) => button.addEventListener("click", record.close));
    backdrop.addEventListener("mousedown", (event) => {
      if (event.target === backdrop) record.close();
    });
    modal.addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const focusables = focusableIn(modal);
      if (!focusables.length) {
        event.preventDefault();
        modal.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    requestAnimationFrame(() => {
      const preferred = $("[data-autofocus]", modal) || $(".btn-primary", modal) || focusableIn(modal)[0] || modal;
      if (preferred && preferred.focus) preferred.focus({ preventScroll: true });
    });
    return record;
  }

  function closeModal(record) {
    const target = record || state.modalStack[state.modalStack.length - 1];
    if (!target || target.closed) return;
    target.closed = true;
    const index = state.modalStack.indexOf(target);
    if (index >= 0) state.modalStack.splice(index, 1);
    target.backdrop.remove();
    if (!state.modalStack.length) document.body.style.overflow = "";
    if (target.previousFocus && document.contains(target.previousFocus)) {
      try { target.previousFocus.focus({ preventScroll: true }); } catch (_error) { /* noop */ }
    }
    if (typeof target.onClose === "function") target.onClose();
  }

  function closeAllModals(silent) {
    const stack = state.modalStack.slice().reverse();
    state.modalStack.length = 0;
    stack.forEach((record) => {
      if (record.closed) return;
      record.closed = true;
      record.backdrop.remove();
      if (!silent && typeof record.onClose === "function") record.onClose();
    });
    document.body.style.overflow = "";
  }

  QQ.openModal = openModal;
  QQ.closeModal = closeModal;
  QQ.closeAllModals = closeAllModals;

  /* ---------- Navigation ---------- */
  function showScreen(id) {
    SCREENS.forEach((screenId) => {
      const screen = document.getElementById(screenId);
      if (!screen) return;
      const visible = screenId === id;
      screen.hidden = !visible;
      screen.classList.toggle("screen-animate", visible);
    });
    state.currentScreen = id;
    document.dispatchEvent(new CustomEvent("qq:screen", { detail: { id } }));
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (id === "screen-map") syncHud();
  }

  function showMap() {
    state.activeLevel = null;
    renderMap();
    syncHud();
    showScreen("screen-map");
  }

  function showIntro() {
    updateIntro();
    showScreen("screen-intro");
  }

  QQ.showScreen = showScreen;
  QQ.showMap = showMap;
  QQ.showIntro = showIntro;

  /* ---------- Intro ---------- */
  function updateIntro() {
    const hasSave = Boolean(state.save);
    const nameInput = $("#cadet-name");
    const label = $('label[for="cadet-name"]');
    const startLabel = $("#btn-start span");
    const continueRow = $("#continue-row");
    const continueBtn = $("#btn-continue");
    if (nameInput) {
      nameInput.hidden = hasSave;
      if (!hasSave) nameInput.value = "";
    }
    if (label) label.hidden = hasSave;
    if (startLabel) startLabel.textContent = hasSave ? "Continuar la aventura" : "Iniciar aventura";
    if (continueRow) continueRow.hidden = !hasSave;
    if (continueBtn) continueBtn.hidden = true;
    const newGameBtn = $("#btn-new-game");
    if (newGameBtn) newGameBtn.hidden = !hasSave;
    const introQubi = $("#intro-qubi");
    if (introQubi && !introQubi.innerHTML.trim()) introQubi.innerHTML = window.QSVG ? window.QSVG.qubi("happy") : "";
    const liveChip = $(".live-chip");
    if (liveChip && state.data && state.data.quantum) {
      liveChip.title = `Qiskit ${state.data.quantum.qiskit} · Aer ${state.data.quantum.aer}`;
    }
    const footnote = $(".intro-footnote");
    if (footnote && state.data && state.data.quantum) {
      footnote.textContent = `Cada portal se abre ejecutando un circuito real en Qiskit ${state.data.quantum.qiskit} + Aer.`;
    }
  }

  function startFromIntro() {
    if (window.Sound) { window.Sound.unlock(); window.Sound.play("click"); }
    if (state.save) {
      showMap();
      return;
    }
    const name = cleanName($("#cadet-name") ? $("#cadet-name").value : "");
    state.save = newSave(name);
    persist();
    applySoundSetting();
    updateIntro();
    syncHud();
    showMap();
    if (window.Sound) window.Sound.play("success");
    toast(`¡Bienvenido, ${state.save.name}! El universo te necesita.`, "success", 4200);
  }

  function resetGame(name) {
    closeAllModals(true);
    if (window.QLab) window.QLab.hardReset();
    state.builders = { level: null, sandbox: null };
    state.activeLevel = null;
    state.hintIndex = 0;
    state.hintsThisVisit = 0;
    state.qmlRewardedThisVisit = false;
    state.qmlResultShown = false;
    state.save = newSave(cleanName(name));
    persist();
    applySoundSetting();
    updateIntro();
    syncHud();
    showMap();
    if (window.Sound) window.Sound.play("success");
    toast(`Nueva partida lista, ${state.save.name}.`, "success");
  }

  QQ.showIntro = showIntro;
  QQ.resetGame = resetGame;

  function openNewGameConfirm() {
    const currentName = state.save ? state.save.name : "";
    const record = openModal(`
      <div class="modal-header">
        <p class="eyebrow">Nueva partida</p>
        <h2>¿Empezar de cero?</h2>
        <p>Se borrarán los portales restaurados, las estrellas y las insignias guardadas en este navegador.</p>
      </div>
      <div class="modal-body">
        <label class="range-label" for="new-cadet-name">Nombre de cadete</label>
        <input id="new-cadet-name" class="text-input" maxlength="14" autocomplete="off" value="${esc(currentName)}" placeholder="Ej. Luna" data-autofocus>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" data-modal-close>Cancelar</button>
          <button type="button" class="btn btn-primary" data-confirm-reset>
            <svg class="btn-icon"><use href="#i-refresh"/></svg><span>Crear nueva partida</span>
          </button>
        </div>
      </div>
    `, { size: "small" });
    if (!record) return;
    const confirm = $("[data-confirm-reset]", record.modal);
    const input = $("#new-cadet-name", record.modal);
    if (confirm) {
      confirm.addEventListener("click", () => {
        const name = cleanName(input ? input.value : currentName);
        record.close();
        resetGame(name);
      });
    }
    if (input) {
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          if (confirm) confirm.click();
        }
      });
    }
  }

  QQ.openNewGameConfirm = openNewGameConfirm;

  /* ---------- Map ---------- */
  function nodeStarsHtml(count) {
    return window.QSVG ? window.QSVG.stars(count) : "";
  }

  function renderMap() {
    if (!state.data || !state.save) return;
    const container = $("#map-nodes");
    if (!container) return;
    const pending = firstPending();
    const levelsHtml = state.data.levels.map((level) => {
      const record = getRecord(level.id);
      const cleared = Boolean(record && record.cleared);
      const isNext = !cleared && pending && pending.id === level.id;
      const locked = !cleared && !isNext;
      const classes = ["world-node"];
      if (cleared) classes.push("is-complete");
      else if (isNext) classes.push("is-next");
      else classes.push("is-locked");
      const status = cleared
        ? `<span class="status-done">Restaurado</span>`
        : isNext
          ? `<span class="status-next">Portal disponible</span>`
          : `<span class="status-locked">Sellado</span>`;
      const corner = cleared
        ? `<span class="node-check"><svg><use href="#i-check"/></svg></span>`
        : locked
          ? `<span class="node-lock-icon"><svg><use href="#i-lock"/></svg></span>`
          : "";
      return `
        <button type="button" class="${classes.join(" ")}" style="--x:${level.map.x}%;--y:${level.map.y}%" data-level="${level.id}" aria-label="Mundo ${level.index}: ${esc(level.name)}${locked ? " (sellado)" : ""}">
          <span class="node-art">
            <span class="node-halo"></span>
            ${window.QSVG ? window.QSVG.worldArt(level.map.icon, level.map.primary, level.map.secondary) : ""}
            ${corner}
          </span>
          <span class="node-plate">
            <span class="node-kicker">Mundo ${level.index}</span>
            <span class="node-name">${esc(level.name)}</span>
            ${cleared ? nodeStarsHtml(record.stars || 0) : ""}
            <span class="node-status">${status}</span>
          </span>
        </button>`;
    }).join("");

    const sandboxUnlocked = isSandboxUnlocked();
    const completed = state.save.sandbox ? state.save.sandbox.completed.length : 0;
    const sandboxHtml = `
      <button type="button" class="sandbox-node${sandboxUnlocked ? "" : " is-locked"}" data-sandbox aria-label="Patio de Juegos Cuánticos${sandboxUnlocked ? "" : " (sellado)"}">
        <span class="mini-orb"><svg><use href="${sandboxUnlocked ? "#i-compass" : "#i-lock"}"/></svg></span>
        <span>
          <strong>Patio de Juegos</strong>
          <small>${sandboxUnlocked ? `Retos ${completed} / 4` : "Restaura el primer portal"}</small>
        </span>
      </button>`;
    container.innerHTML = levelsHtml + sandboxHtml;

    const clearedCount = state.data.levels.filter((level) => {
      const record = getRecord(level.id);
      return record && record.cleared;
    }).length;
    const progress = (clearedCount / Math.max(1, state.data.levels.length)) * 100;
    const route = $("#route-lit");
    if (route) route.style.clipPath = `inset(0 ${Math.max(0, 100 - progress)}% 0 0)`;
    const pips = $("#world-pips");
    if (pips) {
      pips.innerHTML = state.data.levels.map((level) => {
        const record = getRecord(level.id);
        const cleared = record && record.cleared;
        const current = pending && pending.id === level.id;
        return `<span class="world-pip ${cleared ? "done" : current ? "current" : ""}" title="${esc(level.name)}"></span>`;
      }).join("");
    }
    const progressValue = $("#map-progress-value");
    if (progressValue) progressValue.textContent = `${clearedCount} / ${state.data.levels.length} mundos`;

    const nextName = $("#next-portal-name");
    const nextGoal = $("#next-portal-goal");
    const nextBtn = $("#btn-next-portal");
    if (pending) {
      if (nextName) nextName.textContent = pending.name;
      if (nextGoal) nextGoal.textContent = pending.goal_chip || pending.tagline;
      if (nextBtn) nextBtn.innerHTML = `<span>Entrar al portal</span><svg class="btn-icon"><use href="#i-arrow-right"/></svg>`;
    } else {
      if (nextName) nextName.textContent = "¡Academia restaurada!";
      if (nextGoal) nextGoal.textContent = "Los seis guardianes celebran contigo.";
      if (nextBtn) nextBtn.innerHTML = `<span>Ver mi certificado</span><svg class="btn-icon"><use href="#i-certificate"/></svg>`;
    }
    syncHud();
  }

  QQ.renderMap = renderMap;

  function denyNode(node) {
    if (!node) return;
    node.classList.remove("is-denied");
    void node.offsetWidth;
    node.classList.add("is-denied");
    window.setTimeout(() => node.classList.remove("is-denied"), 520);
  }

  function openBriefing(level) {
    if (!level) return;
    if (!isUnlocked(level)) {
      toast("Ese portal sigue sellado. Restaura el mundo anterior.", "warn");
      if (window.Sound) window.Sound.play("error");
      return;
    }
    const record = getRecord(level.id);
    const isReplay = Boolean(record && record.cleared);
    const primary = level.theme.primary;
    const secondary = level.theme.secondary;
    const reward = level.reward || { xp: 0, energy: 0 };
    const isQml = level.type === "qml";
    const typeLabel = isQml ? "Laboratorio de QML" : `Mundo ${level.index} · ${level.qubits} qubit${level.qubits > 1 ? "s" : ""}`;
    const recordHtml = isReplay
      ? `<div class="briefing-tip"><svg><use href="#i-star"/></svg> Ya lo restauraste · mejor marca ${record.stars || 0} / 3 estrellas</div>`
      : `<div class="briefing-tip"><svg><use href="#i-info"/></svg> Primera recompensa: ${reward.xp} XP y +${reward.energy}% de energía.</div>`;

    const modal = openModal(`
      <div class="briefing" style="--accent:${primary};--accent-2:${secondary}">
        <div class="briefing-hero">
          <div class="briefing-planet">${window.QSVG ? window.QSVG.worldArt(level.map.icon, primary, secondary) : ""}</div>
          <div class="briefing-title-wrap">
            <p class="eyebrow">${esc(typeLabel)}</p>
            <h2>${esc(level.name)}</h2>
            <p class="tagline">${esc(level.tagline)}</p>
            <div class="guardian-line">
              <span class="mini-guardian">${window.QSVG ? window.QSVG.guardian(level) : ""}</span>
              <span><strong>${esc(level.guardian)}</strong> · ${esc(level.guardian_role)}</span>
            </div>
          </div>
        </div>
        <div class="briefing-body">
          <p class="briefing-story">${esc(level.story)}</p>
          <div class="briefing-mission">
            <span class="briefing-mission-icon"><svg><use href="#i-target"/></svg></span>
            <div><span>Tu misión</span><p>${esc(level.mission)}</p></div>
          </div>
          <div class="briefing-rewards">
            <span class="briefing-reward"><svg><use href="#i-star"/></svg>${reward.xp} XP</span>
            <span class="briefing-reward"><svg><use href="#i-bolt"/></svg>+${reward.energy}% energía</span>
            ${level.badge ? `<span class="briefing-reward"><svg><use href="#i-medal"/></svg>Insignia secreta</span>` : ""}
            <span class="briefing-reward"><svg><use href="#i-check"/></svg>${isQml ? "Precisión 100%" : `${level.qubits} qubit${level.qubits > 1 ? "s" : ""}`}</span>
          </div>
          ${recordHtml}
          <div class="briefing-actions">
            <div class="briefing-lock"><svg><use href="#i-chip"/></svg> Circuito real en Qiskit + Aer</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <button type="button" class="btn btn-ghost" data-modal-close>Quizá luego</button>
              <button type="button" class="btn btn-primary" data-enter-world data-autofocus>
                <span>${isReplay ? "Volver a jugar" : isQml ? "Entrar al laboratorio" : "Entrar al portal"}</span>
                <svg class="btn-icon"><use href="#i-arrow-right"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    `, { className: "briefing-modal" });

    if (!modal) return;
    const enter = $("[data-enter-world]", modal.modal);
    if (enter) {
      enter.addEventListener("click", () => {
        modal.close();
        if (isQml) {
          if (typeof QQ.openQml === "function") QQ.openQml(level);
        } else if (typeof QQ.openLevel === "function") {
          QQ.openLevel(level);
        }
      });
    }
  }

  QQ.openBriefing = openBriefing;

  /* ---------- Diary ---------- */
  function openDiary() {
    if (!state.data || !state.save) return;
    const save = state.save;
    const cleared = state.data.levels.filter((level) => {
      const record = getRecord(level.id);
      return record && record.cleared;
    }).length;
    const stars = totalStars();
    const maxStars = state.data.levels.length * 3;
    const badgesHtml = Object.keys(state.data.badges).map((id) => {
      const badge = state.data.badges[id];
      const earned = save.badges.includes(id);
      return `
        <article class="badge-card ${earned ? "is-earned" : "is-locked"}">
          <div class="badge-icon">${window.QSVG ? window.QSVG.badge(id) : ""}</div>
          <strong>${esc(badge.name)}</strong>
          <small>${esc(badge.description)}</small>
        </article>`;
    }).join("");
    const modal = openModal(`
      <div class="modal-header">
        <p class="eyebrow">Bitácora de ${esc(save.name)}</p>
        <h2>Mi diario cuántico</h2>
        <p>Cada portal que despiertas deja una huella en la Academia.</p>
      </div>
      <div class="modal-body">
        <div class="achievements-stats">
          <div class="stat-card"><span>Mundos</span><strong>${cleared} / ${state.data.levels.length}</strong></div>
          <div class="stat-card"><span>Estrellas</span><strong>${stars} / ${maxStars}</strong></div>
          <div class="stat-card"><span>Insignias</span><strong>${save.badges.length} / ${Object.keys(state.data.badges).length}</strong></div>
          <div class="stat-card"><span>Experiencia</span><strong>${formatNumber(save.xp)} XP</strong></div>
        </div>
        <div class="badge-grid">${badgesHtml}</div>
        <div class="diary-footer">
          <button type="button" class="btn btn-ghost btn-small diary-reset" data-diary-reset>
            <svg class="btn-icon"><use href="#i-refresh"/></svg><span>Empezar de nuevo</span>
          </button>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${allClear() ? '<button type="button" class="btn btn-ghost btn-small" data-diary-cert><svg class="btn-icon"><use href="#i-certificate"/></svg><span>Mi certificado</span></button>' : ""}
            <button type="button" class="btn btn-primary btn-small" data-modal-close>Volver</button>
          </div>
        </div>
      </div>
    `, { className: "diary-modal" });
    if (!modal) return;
    const reset = $("[data-diary-reset]", modal.modal);
    if (reset) reset.addEventListener("click", openNewGameConfirm);
    const cert = $("[data-diary-cert]", modal.modal);
    if (cert) {
      cert.addEventListener("click", () => {
        modal.close();
        openCertificate();
      });
    }
  }

  QQ.openDiary = openDiary;

  /* ---------- Help ---------- */
  function openHelp() {
    if (!state.data) return;
    const gates = state.data.gates || {};
    const gateOrder = ["x", "h", "z", "cx"];
    const cheats = gateOrder.map((id) => {
      const gate = gates[id] || { label: id, symbol: id.toUpperCase(), color: "#43E7FF" };
      return `
        <div class="gate-cheat">
          <span class="mini-gate" style="--gc:${gate.color}">${esc(gate.symbol)}</span>
          <div><strong>${esc(gate.label)}</strong><small>${esc(GATE_HELP[id])}</small></div>
        </div>`;
    }).join("");
    const quantum = state.data.quantum || {};
    openModal(`
      <div class="modal-header">
        <p class="eyebrow">Guía de cadete</p>
        <h2>Cómo se juega</h2>
        <p>Construye un hechizo cuántico, activa el portal y descubre qué decidió el universo.</p>
      </div>
      <div class="modal-body">
        <div class="help-steps">
          <div class="help-step"><span class="help-step-num">1</span><div><strong>Explora la Academia</strong><p>Mueve a Qubi con WASD, las flechas o la cruceta táctil. Acércate a un portal y pulsa E para entrar; también puedes tocar cualquier portal.</p></div></div>
          <div class="help-step"><span class="help-step-num">2</span><div><strong>Explora la sala del mundo</strong><p>Dentro de cada nivel, mueve a Qubi y visita los pedestales de X, H, Z y CNOT. Pulsa E para descubrir qué hace cada poder y llévalo al constructor con “Usar poder”.</p></div></div>
          <div class="help-step"><span class="help-step-num">3</span><div><strong>Arma tu circuito</strong><p>Toca un poder y colócalo en un cable de qubit. CNOT necesita un control y un objetivo.</p></div></div>
          <div class="help-step"><span class="help-step-num">4</span><div><strong>Activa el portal</strong><p>Pulsa el botón o acércate al portal de la sala y pulsa E. Qiskit ejecuta tu circuito de verdad y mide 1024 veces.</p></div></div>
          <div class="help-step"><span class="help-step-num">5</span><div><strong>Gana estrellas</strong><p>3 estrellas si usas el mínimo de poderes, 2 si añades uno o dos, 1 si usas más.</p></div></div>
        </div>
        <div class="gate-cheatsheet">${cheats}</div>
        <div class="tech-note">
          <strong>Detrás de la magia:</strong> el servidor valida cada circuito y solo permite X, H, Z y CNOT.
          Las probabilidades se calculan con el statevector exacto de Qiskit ${esc(quantum.qiskit || "")} y las barras
          muestran ${quantum.shots || 1024} mediciones de Aer con semilla ${quantum.seed || 7}.
        </div>
        <pre class="code-block"><span class="code-key">from</span> qiskit <span class="code-key">import</span> QuantumCircuit

qc = QuantumCircuit(<span class="code-fn">1</span>)
qc.h(<span class="code-fn">0</span>)          <span class="code-com"># superposición</span>
qc.measure_all()
<span class="code-key">print</span>(qc)</pre>
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" data-modal-close>¡Entendido!</button>
        </div>
      </div>
    `, { className: "help-modal" });
  }

  QQ.openHelp = openHelp;

  /* ---------- Certificate ---------- */
  function openCertificate() {
    if (!state.data || !state.save) return;
    if (!allClear()) {
      toast("Restaura los seis mundos para recibir tu certificado.", "warn");
      return;
    }
    const save = state.save;
    save.flags.finaleShown = true;
    persist();
    if (window.Sound) window.Sound.play("success");
    if (typeof QQ.confetti === "function") QQ.confetti(180);
    const date = formatDate(new Date().toISOString());
    const modal = openModal(`
      <div class="certificate-print">
        <div class="certificate">
          <div class="cert-seal"><svg><use href="#i-certificate"/></svg></div>
          <p class="eyebrow">Academia de los Qubits · Reconoce oficialmente</p>
          <h2 class="cert-title">Héroe cuántico</h2>
          <p class="cert-name">${esc(save.name)}</p>
          <p class="cert-copy">
            Por haber restaurado los seis portales, dominado la superposición, la fase, el entrelazamiento
            y haber entrenado a Qubi con un circuito cuántico real.
          </p>
          <div class="cert-stats">
            <div class="cert-stat"><span>Mundos</span><strong>6 / 6</strong></div>
            <div class="cert-stat"><span>Estrellas</span><strong>${totalStars()} / 18</strong></div>
            <div class="cert-stat"><span>Insignias</span><strong>${save.badges.length} / ${Object.keys(state.data.badges).length}</strong></div>
            <div class="cert-stat"><span>Experiencia</span><strong>${formatNumber(save.xp)} XP</strong></div>
          </div>
          <p class="cert-sign">${date} · Qubi y los guardianes de la Academia</p>
        </div>
      </div>
      <div class="cert-actions">
        <button type="button" class="btn btn-ghost" data-print-cert><svg class="btn-icon"><use href="#i-certificate"/></svg><span>Imprimir o guardar PDF</span></button>
        <button type="button" class="btn btn-primary" data-cert-map>Volver al mapa</button>
      </div>
    `, { className: "cert-modal" });
    if (!modal) return;
    const print = $("[data-print-cert]", modal.modal);
    if (print) print.addEventListener("click", () => window.print());
    const map = $("[data-cert-map]", modal.modal);
    if (map) {
      map.addEventListener("click", () => {
        modal.close();
        if (window.QLab) window.QLab.cancel();
        state.activeLevel = null;
        QQ.showMap();
      });
    }
  }

  QQ.openCertificate = openCertificate;

  function maybeFinale(delay) {
    if (!state.save || !allClear() || state.save.flags.finaleShown) return;
    window.clearTimeout(state.finaleTimer);
    state.finaleTimer = window.setTimeout(() => {
      if (!state.modalStack.length && !state.save.flags.finaleShown) openCertificate();
    }, typeof delay === "number" ? delay : 700);
  }

  QQ.maybeFinale = maybeFinale;

  /* ---------- Ambient canvas ---------- */
  let confettiState = null;

  function initStarfield() {
    const canvas = $("#starfield");
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let stars = [];
    let pointer = { x: 0, y: 0 };
    let targetPointer = { x: 0, y: 0 };
    let shooting = null;
    let lastShooting = 0;

    function build() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      cursorSetTransform(dpr);
      const count = Math.min(230, Math.max(90, Math.floor((width * height) / 11000)));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: 0.35 + Math.random() * 1.35,
        alpha: 0.25 + Math.random() * 0.65,
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.85,
        depth: 0.3 + Math.random() * 1.7,
        hue: Math.random() > 0.86 ? "mint" : Math.random() > 0.7 ? "pink" : "white",
      }));
    }

    function cursorSetTransform(dpr) {
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw(time) {
      context.clearRect(0, 0, width, height);
      pointer.x += (targetPointer.x - pointer.x) * 0.03;
      pointer.y += (targetPointer.y - pointer.y) * 0.03;
      stars.forEach((star) => {
        const twinkle = reduced ? 1 : 0.62 + 0.38 * Math.sin(time * 0.001 * star.speed + star.phase);
        const x = star.x + pointer.x * star.depth * 8;
        const y = star.y + pointer.y * star.depth * 8;
        context.beginPath();
        context.globalAlpha = star.alpha * twinkle;
        context.fillStyle = star.hue === "mint" ? "#7CFFCB" : star.hue === "pink" ? "#FF6BD6" : "#E7E3FF";
        context.arc(x, y, star.radius, 0, Math.PI * 2);
        context.fill();
      });
      context.globalAlpha = 1;
      if (!reduced) {
        if (!shooting && time - lastShooting > 6200 && Math.random() < 0.012) {
          lastShooting = time;
          shooting = {
            x: width * (0.15 + Math.random() * 0.6),
            y: height * (0.08 + Math.random() * 0.25),
            vx: 7 + Math.random() * 4,
            vy: 2.5 + Math.random() * 2,
            life: 1,
          };
        }
        if (shooting) {
          shooting.x += shooting.vx;
          shooting.y += shooting.vy;
          shooting.life -= 0.018;
          context.strokeStyle = "rgba(188, 246, 255, " + Math.max(0, shooting.life) + ")";
          context.lineWidth = 1.6;
          context.beginPath();
          context.moveTo(shooting.x, shooting.y);
          context.lineTo(shooting.x - shooting.vx * 8, shooting.y - shooting.vy * 8);
          context.stroke();
          if (shooting.life <= 0 || shooting.x > width + 120) shooting = null;
        }
        requestAnimationFrame(draw);
      }
    }

    build();
    draw(0);
    window.addEventListener("resize", () => {
      build();
      if (reduced) draw(0);
    });
    window.addEventListener("pointermove", (event) => {
      targetPointer.x = (event.clientX / Math.max(1, width) - 0.5) * 2;
      targetPointer.y = (event.clientY / Math.max(1, height) - 0.5) * 2;
    }, { passive: true });
  }

  function initConfetti() {
    const canvas = $("#confetti");
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = 0;
    let height = 0;
    let particles = [];
    let frame = null;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function step() {
      context.clearRect(0, 0, width, height);
      particles.forEach((particle) => {
        particle.vy += 0.09;
        particle.vx *= 0.994;
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.rotation += particle.spin;
        particle.life -= 0.006;
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.rotation);
        context.globalAlpha = Math.max(0, particle.life);
        context.fillStyle = particle.color;
        context.fillRect(-particle.size / 2, -particle.size / 4, particle.size, particle.size / 2);
        context.restore();
      });
      particles = particles.filter((particle) => particle.life > 0 && particle.y < height + 40 && particle.x > -80 && particle.x < width + 80);
      if (particles.length) frame = requestAnimationFrame(step);
      else {
        frame = null;
        context.clearRect(0, 0, width, height);
      }
    }

    confettiState = {
      burst(count, originX, originY) {
        if (reduced) return;
        const total = Math.min(240, Math.max(30, count || 140));
        const ox = Number.isFinite(originX) ? originX : width / 2;
        const oy = Number.isFinite(originY) ? originY : height * 0.32;
        const palette = ["#43E7FF", "#7CFFCB", "#FF6BD6", "#FFD166", "#B49CFF", "#FFFFFF"];
        for (let i = 0; i < total; i += 1) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.4 + Math.random() * 7.5;
          particles.push({
            x: ox + (Math.random() - 0.5) * 40,
            y: oy + (Math.random() - 0.5) * 24,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 2.4,
            size: 5 + Math.random() * 7,
            color: palette[Math.floor(Math.random() * palette.length)],
            rotation: Math.random() * Math.PI,
            spin: (Math.random() - 0.5) * 0.3,
            life: 0.9 + Math.random() * 0.3,
          });
        }
        if (!frame) frame = requestAnimationFrame(step);
      },
    };
    resize();
    window.addEventListener("resize", resize);
    confettiState.resize = resize;
  }

  function confetti(count, originX, originY) {
    if (confettiState) confettiState.burst(count, originX, originY);
  }

  QQ.confetti = confetti;

  /* ---------- Core bindings ---------- */
  function bindCore() {
    $$("[data-sound]").forEach((button) => button.addEventListener("click", toggleSound));
    const start = $("#btn-start");
    if (start) start.addEventListener("click", startFromIntro);
    const nameInput = $("#cadet-name");
    if (nameInput) {
      nameInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          startFromIntro();
        }
      });
    }
    const continueBtn = $("#btn-continue");
    if (continueBtn) continueBtn.addEventListener("click", showMap);
    const newGame = $("#btn-new-game");
    if (newGame) newGame.addEventListener("click", openNewGameConfirm);
    const introGuide = $("#btn-intro-guide");
    if (introGuide) introGuide.addEventListener("click", openHelp);
    const brand = $("#map-brand");
    if (brand) brand.addEventListener("click", showIntro);
    const badges = $("#btn-badges");
    if (badges) badges.addEventListener("click", openDiary);
    const achievements = $("#btn-achievements");
    if (achievements) achievements.addEventListener("click", openDiary);
    ["level-help", "qml-help", "sandbox-help", "btn-help"].forEach((id) => {
      const button = document.getElementById(id);
      if (button) button.addEventListener("click", openHelp);
    });
    const nextPortal = $("#btn-next-portal");
    if (nextPortal) {
      nextPortal.addEventListener("click", () => {
        const pending = firstPending();
        if (pending) openBriefing(pending);
        else openCertificate();
      });
    }
    const mapNodes = $("#map-nodes");
    if (mapNodes) {
      mapNodes.addEventListener("click", (event) => {
        const levelNode = event.target.closest("[data-level]");
        if (levelNode) {
          const level = levelById(levelNode.dataset.level);
          if (!level) return;
          if (!isUnlocked(level)) {
            denyNode(levelNode);
            if (window.Sound) window.Sound.play("error");
            toast("Ese portal sigue sellado. Restaura el mundo anterior.", "warn");
            return;
          }
          if (window.Sound) window.Sound.play("select");
          openBriefing(level);
          return;
        }
        const sandboxNode = event.target.closest("[data-sandbox]");
        if (sandboxNode) {
          if (!isSandboxUnlocked()) {
            denyNode(sandboxNode);
            if (window.Sound) window.Sound.play("error");
            toast("El Patio de Juegos despierta cuando enciendes el primer portal.", "warn");
            return;
          }
          if (window.Sound) window.Sound.play("select");
          if (typeof QQ.openSandbox === "function") QQ.openSandbox();
        }
      });
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.modalStack.length) {
        event.preventDefault();
        closeModal();
      }
    });
  }

  QQ.initCore = function initCore() {
    updateIntro();
    applySoundSetting();
    bindCore();
    initStarfield();
    initConfetti();
  };
})();
