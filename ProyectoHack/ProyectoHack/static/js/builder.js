(function () {
  "use strict";

  const QQ = window.QQ;
  if (!QQ) return;

  const GATE_DESC = {
    x: "Convierte 0 en 1.",
    h: "Abre dos caminos.",
    z: "Gira la fase.",
    cx: "Control y objetivo.",
  };

  const LABELS = {
    x: "Q",
    h: "Q",
    z: "Q",
    cx: "Q",
  };

  class CircuitBuilder {
    constructor(options) {
      const config = options || {};
      this.qubits = Number(config.qubits) || 1;
      this.mount = config.mount;
      this.paletteMount = config.paletteMount;
      this.guideEl = config.guideEl;
      this.spellEl = config.spellEl;
      this.countEl = config.countEl;
      this.undoBtn = config.undoBtn;
      this.clearBtn = config.clearBtn;
      this.max = Math.min(16, Number(config.max) || 16);
      this.onChange = typeof config.onChange === "function" ? config.onChange : null;
      this.sound = config.sound !== false;
      this.operations = [];
      this.selected = null;
      this.control = null;
      this.locked = false;
      this.gates = (QQ.state.data && QQ.state.data.gates) || {};
      this.available = this.qubits >= 2 ? ["x", "h", "z", "cx"] : ["x", "h", "z"];
      this.bind();
      this.render();
      this.defaultGuide();
    }

    gateInfo(id) {
      return this.gates[id] || {
        label: id,
        symbol: id === "cx" ? "CNOT" : id.toUpperCase(),
        color: id === "cx" ? "#7CFFCB" : "#43E7FF",
      };
    }

    play(name) {
      if (this.sound && window.Sound) window.Sound.play(name);
    }

    defaultGuide() {
      if (this.locked) {
        this.guide("Circuito bloqueado mientras el portal lee tu hechizo.", "warn");
        return;
      }
      if (this.selected === "cx") {
        if (this.control === null) this.guide("Toca el cable de CONTROL para tu CNOT.", "active");
        else this.guide(`Control en Q${this.control}. Ahora toca el cable OBJETIVO.`, "active");
        return;
      }
      if (this.selected) {
        this.guide(`Toca un cable de qubit para colocar ${this.gateInfo(this.selected).label}.`, "active");
        return;
      }
      this.guide("Elige un poder y colócalo en un cable de qubit.", "");
    }

    guide(message, tone) {
      if (!this.guideEl) return;
      const paragraph = this.guideEl.querySelector("p");
      if (paragraph) paragraph.textContent = message;
      this.guideEl.classList.toggle("is-active", tone === "active");
      this.guideEl.classList.toggle("is-warn", tone === "warn");
    }

    bind() {
      if (this.paletteMount) {
        this.paletteMount.onclick = (event) => {
          const card = event.target.closest("[data-gate]");
          if (!card || this.locked) return;
          this.choose(card.dataset.gate);
        };
      }
      if (this.mount) {
        this.mount.onclick = (event) => {
          if (this.locked) return;
          const placed = event.target.closest("[data-op]");
          if (placed) {
            this.removeAt(Number(placed.dataset.op));
            return;
          }
          const wire = event.target.closest("[data-wire]");
          if (wire) {
            this.placeOnWire(Number(wire.dataset.wire));
          }
        };
      }
      if (this.undoBtn) {
        this.undoBtn.onclick = () => {
          if (this.locked) return;
          this.undo();
        };
      }
      if (this.clearBtn) {
        this.clearBtn.onclick = () => {
          if (this.locked) return;
          this.clear();
        };
      }
    }

    choose(id) {
      if (this.locked) return;
      this.selected = id;
      this.control = null;
      this.play("select");
      this.renderPalette();
      this.renderGrid();
      this.updateButtons();
      this.defaultGuide();
    }

    placeOnWire(row) {
      if (this.locked) return;
      if (!this.selected) {
        this.guide("Primero elige un poder de la paleta.", "warn");
        this.play("error");
        return;
      }
      if (row < 0 || row >= this.qubits) return;
      if (this.operations.length >= this.max) {
        this.guide(`El circuito admite hasta ${this.max} poderes. Deshaz uno para continuar.`, "warn");
        this.play("error");
        return;
      }
      if (this.selected === "cx") {
        if (this.control === null) {
          this.control = row;
          this.play("place");
          this.renderGrid();
          this.guide(`Control en Q${row}. Ahora elige el cable OBJETIVO.`, "active");
          return;
        }
        if (this.control === row) {
          this.guide("El control y el objetivo de CNOT deben ser distintos. Toca otro cable.", "warn");
          this.play("error");
          return;
        }
        const control = this.control;
        this.control = null;
        this.append({ gate: "cx", qubits: [control, row] });
        return;
      }
      this.append({ gate: this.selected, qubits: [row] });
    }

    append(operation) {
      this.operations.push(operation);
      this.play("place");
      this.render();
      if (this.operations.length >= this.max) {
        this.guide(`Circuito lleno: ${this.max} poderes. Actívalo o deshaz el último.`, "warn");
      } else {
        this.guide("Poder colocado. Añade otro o activa el portal.", "active");
      }
      if (this.onChange) this.onChange(this);
    }

    removeAt(index) {
      if (this.locked || index < 0 || index >= this.operations.length) return;
      this.operations.splice(index, 1);
      this.control = null;
      this.play("remove");
      this.render();
      this.guide("Poder eliminado. Puedes reconstruir tu hechizo.", "");
      if (this.onChange) this.onChange(this);
    }

    undo() {
      if (!this.operations.length) return;
      this.operations.pop();
      this.control = null;
      this.play("remove");
      this.render();
      this.guide("Deshiciste el último poder.", "");
      if (this.onChange) this.onChange(this);
    }

    clear() {
      if (!this.operations.length && this.selected === null) return;
      this.operations = [];
      this.control = null;
      this.selected = null;
      this.play("remove");
      this.render();
      this.guide("Circuito limpio. Elige un poder para empezar de nuevo.", "");
      if (this.onChange) this.onChange(this);
    }

    setLocked(locked) {
      this.locked = Boolean(locked);
      if (this.locked) this.control = null;
      this.render();
      if (this.locked) this.guide("Circuito bloqueado mientras el portal lee tu hechizo.", "warn");
    }

    getOperations() {
      return this.operations.map((operation) => ({
        gate: operation.gate,
        qubits: operation.qubits.slice(),
      }));
    }

    hasOperations() {
      return this.operations.length > 0;
    }

    render() {
      this.renderPalette();
      this.renderGrid();
      this.renderSpell();
      this.updateButtons();
    }

    renderPalette() {
      if (!this.paletteMount) return;
      this.paletteMount.innerHTML = this.available.map((id) => {
        const gate = this.gateInfo(id);
        const selected = this.selected === id;
        return `
          <button type="button" class="power-card${selected ? " is-selected" : ""}" data-gate="${id}"
            style="--gate-color:${gate.color}" aria-pressed="${selected}" ${this.locked ? "disabled" : ""}>
            <span class="power-icon${id === "cx" ? " wide" : ""}">${QQ.esc(gate.symbol)}</span>
            <span class="power-name">${QQ.esc(gate.label)} <em>${id === "cx" ? "CNOT" : id.toUpperCase()}</em></span>
            <span class="power-desc">${LABELS[id] ? GATE_DESC[id] : ""}</span>
          </button>`;
      }).join("");
    }

    renderGrid() {
      if (!this.mount) return;
      const columns = this.operations.length < this.max
        ? this.operations.length + 1
        : this.operations.length;
      const grid = document.createElement("div");
      grid.className = "composer-grid";
      grid.style.setProperty("--cols", String(Math.max(1, columns)));

      for (let row = 0; row < this.qubits; row += 1) {
        const label = document.createElement("div");
        label.className = "wire-label" + (this.selected === "cx" && this.control === row ? " is-armed" : "");
        label.innerHTML = `<span class="q-orb">Q${row}</span>`;
        grid.appendChild(label);

        for (let column = 0; column < Math.max(1, columns); column += 1) {
          const cell = document.createElement("div");
          cell.className = "cell";
          cell.dataset.wire = String(row);
          const operation = this.operations[column];
          if (operation) {
            if (operation.gate !== "cx" && operation.qubits[0] === row) {
              const gate = this.gateInfo(operation.gate);
              const token = document.createElement("button");
              token.type = "button";
              token.className = "gate-token";
              token.dataset.gate = operation.gate;
              token.dataset.op = String(column);
              token.style.setProperty("--gate-color", gate.color);
              token.setAttribute("aria-label", `${gate.label} en Q${row}. Toca para quitar.`);
              token.textContent = gate.symbol;
              cell.appendChild(token);
            } else if (operation.gate === "cx") {
              cell.classList.add("cnot-cell");
            } else {
              cell.classList.add("is-empty");
            }
          } else {
            const add = document.createElement("button");
            add.type = "button";
            add.className = "add-slot";
            add.dataset.wire = String(row);
            add.setAttribute("aria-label", `Añadir poder en Q${row}`);
            add.textContent = "+";
            add.disabled = this.locked;
            cell.classList.add("add-cell");
            cell.appendChild(add);
          }
          grid.appendChild(cell);
        }
      }

      const overlay = document.createElement("div");
      overlay.className = "cnot-overlay";
      this.operations.forEach((operation, index) => {
        if (operation.gate !== "cx") return;
        const control = operation.qubits[0];
        const target = operation.qubits[1];
        const top = Math.min(control, target);
        const span = Math.abs(control - target);
        if (!span) return;
        const link = document.createElement("button");
        link.type = "button";
        link.className = "cnot-link" + (control === top ? "" : " control-bottom");
        link.dataset.op = String(index);
        link.style.setProperty("--col", String(index));
        link.style.setProperty("--row-top", String(top));
        link.style.setProperty("--span", String(span));
        link.setAttribute("aria-label", `CNOT con control Q${control} y objetivo Q${target}. Toca para quitar.`);
        link.innerHTML = `<span class="cnot-dot"></span><span class="cnot-target-box"></span>`;
        overlay.appendChild(link);
      });
      if (overlay.children.length) grid.appendChild(overlay);

      this.mount.innerHTML = "";
      this.mount.appendChild(grid);
      const scroll = this.mount;
      requestAnimationFrame(() => {
        scroll.scrollLeft = scroll.scrollWidth;
      });
    }

    renderSpell() {
      if (!this.spellEl) return;
      if (!this.operations.length) {
        this.spellEl.innerHTML = '<span class="spell-empty">Todavía no hay poderes.</span>';
        return;
      }
      this.spellEl.innerHTML = this.operations.map((operation, index) => {
        const gate = this.gateInfo(operation.gate);
        const qubits = operation.gate === "cx"
          ? `Q${operation.qubits[0]}→Q${operation.qubits[1]}`
          : `Q${operation.qubits[0]}`;
        const chip = `<span class="spell-chip" style="--spell-color:${gate.color}">${QQ.esc(gate.symbol)} <small>${qubits}</small></span>`;
        return index === this.operations.length - 1 ? chip : `${chip}<span class="spell-arrow">→</span>`;
      }).join("");
    }

    updateButtons() {
      if (this.countEl) this.countEl.textContent = String(this.operations.length);
      if (this.undoBtn) this.undoBtn.disabled = this.locked || this.operations.length === 0;
      if (this.clearBtn) this.clearBtn.disabled = this.locked || (this.operations.length === 0 && this.selected === null);
    }
  }

  QQ.CircuitBuilder = CircuitBuilder;
})();
