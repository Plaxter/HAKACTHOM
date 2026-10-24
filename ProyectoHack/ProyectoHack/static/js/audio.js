(function () {
  let context = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (!enabled) return false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    if (!context) {
      context = new AudioContextClass();
      master = context.createGain();
      master.gain.value = 0.32;
      master.connect(context.destination);
    }
    if (context.state === "suspended") context.resume();
    return true;
  }

  function tone({ freq, to, start = 0, duration = 0.16, type = "sine", volume = 0.16 }) {
    if (!ensure()) return;
    const now = context.currentTime + start;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, now);
    if (to) oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  function noiseBurst({ start = 0, duration = 0.16, volume = 0.05 }) {
    if (!ensure()) return;
    const sampleRate = context.sampleRate;
    const frames = Math.floor(sampleRate * duration);
    const buffer = context.createBuffer(1, frames, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < frames; i += 1) {
      channel[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / frames, 2.2);
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1700;
    filter.Q.value = 0.8;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start(context.currentTime + start);
  }

  const sounds = {
    click() {
      tone({ freq: 420, to: 500, duration: 0.06, type: "triangle", volume: 0.1 });
    },
    select() {
      tone({ freq: 520, duration: 0.09, type: "sine", volume: 0.12 });
      tone({ freq: 780, start: 0.05, duration: 0.1, type: "sine", volume: 0.08 });
    },
    place() {
      tone({ freq: 620, to: 880, duration: 0.12, type: "triangle", volume: 0.13 });
      noiseBurst({ duration: 0.07, volume: 0.025 });
    },
    remove() {
      tone({ freq: 330, to: 220, duration: 0.12, type: "triangle", volume: 0.1 });
    },
    back() {
      tone({ freq: 360, to: 300, duration: 0.11, type: "sine", volume: 0.08 });
    },
    error() {
      tone({ freq: 240, to: 190, duration: 0.14, type: "square", volume: 0.06 });
    },
    charge() {
      tone({ freq: 90, to: 430, duration: 1.1, type: "sawtooth", volume: 0.045 });
      tone({ freq: 180, to: 720, duration: 1.1, type: "sine", volume: 0.05 });
      noiseBurst({ start: 0.3, duration: 0.7, volume: 0.02 });
    },
    success() {
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, index) => {
        tone({ freq, start: index * 0.09, duration: 0.32, type: "triangle", volume: 0.12 });
        tone({ freq: freq * 0.5, start: index * 0.09, duration: 0.2, type: "sine", volume: 0.05 });
      });
      noiseBurst({ start: 0.05, duration: 0.6, volume: 0.02 });
    },
    fail() {
      tone({ freq: 320, to: 250, duration: 0.2, type: "triangle", volume: 0.1 });
      tone({ freq: 240, to: 170, start: 0.14, duration: 0.28, type: "sine", volume: 0.09 });
    },
    star() {
      tone({ freq: 1046.5, duration: 0.18, type: "sine", volume: 0.09 });
      tone({ freq: 1568, start: 0.06, duration: 0.25, type: "sine", volume: 0.05 });
    },
    tick() {
      tone({ freq: 880, duration: 0.035, type: "sine", volume: 0.035 });
    },
    trainDone() {
      [659.25, 830.6, 987.77, 1318.5].forEach((freq, index) => {
        tone({ freq, start: index * 0.08, duration: 0.28, type: "sine", volume: 0.1 });
      });
    },
    badge() {
      [784, 1046.5, 1318.5, 1568].forEach((freq, index) => {
        tone({ freq, start: index * 0.07, duration: 0.35, type: "triangle", volume: 0.08 });
      });
    },
    portalOpen() {
      tone({ freq: 180, to: 900, duration: 0.9, type: "sine", volume: 0.08 });
      tone({ freq: 90, to: 420, duration: 1.1, type: "triangle", volume: 0.06 });
      noiseBurst({ start: 0.25, duration: 0.6, volume: 0.045 });
    },
  };

  window.Sound = {
    play(name) {
      if (!enabled) return;
      const fn = sounds[name];
      if (fn) {
        try { fn(); } catch (_error) { /* audio is decorative */ }
      }
    },
    setEnabled(value) {
      enabled = Boolean(value);
      if (!enabled && context && context.state === "running") {
        context.suspend().catch(function () {});
      } else if (enabled && context) {
        context.resume().catch(function () {});
      }
    },
    isEnabled() {
      return enabled;
    },
    unlock() {
      ensure();
    },
  };
})();
