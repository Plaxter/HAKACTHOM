(function () {
  "use strict";

  const $ = QQ.$;

  function showBootError(message) {
    const start = $("#btn-start");
    if (start) {
      start.disabled = true;
      const label = start.querySelector("span");
      if (label) label.textContent = "Servidor no disponible";
    }
    const lead = $(".intro-lead");
    if (lead) {
      lead.textContent = "No pudimos despertar la Academia de los Qubits. Ejecuta el servidor Flask con python app.py y recarga esta página.";
    }
    const qubi = $("#intro-qubi");
    if (qubi && window.QSVG) qubi.innerHTML = window.QSVG.qubi();
    QQ.toast(message || "No pudimos conectar con el simulador cuántico.", "error", 6000);
  }

  async function boot() {
    try {
      const response = await fetch("/api/levels", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("El servidor no respondió con los mundos de la academia.");
      const data = await response.json();
      if (!data || data.ok === false || !Array.isArray(data.levels) || !data.levels.length) {
        throw new Error(data && data.error ? data.error : "La academia llegó incompleta.");
      }

      QQ.state.data = data;
      const existing = QQ.loadSave();
      if (existing) QQ.state.save = existing;

      QQ.initCore();
      QQ.initLevel();
      QQ.initExtras();
      if (typeof QQ.initMapWorld === "function") QQ.initMapWorld();
      if (typeof QQ.initLevelRoom === "function") QQ.initLevelRoom();
    } catch (error) {
      console.error("¡Super Qubit! no pudo iniciar:", error);
      showBootError(error.message);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
