(function () {
  "use strict";

  const QQ = window.QQ;
  if (!QQ) return;

  const $ = QQ.$;

  function dotsHtml(activeId) {
    if (!QQ.state.data) return "";
    return QQ.state.data.levels.map((level) => {
      const record = QQ.getRecord(level.id);
      const done = record && record.cleared;
      const current = level.id === activeId;
      return `<span class="level-dot ${done ? "done" : current ? "current" : ""}" title="${QQ.esc(level.name)}"></span>`;
    }).join("");
  }

  QQ.dotsHtml = dotsHtml;

  function setRunButton(busy, label) {
    const button = $("#btn-run");
    if (!button) return;
    button.classList.toggle("is-loading", Boolean(busy));
    button.disabled = Boolean(busy);
    const text = $("#run-label");
    if (text) text.textContent = label || "Activar portal";
  }

  function setPortal(stageState, caption) {
    const stage = $("#portal-stage");
    if (!stage) return;
    stage.classList.remove("is-charging", "is-open", "is-error");
    if (stageState) stage.classList.add(stageState);
    const captionText = $("#portal-status-text");
    if (captionText) captionText.textContent = caption;
  }

  function setQubi(line, mood) {
    const mount = $("#level-qubi");
    if (mount) mount.innerHTML = window.QSVG ? window.QSVG.qubi(mood || "") : "";
    const text = $("#qubi-line");
    if (text) text.textContent = line;
  }

  function resetLevelRunUi(level) {
    setRunButton(false, "Activar portal");
    setPortal(null, "Portal en reposo");
    setQubi("Lee la misión, arma tu hechizo y activa el portal.", "");
    if (level) {
      const builder = QQ.state.builders.level;
      if (builder) builder.setLocked(false);
    }
  }

  function openLevel(level) {
    if (!level || level.type === "qml") return;
    if (!QQ.isUnlocked(level)) {
      QQ.toast("Ese portal sigue sellado. Restaura el mundo anterior.", "warn");
      return;
    }
    QQ.state.activeLevel = level;
    QQ.state.hintIndex = 0;
    QQ.state.hintsThisVisit = 0;
    const record = QQ.getRecord(level.id);
    const scene = $("#scene-panel");
    if (scene) {
      scene.style.setProperty("--accent", level.theme.primary);
      scene.style.setProperty("--accent-2", level.theme.secondary);
    }
    const index = $("#level-index");
    if (index) index.textContent = `Mundo ${level.index}`;
    const topName = $("#level-top-name");
    if (topName) topName.textContent = level.name;
    const dots = $("#level-dots");
    if (dots) dots.innerHTML = dotsHtml(level.id);
    const guardian = $("#guardian-mount");
    if (guardian) guardian.innerHTML = window.QSVG ? window.QSVG.guardian(level) : "";
    const guardianName = $("#level-guardian");
    if (guardianName) guardianName.textContent = level.guardian;
    const guardianRole = $("#level-guardian-role");
    if (guardianRole) guardianRole.textContent = level.guardian_role;
    const name = $("#level-name");
    if (name) name.textContent = level.name;
    const tagline = $("#level-tagline");
    if (tagline) tagline.textContent = level.tagline;
    const portal = $("#portal-mount");
    if (portal) portal.innerHTML = window.QSVG ? window.QSVG.portal() : "";
    const best = $("#level-best-stars");
    if (best) {
      const stars = record ? record.stars || 0 : 0;
      best.innerHTML = `<span>Mejor marca</span>${window.QSVG ? window.QSVG.stars(stars) : ""}`;
      best.title = record ? `${stars} de 3 estrellas` : "Aún sin récord";
    }
    const mission = $("#level-mission");
    if (mission) mission.textContent = level.mission;
    const goal = $("#level-goal");
    if (goal) goal.textContent = level.goal_chip;
    const par = $("#level-par");
    if (par) par.textContent = `3 estrellas con ${level.par} poder${level.par === 1 ? "" : "es"}`;
    const hintBox = $("#hint-box");
    if (hintBox) hintBox.hidden = true;
    const hintText = $("#hint-text");
    if (hintText) hintText.textContent = "";
    const hintCount = $("#hint-count");
    if (hintCount) hintCount.textContent = `Pista 1 de ${level.hints.length}`;
    const hintBtn = $("#btn-hint");
    if (hintBtn) {
      hintBtn.disabled = !level.hints.length;
      hintBtn.textContent = "Pedir pista";
    }

    QQ.showScreen("screen-level");

    $(".builder-panel .panel-heading h2").textContent = "Arma tu circuito";
    const builder = new QQ.CircuitBuilder({
      qubits: level.qubits,
      mount: $("#circuit-mount"),
      paletteMount: $("#palette-mount"),
      guideEl: $("#builder-guide"),
      spellEl: $("#spell-line"),
      countEl: $("#gate-count"),
      undoBtn: $("#btn-undo"),
      clearBtn: $("#btn-clear"),
      max: 16,
    });
    QQ.state.builders.level = builder;
    resetLevelRunUi(level);

    const runBtn = $("#btn-run");
    if (runBtn) runBtn.onclick = () => runLevel(level);
    const hintBtnNow = $("#btn-hint");
    if (hintBtnNow) hintBtnNow.onclick = () => showHint(level);
    if (typeof QQ.mountLevelRoom === "function") QQ.mountLevelRoom(level);
  }

  QQ.openLevel = openLevel;
  QQ.setLevelQubi = setQubi;

  function showHint(level) {
    if (!level || !level.hints.length) return;
    if (QQ.state.hintIndex >= level.hints.length) {
      QQ.toast("Ya te di todas las pistas. ¡Confía en tu circuito!", "info");
      return;
    }
    const index = QQ.state.hintIndex;
    const box = $("#hint-box");
    if (box) box.hidden = false;
    const text = $("#hint-text");
    if (text) text.textContent = level.hints[index];
    const count = $("#hint-count");
    if (count) count.textContent = `Pista ${index + 1} de ${level.hints.length}`;
    QQ.state.hintIndex += 1;
    QQ.state.hintsThisVisit += 1;
    if (QQ.state.save) {
      QQ.state.save.stats.hints += 1;
      QQ.persist();
    }
    const button = $("#btn-hint");
    if (button) {
      const done = QQ.state.hintIndex >= level.hints.length;
      button.textContent = done ? "Sin más pistas" : "Otra pista";
      button.disabled = done;
    }
    if (window.Sound) window.Sound.play("tick");
  }

  function leaveLevel() {
    if (QQ.state.runBusy) {
      QQ.toast("Espera a que el portal termine de leer tu hechizo.", "warn");
      return;
    }
    QQ.state.runToken = (QQ.state.runToken || 0) + 1;
    if (window.Sound) window.Sound.play("back");
    QQ.showMap();
  }

  QQ.leaveLevel = leaveLevel;

  function applyLevelResult(level, data) {
    const save = QQ.state.save;
    const record = QQ.ensureRecord(level.id);
    const awards = { first: false, xp: 0, energy: 0, newBadges: [], stars: 0 };
    save.stats.runs += 1;
    record.plays += 1;
    record.hintsUsed = (record.hintsUsed || 0) + QQ.state.hintsThisVisit;
    QQ.state.hintsThisVisit = 0;

    if (data.success) {
      awards.first = !record.cleared;
      awards.stars = data.stars;
      record.cleared = true;
      record.clearedAt = record.clearedAt || new Date().toISOString();
      record.stars = Math.max(record.stars || 0, data.stars || 0);
      record.bestGates = record.bestGates == null
        ? data.gate_count
        : Math.min(record.bestGates, data.gate_count);
      save.stats.portals += 1;
      if (awards.first) {
        awards.xp = level.reward.xp;
        awards.energy = level.reward.energy;
        if (level.badge && QQ.awardBadge(level.badge, { silent: true })) awards.newBadges.push(level.badge);
      } else {
        awards.xp = 25;
      }
      save.xp += awards.xp;
      save.energy = QQ.clamp(save.energy + awards.energy, 0, 100);
      const derived = QQ.checkDerivedBadges();
      derived.forEach((id) => {
        if (!awards.newBadges.includes(id)) awards.newBadges.push(id);
      });
    }
    QQ.persist();
    QQ.syncHud();
    QQ.renderMap();
    return awards;
  }

  QQ.applyLevelResult = applyLevelResult;

  async function runLevel(level) {
    if (QQ.state.runBusy) return;
    const builder = QQ.state.builders.level;
    if (!builder) return;
    if (!builder.hasOperations()) {
      builder.guide("Coloca al menos un poder en un circuito antes de activar el portal.", "warn");
      QQ.toast("Tu hechizo está vacío. Coloca al menos un poder.", "warn");
      if (window.Sound) window.Sound.play("error");
      return;
    }
    QQ.state.runBusy = true;
    const token = (QQ.state.runToken || 0) + 1;
    QQ.state.runToken = token;
    setRunButton(true, "Abriendo portal…");
    if (window.Sound) window.Sound.play("charge");
    builder.setLocked(true);
    setPortal("is-charging", "El portal está leyendo tu hechizo…");
    setQubi("Siento los qubits girando… ¡no respires todavía!", "happy");
    const started = performance.now();

    let data;
    try {
      data = await QQ.postJson("/api/run", {
        level_id: level.id,
        operations: builder.getOperations(),
      });
      const elapsed = performance.now() - started;
      if (elapsed < 900) await QQ.wait(900 - elapsed);
    } catch (error) {
      if (token !== QQ.state.runToken) return;
      QQ.state.runBusy = false;
      setRunButton(false, "Activar portal");
      builder.setLocked(false);
      setPortal("is-error", "El portal no respondió");
      setQubi("El simulador se distrajo. Revisa el circuito y vuelve a intentarlo.", "");
      if (window.Sound) window.Sound.play("error");
      QQ.toast(error.message || "No pudimos ejecutar el circuito.", "error", 5200);
      return;
    }

    if (token !== QQ.state.runToken) return;
    QQ.state.runBusy = false;
    setRunButton(false, data.success ? "Repetir hechizo" : "Activar portal");
    const awards = applyLevelResult(level, data);

    if (data.success) {
      setPortal("is-open", "¡Portal abierto!");
      setQubi("¡Lo lograste! Mira las estrellas y las probabilidades reales.", "happy");
      if (window.Sound) window.Sound.play("success");
      if (typeof QQ.confetti === "function") QQ.confetti(150);
    } else {
      setPortal("is-error", "El portal aún no responde");
      setQubi("Casi. Lee las barras y prueba otro hechizo.", "");
      if (window.Sound) window.Sound.play("fail");
    }
    window.setTimeout(() => {
      if (token === QQ.state.runToken) showLevelResult(level, data, awards);
    }, 380);
  }

  function histogramHtml(data, options) {
    const config = options || {};
    const goal = config.goalStates instanceof Set ? config.goalStates : new Set(config.goalStates || []);
    const states = Object.keys(data.probabilities || {}).sort((a, b) => {
      const difference = (data.probabilities[b] || 0) - (data.probabilities[a] || 0);
      return difference || a.localeCompare(b);
    });
    const palette = ["#43E7FF", "#FF6BD6", "#FFD166", "#B49CFF", "#7CFFCB", "#5AA9FF", "#FF9F5A", "#9B7BFF"];
    const bars = states.map((basis, index) => {
      const probability = data.probabilities[basis] || 0;
      const percentage = probability * 100;
      const isGoal = goal.has(basis);
      let color;
      if (config.free) color = palette[index % palette.length];
      else if (isGoal) color = config.success === false ? "#FF9F5A" : "#7CFFCB";
      else color = "#6F6A9E";
      const count = data.counts && data.counts[basis] != null ? data.counts[basis] : 0;
      return `
        <div class="hist-item" title="Resultado ${QQ.esc(basis)}: ${percentage.toFixed(1)}%">
          <span class="hist-value">${percentage.toFixed(1)}%</span>
          <div class="hist-bar-area">
            <div class="hist-bar${isGoal ? " is-goal" : ""}" style="--h:${Math.max(0, Math.min(100, percentage))}%;--bar-color:${color}"></div>
          </div>
          <span class="hist-label">${QQ.esc(basis)}</span>
          <span class="hist-count">${QQ.formatNumber(count)} medidas</span>
        </div>`;
    }).join("");
    return `<div class="histogram">${bars}</div>
      <div class="histogram-note">
        <span>Probabilidades exactas del statevector</span>
        <span>${data.shots || 1024} shots · semilla ${(data.quantum && data.quantum.seed) || 7}</span>
      </div>`;
  }

  QQ.buildHistogram = histogramHtml;

  function amplitudeTableHtml(amplitudes) {
    const rows = (amplitudes || []).map((entry) => {
      const real = Number(entry.real) || 0;
      const imag = Number(entry.imag) || 0;
      const sign = (value) => `${value >= 0 ? "+" : ""}${value.toFixed(4)}`;
      return `<tr>
        <td>|${QQ.esc(entry.basis)}⟩</td>
        <td>${sign(real)}</td>
        <td>${sign(imag)}i</td>
        <td>${((Number(entry.probability) || 0) * 100).toFixed(1)}%</td>
      </tr>`;
    }).join("");
    return `<div class="amplitude-scroll">
      <table class="amplitude-table">
        <thead><tr><th>Estado</th><th>Real</th><th>Imag.</th><th>Prob.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  QQ.buildAmplitudeTable = amplitudeTableHtml;

  function goalStatesFor(level) {
    const objective = level.objective || {};
    if (objective.type === "only") return new Set([objective.outcome]);
    if (objective.type === "split") return new Set(objective.outcomes || []);
    return new Set();
  }

  function rewardChipsHtml(data, awards) {
    if (!data.success) {
      return `<div class="reward-row"><span class="reward-chip">Sin recompensa esta vez · tu hechizo puede mejorar</span></div>`;
    }
    const chips = [];
    if (awards.xp) chips.push(`<span class="reward-chip gold"><svg><use href="#i-star"/></svg>+${awards.xp} XP</span>`);
    if (awards.energy) chips.push(`<span class="reward-chip energy"><svg><use href="#i-bolt"/></svg>+${awards.energy}% energía</span>`);
    awards.newBadges.forEach((id) => {
      const badge = QQ.state.data.badges[id];
      if (badge) chips.push(`<span class="reward-chip badge"><svg><use href="#i-medal"/></svg>${QQ.esc(badge.name)}</span>`);
    });
    if (!awards.first) chips.push('<span class="reward-chip">Repetición · +25 XP</span>');
    return `<div class="reward-row">${chips.join("")}</div>`;
  }

  function showLevelResult(level, data, awards) {
    const success = Boolean(data.success);
    const pending = QQ.firstPending();
    const clearedNow = QQ.allClear();
    const goalStates = goalStatesFor(level);
    const title = success
      ? ["¡Portal restaurado!", "¡Lo lograste!", "¡Hechizo perfecto!"][Math.floor(Math.random() * 3)]
      : "El portal aún no se abre";
    const subtitle = success
      ? (data.success_text || level.success)
      : (data.diagnosis || level.retry);
    const par = level.par;
    const note = `Usaste ${data.gate_count} poder${data.gate_count === 1 ? "" : "es"} · par del mundo: ${par}.`;
    const quantum = data.quantum || {};
    const primaryAction = !success
      ? ""
      : clearedNow
        ? '<button type="button" class="btn btn-primary btn-small" data-result-cert><span>Mi certificado</span><svg class="btn-icon"><use href="#i-certificate"/></svg></button>'
        : pending
          ? '<button type="button" class="btn btn-primary btn-small" data-result-next><span>Siguiente mundo</span><svg class="btn-icon"><use href="#i-arrow-right"/></svg></button>'
          : "";
    const html = `
      <div class="result-hero">
        <div class="result-icon"><svg><use href="#${success ? "i-check" : "i-refresh"}"/></svg></div>
        <p class="result-eyebrow">${success ? "Portal restaurado" : "El portal duda"}</p>
        <h2 class="result-title">${success ? title : "Casi lo tienes"}</h2>
        <p class="result-sub">${QQ.esc(subtitle)}</p>
        ${success ? `<div class="result-stars">${window.QSVG ? window.QSVG.stars(data.stars || 0, true) : ""}</div>` : ""}
        ${rewardChipsHtml(data, awards)}
      </div>
      <div class="result-body">
        <div class="result-cols">
          <div class="result-card">
            <h3><svg><use href="#i-atom"/></svg>Lo que decidió el universo</h3>
            ${histogramHtml(data, { goalStates, success })}
          </div>
          <div class="result-card">
            <h3><svg><use href="#i-spark"/></svg>La ciencia detrás</h3>
            <p class="explain-text">${QQ.esc(data.explanation || level.teach)}</p>
            ${data.success_text ? `<p class="success-quote">${QQ.esc(data.success_text)}</p>` : ""}
            <div class="quantum-meta">
              <span>Qiskit ${QQ.esc(quantum.qiskit || "")}</span>
              <span>${QQ.esc(quantum.backend || "AerSimulator")}</span>
              <span>${data.shots || 1024} shots · seed ${quantum.seed || 7}</span>
              <span>profundidad ${data.depth}</span>
              <span>${Math.round(data.runtime_ms || 0)} ms</span>
            </div>
            <button type="button" class="science-toggle" data-science>
              <span data-sci-label>Ver amplitudes cuánticas</span>
              <svg><use href="#i-arrow-right"/></svg>
            </button>
            <div class="amplitude-panel" data-amplitude-panel>
              ${amplitudeTableHtml(data.amplitudes)}
            </div>
          </div>
        </div>
        <div class="result-actions">
          <span class="result-note">${QQ.esc(note)}${!success && awards.first === false ? " Tu mejor marca sigue guardada." : ""}</span>
          <div class="right-actions">
            <button type="button" class="btn btn-ghost btn-small" data-result-repeat>
              <svg class="btn-icon"><use href="#i-refresh"/></svg><span>${success ? "Repetir" : "Ajustar hechizo"}</span>
            </button>
            <button type="button" class="btn btn-ghost btn-small" data-result-map>
              <svg class="btn-icon"><use href="#i-map"/></svg><span>Mapa</span>
            </button>
            ${primaryAction}
          </div>
        </div>
      </div>`;

    const modal = QQ.openModal(html, {
      className: `result-modal modal--${success ? "success" : "failure"}`,
      onClose: () => {
        const builder = QQ.state.builders.level;
        if (builder) builder.setLocked(false);
        setRunButton(false, "Activar portal");
        QQ.maybeFinale(700);
      },
    });
    if (!modal) return;

    const science = $("[data-science]", modal.modal);
    const panel = $("[data-amplitude-panel]", modal.modal);
    if (science && panel) {
      science.addEventListener("click", () => {
        const open = science.classList.toggle("is-open");
        panel.classList.toggle("is-open", open);
        const label = $("[data-sci-label]", science);
        if (label) label.textContent = open ? "Ocultar amplitudes" : "Ver amplitudes cuánticas";
      });
    }
    const repeat = $("[data-result-repeat]", modal.modal);
    if (repeat) repeat.addEventListener("click", () => {
      modal.close();
      resetLevelRunUi(level);
      const builder = QQ.state.builders.level;
      if (builder) builder.guide("Ajusta tu hechizo y vuelve a activar el portal.", "");
    });
    const map = $("[data-result-map]", modal.modal);
    if (map) map.addEventListener("click", () => {
      modal.close();
      QQ.showMap();
    });
    const next = $("[data-result-next]", modal.modal);
    if (next) next.addEventListener("click", () => {
      modal.close();
      QQ.showMap();
      window.setTimeout(() => {
        const upcoming = QQ.firstPending();
        if (upcoming) QQ.openBriefing(upcoming);
      }, 300);
    });
    const cert = $("[data-result-cert]", modal.modal);
    if (cert) cert.addEventListener("click", () => {
      modal.close();
      QQ.openCertificate();
    });
  }

  QQ.showLevelResult = showLevelResult;

  function initLevel() {
    const back = $("#level-back");
    if (back) back.addEventListener("click", leaveLevel);
  }

  QQ.initLevel = initLevel;
})();
