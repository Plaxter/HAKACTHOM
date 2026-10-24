(function () {
  const PLOT = { left: 58, right: 694, top: 54, bottom: 382, centerY: 218 };
  const DEFAULT_EPOCHS = 44;

  const scaleX = (feature) => PLOT.left + ((feature + 1) / 2) * (PLOT.right - PLOT.left);
  const scaleY = (value) => PLOT.centerY - value * 200;

  const state = {
    initialized: false,
    data: null,
    theta: 0,
    accuracy: 0,
    trained: false,
    busy: false,
    animation: null,
    predictTimer: null,
    predictToken: 0,
    callbacks: {},
  };

  const el = {};

  function cacheElements() {
    el.screen = document.getElementById("screen-qml");
    el.chart = document.getElementById("qml-chart");
    el.points = document.getElementById("qml-points");
    el.boundaryGroup = document.getElementById("qml-boundary-group");
    el.boundaryLabel = document.getElementById("qml-boundary-label");
    el.boundaryLine = document.getElementById("qml-boundary");
    el.accuracy = document.getElementById("qml-accuracy");
    el.accuracyNote = document.getElementById("qml-accuracy-note");
    el.theta = document.getElementById("qml-theta");
    el.loss = document.getElementById("qml-loss");
    el.epoch = document.getElementById("qml-epoch");
    el.epochNote = document.getElementById("qml-epoch-note");
    el.trainBtn = document.getElementById("qml-train-btn");
    el.trainLabel = document.getElementById("qml-train-label");
    el.resetBtn = document.getElementById("qml-reset-btn");
    el.status = document.getElementById("qml-status");
    el.progress = document.getElementById("qml-train-progress");
    el.spark = document.getElementById("qml-spark-path");
    el.testPanel = document.getElementById("qml-test-panel");
    el.testChip = document.getElementById("qml-test-chip");
    el.feature = document.getElementById("qml-feature");
    el.featureValue = document.getElementById("qml-feature-value");
    el.prediction = document.getElementById("qml-prediction");
    el.probFill = document.getElementById("qml-prob-fill");
    el.probLabel = document.getElementById("qml-prob-label");
    el.chartWrap = document.querySelector(".chart-wrap");
    el.guardian = document.getElementById("qml-guardian");
    el.dots = document.getElementById("qml-dots");
  }

  function starPath(label) {
    if (label === 0) {
      return "M0 -13 L3.4 -3.4 L13 0 L3.4 3.4 L0 13 L-3.4 3.4 L-13 0 L-3.4 -3.4Z";
    }
    return "M0 -13 L3.2 -4 L13 -4 L5 2.4 L8 11.5 L0 6 L-8 11.5 L-5 2.4 L-13 -4 L-3.2 -4Z";
  }

  function renderStars(dataset) {
    const markup = dataset.map((star) => {
      const x = scaleX(star.x);
      const y = scaleY(star.y);
      const color = star.label === 1 ? "#FF6BD6" : "#43E7FF";
      return `
        <g class="qml-star" data-id="${star.id}" data-label="${star.label}" transform="translate(${x} ${y})">
          <title>Estrella ${star.label_name} en x=${star.x}</title>
          <circle class="star-halo" r="18" fill="none" stroke="${color}" stroke-width="1.4" opacity="0"/>
          <circle r="13" fill="${color}" opacity=".14" filter="url(#softGlow)"/>
          <path class="star-core" d="${starPath(star.label)}" fill="${color}"/>
          <circle r="2.5" fill="#fff" opacity=".9"/>
        </g>`;
    });
    el.points.innerHTML = markup.join("");
  }

  function setBoundary(boundary) {
    const x = scaleX(boundary);
    el.boundaryGroup.style.transform = `translateX(${x - PLOT.right}px)`;
    el.boundaryGroup.dataset.x = String(x);
  }

  function styleBoundaryLabel() {
    const rect = el.boundaryLabel.querySelector("rect");
    const text = el.boundaryLabel.querySelector("text");
    rect.setAttribute("x", "-114");
    rect.setAttribute("y", "-14");
    rect.setAttribute("width", "102");
    rect.setAttribute("height", "28");
    rect.setAttribute("rx", "14");
    text.setAttribute("x", "-16");
    text.setAttribute("y", "4");
    text.setAttribute("text-anchor", "end");
    el.boundaryLabel.setAttribute("transform", `translate(${PLOT.right} 72)`);
    el.boundaryLabel.style.transition = "opacity .2s";
  }

  function paintPredictions(predictions, reveal) {
    if (!predictions) return;
    const byId = new Map(predictions.map((item) => [item.id, item.predicted]));
    el.points.querySelectorAll(".qml-star").forEach((group) => {
      const predicted = byId.get(Number(group.dataset.id));
      const actual = Number(group.dataset.label);
      const correct = predicted === actual;
      group.classList.toggle("is-correct", Boolean(reveal) && correct);
      group.classList.toggle("is-incorrect", Boolean(reveal) && !correct);
    });
    el.chart.classList.toggle("qml-chart-trained", Boolean(reveal));
  }

  function setMetrics({ accuracy, theta, loss, epoch, total }) {
    const percent = Math.round(accuracy * 100);
    el.accuracy.textContent = `${percent}%`;
    el.accuracyNote.textContent = percent >= 100 ? "¡frontera perfecta!" : percent >= 50 ? "ajustando la frontera" : "aún sin entrenar";
    el.theta.textContent = Number(theta).toFixed(2);
    el.loss.textContent = Number(loss).toFixed(3);
    el.epoch.textContent = String(epoch);
    el.epochNote.textContent = `de ${total || DEFAULT_EPOCHS}`;
  }

  function setQubiMood(mood) {
    const svg = el.chartWrap.querySelector(".qubi-art");
    if (!svg) return;
    svg.classList.remove("mood-happy", "mood-wow", "mood-sad");
    if (mood) svg.classList.add(`mood-${mood}`);
  }

  function drawSparkline(history, upTo) {
    if (!history || history.length < 2) {
      el.spark.setAttribute("d", "");
      return;
    }
    const maxLoss = Math.max(0.08, history[0].loss);
    const visible = history.slice(0, upTo + 1);
    const points = visible.map((record, index) => {
      const x = (index / (history.length - 1)) * 220;
      const y = 48 - Math.min(1, record.loss / maxLoss) * 40;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    el.spark.setAttribute("d", `M${points.join(" L")}`);
  }

  function setBusy(busy, label) {
    state.busy = busy;
    el.trainBtn.classList.toggle("is-loading", busy);
    el.trainBtn.disabled = busy;
    el.resetBtn.disabled = busy;
    if (busy) {
      el.trainLabel.textContent = label || "Entrenando…";
    }
  }

  function setInitial(data) {
    state.data = data;
    state.theta = data.theta;
    state.accuracy = data.accuracy;
    state.trained = false;
    renderStars(data.dataset);
    styleBoundaryLabel();
    setBoundary(data.boundary);
    paintPredictions(data.predictions, false);
    setMetrics({
      accuracy: data.accuracy,
      theta: data.theta,
      loss: data.loss,
      epoch: 0,
      total: DEFAULT_EPOCHS,
    });
    drawSparkline(null);
    el.status.textContent = "Qubi aún no sabe distinguir los colores. ¡Entrénalo!";
    el.status.classList.remove("is-success");
    el.progress.style.width = "0%";
    el.testChip.textContent = "Sin entrenar";
    el.testChip.classList.remove("is-ready");
    el.feature.disabled = true;
    el.prediction.textContent = "Esperando entrenamiento";
    el.prediction.className = "prediction-pill";
    el.probFill.style.width = "0%";
    el.probLabel.textContent = "P(rosa) = —";
    el.trainLabel.textContent = "Entrenar a Qubi";
    setQubiMood(null);
  }

  function finishTraining(result) {
    state.trained = true;
    state.theta = result.theta;
    state.accuracy = result.accuracy;
    el.progress.style.width = "100%";
    setMetrics({
      accuracy: result.accuracy,
      theta: result.theta,
      loss: result.loss,
      epoch: result.meta.epochs,
      total: result.meta.epochs,
    });
    drawSparkline(result.history, result.history.length - 1);
    setBoundary(result.boundary);
    paintPredictions(result.predictions, true);
    setQubiMood("happy");
    el.status.textContent = `¡Frontera aprendida! Qubi clasifica las estrellas con ${Math.round(result.accuracy * 100)}% de precisión.`;
    el.status.classList.add("is-success");
    el.trainLabel.textContent = "Entrenar otra vez";
    setBusy(false);
    el.testChip.textContent = "Modelo listo";
    el.testChip.classList.add("is-ready");
    el.feature.disabled = false;
    el.prediction.textContent = "Prueba una estrella";
    el.prediction.className = "prediction-pill";
    el.probFill.style.width = "0%";
    el.probLabel.textContent = "P(rosa) = —";
    Sound.play("trainDone");
    if (typeof state.callbacks.onTrained === "function") {
      state.callbacks.onTrained(result);
    }
    runPrediction();
  }

  function animateHistory(result) {
    if (state.animation) clearInterval(state.animation);
    const history = result.history;
    let index = 0;
    const list = el.points.querySelectorAll(".qml-star");
    const finalPredictions = new Map(result.predictions.map((item) => [item.id, item.predicted]));
    state.animation = setInterval(() => {
      if (!document.body.contains(el.chart) || !state.busy) return;
      index += 1;
      const record = history[index];
      if (!record) {
        clearInterval(state.animation);
        state.animation = null;
        finishTraining(result);
        return;
      }
      setMetrics({
        accuracy: record.accuracy,
        theta: record.theta,
        loss: record.loss,
        epoch: record.epoch,
        total: result.meta.epochs,
      });
      setBoundary(record.boundary);
      drawSparkline(history, index);
      el.progress.style.width = `${(index / (history.length - 1)) * 100}%`;
      setQubiMood(record.accuracy > 0.85 ? "happy" : null);
      if (index % 4 === 0) Sound.play("tick");
      if (index === history.length - 1) {
        list.forEach((group) => {
          const id = Number(group.dataset.id);
          const actual = Number(group.dataset.label);
          group.classList.toggle("is-correct", finalPredictions.get(id) === actual);
          group.classList.toggle("is-incorrect", finalPredictions.get(id) !== actual);
        });
        el.chart.classList.add("qml-chart-trained");
      }
    }, 42);
  }

  async function train() {
    if (state.busy || !state.initialized) return;
    state.busy = true;
    if (state.animation) {
      clearInterval(state.animation);
      state.animation = null;
    }
    setBusy(true, "Entrenando…");
    el.status.textContent = "Ajustando θ con descenso de gradiente y parameter-shift…";
    el.status.classList.remove("is-success");
    el.testChip.textContent = "Sin entrenar";
    el.testChip.classList.remove("is-ready");
    el.feature.disabled = true;
    el.progress.style.width = "4%";
    Sound.play("charge");
    try {
      const response = await fetch("/api/qml/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theta_start: state.trained ? state.theta : 0,
          epochs: DEFAULT_EPOCHS,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "No se pudo entrenar el modelo.");
      }
      if (!state.busy) return;
      animateHistory(data);
    } catch (error) {
      setBusy(false);
      state.busy = false;
      el.status.textContent = "El entrenamiento se interrumpió. Inténtalo otra vez.";
      el.progress.style.width = "0%";
      state.callbacks.toast(error.message || "No se pudo entrenar a Qubi.", "error");
      Sound.play("fail");
    }
  }

  async function requestPrediction(feature) {
    if (!state.trained) return;
    const token = ++state.predictToken;
    try {
      const response = await fetch("/api/qml/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature, theta: state.theta }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || token !== state.predictToken) return;
      const isRosa = data.label === 1;
      el.prediction.textContent = isRosa ? "Qubi dice: estrella rosa" : "Qubi dice: estrella azul";
      el.prediction.className = `prediction-pill ${isRosa ? "is-rosa" : "is-azul"}`;
      el.probFill.style.width = `${(data.p_one * 100).toFixed(1)}%`;
      el.probLabel.textContent = `P(rosa) = ${(data.p_one * 100).toFixed(0)}%`;
    } catch (_error) {
      el.prediction.textContent = "No pudimos clasificarla";
    }
  }

  function runPrediction() {
    if (!state.trained) return;
    const feature = Number(el.feature.value);
    el.featureValue.textContent = `${feature >= 0 ? "+" : ""}${feature.toFixed(2)}`;
    clearTimeout(state.predictTimer);
    state.predictTimer = setTimeout(() => requestPrediction(feature), 90);
  }

  function reset() {
    if (!state.data || state.busy) return;
    if (state.animation) {
      clearInterval(state.animation);
      state.animation = null;
    }
    state.trained = false;
    state.theta = state.data.theta;
    setInitial(state.data);
    Sound.play("back");
  }

  function bind() {
    el.trainBtn.addEventListener("click", train);
    el.resetBtn.addEventListener("click", reset);
    el.feature.addEventListener("input", runPrediction);
    el.progress.parentElement.style.transition = "none";
  }

  async function load() {
    try {
      const response = await fetch("/api/qml");
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudo cargar el laboratorio.");
      setInitial(data);
    } catch (error) {
      el.status.textContent = "El laboratorio no respondió. Recarga la página para reintentar.";
      state.callbacks.toast(error.message || "No se pudo cargar el laboratorio QML.", "error");
    }
  }

  window.QLab = {
    init(options) {
      if (state.initialized) return;
      cacheElements();
      state.callbacks = options || {};
      if (options && options.guardianLevel) {
        el.guardian.innerHTML = QSVG.guardian(options.guardianLevel);
      }
      const qubiFloat = document.createElement("div");
      qubiFloat.className = "qml-qubi-float";
      qubiFloat.innerHTML = QSVG.qubi();
      el.chartWrap.appendChild(qubiFloat);
      bind();
      state.initialized = true;
      load();
    },
    activate() {
      if (!state.initialized) return;
      if (!state.data) load();
    },
    cancel() {
      if (state.animation) {
        clearInterval(state.animation);
        state.animation = null;
      }
      clearTimeout(state.predictTimer);
      if (state.busy) {
        state.busy = false;
        setBusy(false);
      }
    },
    setProgressDots(html) {
      if (el.dots) el.dots.innerHTML = html;
    },
    hardReset() {
      if (!state.initialized) return;
      if (state.animation) {
        clearInterval(state.animation);
        state.animation = null;
      }
      clearTimeout(state.predictTimer);
      state.busy = false;
      state.trained = false;
      if (state.data) setInitial(state.data);
    },
    getTrained() {
      return { trained: state.trained, accuracy: state.accuracy, theta: state.theta };
    },
  };
})();
