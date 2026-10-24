(function () {
  "use strict";

  const $ = QQ.$;
  const $$ = QQ.$$;
  const esc = QQ.esc;

  const SANDBOX_LEVEL = {
    id: "sandbox",
    name: "Patio de Juegos Cuánticos",
    guardian: "Qubi",
    theme: { primary: "#43E7FF", secondary: "#FF6BD6" },
  };

  const QML_EPOCHS = 44;
  const QML_REPLAY_XP = 40;

  let qmlLevel = null;
  let qmlInitialized = false;
  let sandboxBusy = false;
  let sandboxToken = 0;

  /* ---------- Small helpers ---------- */
  function probability(data, basis) {
    return Number(data.probabilities && data.probabilities[basis]) || 0;
  }

  function activeStates(data, minimum) {
    return Object.entries(data.probabilities || {})
      .filter((entry) => (Number(entry[1]) || 0) >= minimum)
      .sort((a, b) => b[1] - a[1]);
  }

  function bitDifference(first, second) {
    let differing = 0;
    for (let index = 0; index < first.length; index += 1) {
      if (first[index] !== second[index]) differing += 1;
    }
    return differing;
  }

  function setQubiSpeech(selector, text) {
    const paragraph = $(selector);
    if (paragraph) paragraph.textContent = text;
  }

  function bindScience(modal) {
    const science = $("[data-science]", modal.modal);
    const panel = $("[data-amplitude-panel]", modal.modal);
    if (!science || !panel) return;
    science.addEventListener("click", () => {
      const open = science.classList.toggle("is-open");
      panel.classList.toggle("is-open", open);
      const label = $("[data-sci-label]", science);
      if (label) label.textContent = open ? "Ocultar amplitudes" : "Ver amplitudes cuánticas";
    });
  }

  function starsRow(count) {
    return window.QSVG ? window.QSVG.stars(count, true) : "";
  }

  function badgeNames(ids) {
    return ids.map((id) => {
      const badge = QQ.state.data && QQ.state.data.badges ? QQ.state.data.badges[id] : null;
      return badge ? badge.name : id;
    });
  }

  /* =========================================================
     QML Lab (mundo 6)
     ========================================================= */
  function openQml(level) {
    if (!level || level.type !== "qml") return;
    if (!QQ.isUnlocked(level)) {
      QQ.toast("Este laboratorio sigue sellado. Restaura los mundos anteriores.", "warn");
      return;
    }
    if (!window.QLab) {
      QQ.toast("El laboratorio QML no está disponible en este navegador.", "error");
      return;
    }
    qmlLevel = level;
    QQ.state.activeLevel = level;
    QQ.state.qmlRewardedThisVisit = false;
    QQ.state.qmlResultShown = false;

    const eyebrow = $("#screen-qml .level-title-row .eyebrow");
    if (eyebrow) eyebrow.textContent = `Mundo ${level.index} · Laboratorio`;
    const title = $("#screen-qml .level-title-row strong");
    if (title) title.textContent = level.name;
    const dots = $("#qml-dots");
    if (dots) dots.innerHTML = QQ.dotsHtml(level.id);
    const guardian = $("#qml-guardian");
    if (guardian) guardian.innerHTML = window.QSVG ? window.QSVG.guardian(level) : "";

    if (!qmlInitialized) {
      window.QLab.init({
        guardianLevel: level,
        toast: QQ.toast,
        onTrained: (result) => handleQmlTrained(level, result),
      });
      qmlInitialized = true;
    } else {
      window.QLab.setProgressDots(QQ.dotsHtml(level.id));
    }
    QQ.showScreen("screen-qml");
    window.QLab.activate();
    if (window.Sound) window.Sound.play("select");
  }

  function leaveQml() {
    if (window.QLab) window.QLab.cancel();
    QQ.state.activeLevel = null;
    QQ.showMap();
    if (window.Sound) window.Sound.play("back");
  }

  function persistQmlProgress(level, result, accuracy) {
    const save = QQ.state.save;
    const record = QQ.ensureRecord(level.id);
    const previousStars = record.stars || 0;
    const firstClear = !record.cleared;
    const awards = { first: firstClear, xp: 0, energy: 0, newBadges: [] };

    record.plays = (record.plays || 0) + 1;
    record.cleared = true;
    record.stars = Math.max(previousStars, 3);
    record.clearedAt = record.clearedAt || new Date().toISOString();
    save.qml = {
      trained: true,
      accuracy: Number(accuracy) || 0,
      theta: Number(result.theta) || 0,
    };

    if (firstClear) {
      awards.xp = level.reward ? level.reward.xp : 0;
      awards.energy = level.reward ? level.reward.energy : 0;
      save.xp += awards.xp;
      save.energy = QQ.clamp(save.energy + awards.energy, 0, 100);
      save.stats.portals = (save.stats.portals || 0) + 1;
      if (level.badge && QQ.awardBadge(level.badge, { silent: true })) {
        awards.newBadges.push(level.badge);
      }
    } else {
      awards.xp = QML_REPLAY_XP;
      save.xp += QML_REPLAY_XP;
    }

    QQ.checkDerivedBadges().forEach((id) => {
      if (!awards.newBadges.includes(id)) awards.newBadges.push(id);
    });
    QQ.persist();
    QQ.syncHud();
    QQ.renderMap();
    if (window.QLab) window.QLab.setProgressDots(QQ.dotsHtml(level.id));
    return awards;
  }

  function showQmlFailure(level, result) {
    const accuracy = Math.round((Number(result.accuracy) || 0) * 100);
    const modal = QQ.openModal(`
      <div class="result-hero">
        <div class="result-icon"><svg><use href="#i-refresh"/></svg></div>
        <p class="result-eyebrow">Entrenamiento incompleto</p>
        <h2 class="result-title">Qubi casi lo logra</h2>
        <p class="result-sub">La frontera todavía no separa todas las estrellas. Precisión actual: ${accuracy}%. Vuelve a entrenar con más épocas.</p>
      </div>
      <div class="result-body">
        <div class="result-actions">
          <span class="result-note">Cada entrenamiento usa Qiskit y parameter-shift.</span>
          <div class="right-actions">
            <button type="button" class="btn btn-ghost btn-small" data-qml-map>
              <svg class="btn-icon"><use href="#i-map"/></svg><span>Mapa</span>
            </button>
            <button type="button" class="btn btn-primary btn-small" data-retrain data-autofocus>
              <svg class="btn-icon"><use href="#i-refresh"/></svg><span>Entrenar otra vez</span>
            </button>
          </div>
        </div>
      </div>
    `, { className: "result-modal modal--failure" });
    if (!modal) return;
    const map = $("[data-qml-map]", modal.modal);
    if (map) map.addEventListener("click", () => {
      modal.close();
      QQ.showMap();
    });
    const retrain = $("[data-retrain]", modal.modal);
    if (retrain) retrain.addEventListener("click", () => {
      modal.close();
      QQ.toast("Pulsa Entrenar a Qubi cuando estés listo.", "info");
    });
  }

  function showQmlResult(level, result, awards) {
    const accuracy = Math.round((Number(result.accuracy) || 0) * 100);
    const theta = Number(result.theta || 0).toFixed(2);
    const boundary = Number(result.boundary || 0).toFixed(2);
    const allDone = QQ.allClear();
    const names = badgeNames(awards.newBadges);
    const chips = [];
    if (awards.first) {
      chips.push(`<span class="reward-chip gold"><svg><use href="#i-star"/></svg>+${awards.xp} XP</span>`);
      chips.push(`<span class="reward-chip energy"><svg><use href="#i-bolt"/></svg>+${awards.energy}% energía</span>`);
      names.forEach((name) => {
        chips.push(`<span class="reward-chip badge"><svg><use href="#i-medal"/></svg>${esc(name)}</span>`);
      });
    } else {
      chips.push(`<span class="reward-chip gold"><svg><use href="#i-star"/></svg>+${awards.xp} XP</span>`);
      chips.push('<span class="reward-chip">Práctica de repetición</span>');
    }

    const html = `
      <div class="result-hero qml-result-hero">
        <div class="result-icon"><svg><use href="#i-chip"/></svg></div>
        <p class="result-eyebrow">QML Lab · Qiskit</p>
        <h2 class="result-title">¡Qubi aprendió a clasificar!</h2>
        <p class="result-sub">
          Una sola rotación entrenable separó las estrellas azules de las rosas.
          La frontera de decisión quedó en x ≈ ${boundary}.
        </p>
        ${starsRow(3)}
        <div class="reward-row">${chips.join("")}</div>
      </div>
      <div class="result-body">
        <div class="result-cols">
          <div class="result-card">
            <h3><svg><use href="#i-atom"/></svg>Lo que aprendió Qubi</h3>
            <div class="qml-result-metrics">
              <div><span>Precisión</span><strong>${accuracy}%</strong><small>estrellas bien clasificadas</small></div>
              <div><span>Ángulo θ</span><strong>${theta}</strong><small>parámetro aprendido</small></div>
              <div><span>Épocas</span><strong>${(result.meta && result.meta.epochs) || QML_EPOCHS}</strong><small>pasos de optimización</small></div>
              <div><span>Pérdida</span><strong>${Number(result.loss || 0).toFixed(3)}</strong><small>error cuadrático medio</small></div>
            </div>
            <div class="qml-result-formula">P(rosa) = sin²((πx/2 + θ) / 2)</div>
            <p class="explain-text">La codificación Ry(πx/2) convierte cada posición en un ángulo. Ry(θ) decide el color. El gradiente se calculó con la regla parameter-shift.</p>
          </div>
          <div class="result-card">
            <h3><svg><use href="#i-spark"/></svg>La ciencia detrás</h3>
            <p class="explain-text">${esc(level.teach)}</p>
            <div class="quantum-meta">
              <span>Qiskit + Aer</span>
              <span>${esc((result.meta && result.meta.optimizer) || "Descenso de gradiente")}</span>
              <span>${esc((result.meta && result.meta.gradient) || "Parameter-shift")}</span>
              <span>1 parámetro entrenable</span>
            </div>
            <div class="qml-result-stars-note">
              ${awards.first ? "Primera restauración del laboratorio · 3 estrellas." : "Laboratorio ya restaurado · recompensa de práctica."}
            </div>
          </div>
        </div>
        <div class="result-actions">
          <span class="result-note">QML real ejecutado en el servidor con Qiskit.</span>
          <div class="right-actions">
            <button type="button" class="btn btn-ghost btn-small" data-qml-stay>
              <svg class="btn-icon"><use href="#i-flask"/></svg><span>Seguir explorando</span>
            </button>
            <button type="button" class="btn btn-ghost btn-small" data-qml-map>
              <svg class="btn-icon"><use href="#i-map"/></svg><span>Mapa</span>
            </button>
            ${allDone ? '<button type="button" class="btn btn-primary btn-small" data-qml-cert><span>Mi certificado</span><svg class="btn-icon"><use href="#i-certificate"/></svg></button>' : ""}
          </div>
        </div>
      </div>`;

    const modal = QQ.openModal(html, {
      className: "result-modal modal--success modal--qml",
      onClose: () => QQ.maybeFinale(900),
    });
    if (!modal) return;
    const stay = $("[data-qml-stay]", modal.modal);
    if (stay) stay.addEventListener("click", () => modal.close());
    const map = $("[data-qml-map]", modal.modal);
    if (map) map.addEventListener("click", () => {
      modal.close();
      QQ.showMap();
    });
    const cert = $("[data-qml-cert]", modal.modal);
    if (cert) cert.addEventListener("click", () => {
      modal.close();
      QQ.openCertificate();
    });
  }

  function handleQmlTrained(level, result) {
    if (!level || QQ.state.currentScreen !== "screen-qml") return;
    const accuracy = Number(result.accuracy) || 0;
    const save = QQ.state.save;
    if (!save) return;
    if (QQ.state.qmlResultShown) {
      QQ.toast("Práctica extra completada. La recompensa de esta visita ya está guardada.", "info", 3200);
      return;
    }
    if (accuracy < 0.99) {
      save.qml = { trained: false, accuracy, theta: Number(result.theta) || 0 };
      QQ.persist();
      showQmlFailure(level, result);
      if (window.Sound) window.Sound.play("fail");
      return;
    }

    const wasCleared = Boolean(QQ.getRecord(level.id) && QQ.getRecord(level.id).cleared);
    const awards = persistQmlProgress(level, result, accuracy);
    QQ.state.qmlRewardedThisVisit = true;
    QQ.state.qmlResultShown = true;
    if (window.Sound) window.Sound.play("success");
    if (typeof QQ.confetti === "function") QQ.confetti(wasCleared ? 70 : 150);
    showQmlResult(level, result, awards);
  }

  /* =========================================================
     Sandbox (Patio de Juegos)
     ========================================================= */
  const CHALLENGES = [
    {
      id: "zeros",
      name: "Cero absoluto",
      matches: (data) => probability(data, "000") >= 0.98,
    },
    {
      id: "four-ways",
      name: "Cuatro caminos",
      matches: (data) => {
        const active = activeStates(data, 0.18);
        const covered = active.reduce((sum, entry) => sum + entry[1], 0);
        return active.length === 4 && covered >= 0.94;
      },
    },
    {
      id: "bell",
      name: "Campana lejana",
      matches: (data) => {
        const active = activeStates(data, 0.42);
        if (active.length !== 2) return false;
        const covered = active.reduce((sum, entry) => sum + entry[1], 0);
        return covered >= 0.94 && bitDifference(active[0][0], active[1][0]) === 2;
      },
    },
    {
      id: "ghz",
      name: "Trío GHZ",
      matches: (data) => probability(data, "000") >= 0.45 && probability(data, "111") >= 0.45,
    },
  ];

  const CHALLENGE_BY_ID = {};
  CHALLENGES.forEach((challenge) => { CHALLENGE_BY_ID[challenge.id] = challenge; });

  function ensureSandboxBuilder() {
    const existing = QQ.state.builders.sandbox;
    if (existing) return existing;
    const mount = $("#sandbox-circuit-mount");
    if (!mount) return null;
    const builder = new QQ.CircuitBuilder({
      qubits: 3,
      mount,
      paletteMount: $("#sandbox-palette-mount"),
      guideEl: $("#sandbox-guide"),
      spellEl: $("#sandbox-spell-line"),
      countEl: $("#sandbox-gate-count"),
      undoBtn: $("#sandbox-undo"),
      clearBtn: $("#sandbox-clear"),
      max: 16,
      onChange: () => {
        setQubiSpeech("#screen-sandbox .qubi-speech p", "Cada poder cambia el destino del universo. ¿Qué tal si pruebas otra combinación?");
      },
    });
    QQ.state.builders.sandbox = builder;
    return builder;
  }

  function refreshSandboxChallenges() {
    const save = QQ.state.save;
    const completed = save && save.sandbox ? new Set(save.sandbox.completed) : new Set();
    $$("#challenge-list li").forEach((item) => {
      item.classList.toggle("is-done", completed.has(item.dataset.challenge));
    });
    const count = $("#challenge-count");
    if (count) count.textContent = `${completed.size} / ${CHALLENGES.length}`;
  }

  function setSandboxRun(busy, label) {
    const run = $("#sandbox-run");
    if (!run) return;
    run.classList.toggle("is-loading", Boolean(busy));
    run.disabled = Boolean(busy);
    const text = run.querySelector("span:last-child");
    if (text) text.textContent = busy ? (label || "Simulando…") : "Simular";
  }

  function awardSandboxVisit() {
    const save = QQ.state.save;
    if (!save || save.sandbox.visited) return;
    save.sandbox.visited = true;
    QQ.persist();
    if (QQ.awardBadge("sandbox-explorer", { silent: false })) {
      setQubiSpeech("#screen-sandbox .qubi-speech p", "¡Bienvenido al Patio de Juegos! Aquí puedes inventar cualquier estado cuántico. ¡Yo vigilo que no explote nada!");
    }
  }

  function openSandbox() {
    if (!QQ.isSandboxUnlocked()) {
      QQ.toast("El Patio de Juegos despierta cuando enciendes el primer portal.", "warn");
      return;
    }
    if (!QQ.state.save) return;
    QQ.state.activeLevel = null;
    const builder = ensureSandboxBuilder();
    if (!builder) return;
    refreshSandboxChallenges();
    QQ.showScreen("screen-sandbox");
    setSandboxRun(false);
    builder.setLocked(false);
    if (!builder.hasOperations()) {
      builder.guide("Elige un poder y colócalo en cualquier cable. Todo está permitido.", "");
    }
    awardSandboxVisit();
    if (window.Sound) window.Sound.play("select");
  }

  function leaveSandbox() {
    if (sandboxBusy) {
      sandboxToken += 1;
      sandboxBusy = false;
      const builder = QQ.state.builders.sandbox;
      if (builder) builder.setLocked(false);
      setSandboxRun(false);
    }
    QQ.showMap();
    if (window.Sound) window.Sound.play("back");
  }

  function applySandboxChallenges(data) {
    const save = QQ.state.save;
    if (!save) return [];
    const newly = [];
    CHALLENGES.forEach((challenge) => {
      if (save.sandbox.completed.includes(challenge.id)) return;
      if (challenge.matches(data)) {
        save.sandbox.completed.push(challenge.id);
        newly.push(challenge);
      }
    });
    if (newly.length) QQ.persist();
    refreshSandboxChallenges();
    return newly;
  }

  function challengeRowsHtml() {
    const save = QQ.state.save;
    const completed = save && save.sandbox ? save.sandbox.completed : [];
    return CHALLENGES.map((challenge) => {
      const done = completed.includes(challenge.id);
      return `<li class="${done ? "is-done" : ""}">
        <span class="challenge-check"><svg><use href="#i-check"/></svg></span>
        <span>${esc(challenge.name)}</span>
      </li>`;
    }).join("");
  }

  function showSandboxResult(data, newly) {
    const save = QQ.state.save;
    const completed = save.sandbox.completed.length;
    const active = activeStates(data, 0.01);
    const top = active[0] || ["000", 1];
    const activeCount = active.length;
    const title = newly.length ? "¡Reto descubierto!" : "El universo respondió";
    const subtitle = activeCount === 1
      ? `Tu hechizo colapsó en un solo estado: |${top[0]}⟩. Prueba abrir más caminos con H.`
      : `Tu hechizo repartió la energía entre ${activeCount} resultados posibles. Ninguna respuesta es incorrecta aquí.`;
    const chips = [`<span class="reward-chip"><svg><use href="#i-compass"/></svg>${completed} / ${CHALLENGES.length} retos</span>`];
    newly.forEach((challenge) => {
      chips.push(`<span class="reward-chip gold"><svg><use href="#i-check"/></svg>${esc(challenge.name)}</span>`);
    });
    if (!newly.length && completed < CHALLENGES.length) {
      chips.push('<span class="reward-chip">Sigue combinando poderes</span>');
    }
    if (completed === CHALLENGES.length) {
      chips.push('<span class="reward-chip badge"><svg><use href="#i-trophy"/></svg>Patio completado</span>');
    }
    const quantum = data.quantum || {};
    const html = `
      <div class="result-hero sandbox-result-hero">
        <div class="result-icon"><svg><use href="#i-atom"/></svg></div>
        <p class="result-eyebrow">Patio de Juegos · 3 qubits</p>
        <h2 class="result-title">${title}</h2>
        <p class="result-sub">${esc(subtitle)}</p>
        <div class="reward-row">${chips.join("")}</div>
      </div>
      <div class="result-body">
        <div class="result-cols">
          <div class="result-card">
            <h3><svg><use href="#i-atom"/></svg>El estado que inventaste</h3>
            ${QQ.buildHistogram(data, { free: true })}
          </div>
          <div class="result-card">
            <h3><svg><use href="#i-target"/></svg>Retos del patio</h3>
            <ul class="sandbox-result-challenges">${challengeRowsHtml()}</ul>
            <div class="quantum-meta">
              <span>Qiskit ${esc(quantum.qiskit || "")}</span>
              <span>${esc(quantum.backend || "AerSimulator")}</span>
              <span>${data.shots || 1024} shots · seed ${quantum.seed || 7}</span>
              <span>profundidad ${data.depth}</span>
              <span>${Math.round(data.runtime_ms || 0)} ms</span>
            </div>
            <button type="button" class="science-toggle" data-science>
              <span data-sci-label>Ver amplitudes cuánticas</span>
              <svg><use href="#i-arrow-right"/></svg>
            </button>
            <div class="amplitude-panel" data-amplitude-panel>
              ${QQ.buildAmplitudeTable(data.amplitudes)}
            </div>
          </div>
        </div>
        <div class="result-actions">
          <span class="result-note">Modo libre: sin recompensas, solo descubrimiento.</span>
          <div class="right-actions">
            <button type="button" class="btn btn-ghost btn-small" data-sandbox-clear>
              <svg class="btn-icon"><use href="#i-trash"/></svg><span>Limpiar</span>
            </button>
            <button type="button" class="btn btn-ghost btn-small" data-sandbox-map>
              <svg class="btn-icon"><use href="#i-map"/></svg><span>Mapa</span>
            </button>
            <button type="button" class="btn btn-primary btn-small" data-sandbox-again>
              <span>Probar otro hechizo</span>
              <svg class="btn-icon"><use href="#i-play"/></svg>
            </button>
          </div>
        </div>
      </div>`;

    const modal = QQ.openModal(html, { className: "result-modal modal--free" });
    if (!modal) return;
    bindScience(modal);
    const builder = QQ.state.builders.sandbox;
    const again = $("[data-sandbox-again]", modal.modal);
    if (again) again.addEventListener("click", () => {
      modal.close();
      if (builder) builder.guide("Prueba otra combinación. El universo siempre responde.", "active");
      const palette = $("#sandbox-palette-mount .power-card");
      if (palette) palette.focus({ preventScroll: true });
    });
    const clear = $("[data-sandbox-clear]", modal.modal);
    if (clear) clear.addEventListener("click", () => {
      modal.close();
      if (builder) builder.clear();
      setQubiSpeech("#screen-sandbox .qubi-speech p", "Sin misión, sin prisa. ¿Qué estado cuántico quieres inventar hoy?");
    });
    const map = $("[data-sandbox-map]", modal.modal);
    if (map) map.addEventListener("click", () => {
      modal.close();
      QQ.showMap();
    });
  }

  async function runSandbox() {
    if (sandboxBusy) return;
    const builder = ensureSandboxBuilder();
    if (!builder) return;
    const save = QQ.state.save;
    if (!save) return;

    sandboxBusy = true;
    const token = ++sandboxToken;
    setSandboxRun(true, "Simulando…");
    builder.setLocked(true);
    if (window.Sound) window.Sound.play("charge");
    try {
      const started = performance.now();
      const data = await QQ.postJson("/api/run", {
        level_id: "free",
        qubits: 3,
        operations: builder.getOperations(),
      });
      const elapsed = performance.now() - started;
      if (elapsed < 850) await QQ.wait(850 - elapsed);
      if (token !== sandboxToken) return;
      sandboxBusy = false;
      builder.setLocked(false);
      setSandboxRun(false);
      save.stats.runs = (save.stats.runs || 0) + 1;
      const newly = applySandboxChallenges(data);
      QQ.persist();
      QQ.syncHud();
      if (window.Sound) window.Sound.play("success");
      if (typeof QQ.confetti === "function") QQ.confetti(newly.length ? 110 : 55);
      const completed = save.sandbox.completed.length;
      setQubiSpeech(
        "#screen-sandbox .qubi-speech p",
        completed === CHALLENGES.length
          ? "¡Completaste los cuatro retos! El Patio de Juegos ya te considera un explorador cuántico."
          : newly.length
            ? `¡Reto completado: ${newly.map((challenge) => challenge.name).join(", ")}! ¿Cuál será el siguiente?`
            : "El universo escuchó tu hechizo. Cambia un poder y observa qué pasa."
      );
      showSandboxResult(data, newly);
    } catch (error) {
      if (token !== sandboxToken) return;
      sandboxBusy = false;
      builder.setLocked(false);
      setSandboxRun(false);
      QQ.toast(error.message || "No pudimos simular ese hechizo.", "error", 5000);
      if (window.Sound) window.Sound.play("fail");
    }
  }

  QQ.openQml = openQml;
  QQ.openSandbox = openSandbox;
  QQ.initExtras = function initExtras() {
    const guardian = $("#sandbox-guardian");
    if (guardian) guardian.innerHTML = window.QSVG ? window.QSVG.guardian(SANDBOX_LEVEL) : "";
    const qubi = $("#sandbox-qubi");
    if (qubi) qubi.innerHTML = window.QSVG ? window.QSVG.qubi("happy") : "";
    const qmlBack = $("#qml-back");
    if (qmlBack) qmlBack.addEventListener("click", leaveQml);
    const sandboxBack = $("#sandbox-back");
    if (sandboxBack) sandboxBack.addEventListener("click", leaveSandbox);
    const run = $("#sandbox-run");
    if (run) run.onclick = runSandbox;
    refreshSandboxChallenges();
  };
})();
