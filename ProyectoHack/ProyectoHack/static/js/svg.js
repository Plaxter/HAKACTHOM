(function () {
  const QSVG = {};

  QSVG.qubi = function qubi(mood) {
    const moodClass = mood ? " mood-" + mood : "";
    return `
      <svg viewBox="0 0 220 236" class="qubi-art${moodClass}" role="img" aria-label="Qubi, tu compañero cuántico">
        <ellipse class="qubi-shadow" cx="110" cy="220" rx="58" ry="10" fill="rgba(0,0,0,.38)"/>
        <g class="qubi-float">
          <g class="qubi-antenna">
            <path d="M110 50 C110 30 128 28 134 16" fill="none" stroke="#B49CFF" stroke-width="4" stroke-linecap="round"/>
            <ellipse cx="136" cy="14" rx="16" ry="6" fill="none" stroke="#7CFFCB" stroke-width="1.4" opacity=".55" transform="rotate(-20 136 14)"/>
            <circle cx="136" cy="14" r="7" fill="#7CFFCB" filter="url(#softGlow)"/>
            <circle cx="134" cy="12" r="2.2" fill="#fff" opacity=".9"/>
          </g>
          <g class="qubi-fins">
            <path d="M35 108 C18 93 13 118 28 129 C33 133 40 135 47 134" fill="#6D4FE0" stroke="#9B7BFF" stroke-width="2"/>
            <path d="M185 108 C202 93 207 118 192 129 C187 133 180 135 173 134" fill="#6D4FE0" stroke="#9B7BFF" stroke-width="2"/>
          </g>
          <path class="qubi-body" d="M110 44 C151 44 185 68 192 110 C200 155 178 190 141 199 C126 203 94 203 79 199 C42 190 20 155 28 110 C35 68 69 44 110 44Z" fill="url(#qubiBody)" stroke="#C8B6FF" stroke-width="1.6"/>
          <ellipse class="qubi-belly" cx="110" cy="146" rx="52" ry="45" fill="url(#qubiBelly)"/>
          <ellipse class="qubi-blush" cx="61" cy="139" rx="10" ry="6" fill="#FF8ECF" opacity=".45"/>
          <ellipse class="qubi-blush" cx="159" cy="139" rx="10" ry="6" fill="#FF8ECF" opacity=".45"/>
          <g class="qubi-eyes">
            <g class="eye-open">
              <ellipse cx="81" cy="112" rx="20" ry="22" fill="#FBF8FF"/>
              <ellipse cx="139" cy="112" rx="20" ry="22" fill="#FBF8FF"/>
              <circle class="pupil" cx="84" cy="115" r="9.5" fill="#141138"/>
              <circle class="pupil" cx="136" cy="115" r="9.5" fill="#141138"/>
              <circle cx="87" cy="111" r="3.2" fill="#fff"/>
              <circle cx="139" cy="111" r="3.2" fill="#fff"/>
              <circle cx="80" cy="121" r="1.6" fill="#43E7FF" opacity=".9"/>
              <circle cx="132" cy="121" r="1.6" fill="#43E7FF" opacity=".9"/>
            </g>
            <g class="eye-happy" fill="none" stroke="#2A2050" stroke-width="4.5" stroke-linecap="round">
              <path d="M65 113 Q81 96 97 113"/>
              <path d="M123 113 Q139 96 155 113"/>
            </g>
          </g>
          <path class="qubi-mouth" d="M101 143 Q110 151 119 143" fill="none" stroke="#3A2B62" stroke-width="3" stroke-linecap="round"/>
          <ellipse class="mouth-wow" cx="110" cy="146" rx="6" ry="8" fill="#33234F"/>
          <g class="qubi-arms">
            <path d="M30 146 C17 151 14 165 23 175 C30 182 39 177 41 167" fill="url(#qubiBody)" stroke="#C8B6FF" stroke-width="1.4"/>
            <path d="M190 146 C203 151 206 165 197 175 C190 182 181 177 179 167" fill="url(#qubiBody)" stroke="#C8B6FF" stroke-width="1.4"/>
          </g>
          <ellipse cx="86" cy="204" rx="17" ry="8" fill="#5B3FC4"/>
          <ellipse cx="134" cy="204" rx="17" ry="8" fill="#5B3FC4"/>
          <g class="qubi-sparkles" fill="#7CFFCB">
            <path d="M185 64 l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" opacity=".9"/>
            <path d="M30 87 l1.5 4.5 4.5 1.5-4.5 1.5L30 99l-1.5-4.5L24 93l4.5-1.5z" opacity=".65"/>
          </g>
        </g>
      </svg>`;
  };

  const guardianAccessory = {
    bits: (p) => `
      <g fill="${p}">
        <rect x="30" y="9" width="8" height="8" rx="2" opacity=".9"/>
        <rect x="41" y="4" width="8" height="8" rx="2" opacity=".65"/>
        <rect x="52" y="9" width="8" height="8" rx="2" opacity=".9"/>
      </g>`,
    planet: (p, s) => `
      <ellipse cx="45" cy="48" rx="36" ry="12" fill="none" stroke="${s}" stroke-width="1.6" opacity=".7" transform="rotate(-18 45 48)"/>
      <circle cx="74" cy="30" r="3.5" fill="${p}" filter="url(#softGlow)"/>`,
    temple: (p) => `
      <path d="M26 27 L45 13 L64 27 Z" fill="none" stroke="${p}" stroke-width="2.4" stroke-linejoin="round"/>
      <line x1="45" y1="13" x2="45" y2="6" stroke="${p}" stroke-width="2"/>
      <circle cx="45" cy="5" r="2.6" fill="${p}" filter="url(#softGlow)"/>`,
    island: (p) => `
      <circle cx="19" cy="34" r="7" fill="none" stroke="${p}" stroke-width="1.8" opacity=".8"/>
      <circle cx="71" cy="34" r="7" fill="none" stroke="${p}" stroke-width="1.8" opacity=".8"/>
      <path d="M26 34 C34 25 56 25 64 34" fill="none" stroke="${p}" stroke-width="1.4" stroke-dasharray="2 3" opacity=".7"/>`,
    factory: (p) => `
      <g fill="none" stroke="${p}" stroke-width="1.8" opacity=".85">
        <circle cx="45" cy="48" r="36" stroke-dasharray="4 7"/>
        <path d="M45 25v10M45 61v10M22 48h10M58 48h10M29 32l7 7M54 57l7 7M61 32l-7 7M36 57l-7 7"/>
      </g>`,
    lab: (p) => `
      <g fill="${p}">
        <circle cx="19" cy="27" r="2.5" opacity=".9"/>
        <circle cx="71" cy="23" r="2" opacity=".75"/>
        <circle cx="76" cy="59" r="3" opacity=".6"/>
        <path d="M16 47 l1.8 5.2 5.2 1.8-5.2 1.8L16 61l-1.8-5.2L9 54l5.2-1.8z" opacity=".7"/>
      </g>`,
  };

  QSVG.guardian = function guardian(level) {
    const primary = level.theme.primary;
    const secondary = level.theme.secondary;
    const accessory = guardianAccessory[level.id] || guardianAccessory.planet;
    return `
      <svg viewBox="0 0 90 90" role="img" aria-label="${level.guardian}, guardián de ${level.name}">
        <g>${accessory(primary, secondary)}</g>
        <circle cx="45" cy="49" r="25" fill="#141838" stroke="${primary}" stroke-width="2" opacity=".98"/>
        <circle cx="45" cy="49" r="20.5" fill="${primary}" opacity=".16"/>
        <circle cx="39" cy="41" r="10" fill="#fff" opacity=".09"/>
        <circle cx="38.5" cy="47" r="5.8" fill="#FBFAFF"/>
        <circle cx="51.5" cy="47" r="5.8" fill="#FBFAFF"/>
        <circle cx="39" cy="48" r="2.5" fill="#161233"/>
        <circle cx="51" cy="48" r="2.5" fill="#161233"/>
        <circle cx="39.8" cy="47" r=".9" fill="#fff"/>
        <circle cx="51.8" cy="47" r=".9" fill="#fff"/>
        <path d="M41 57 Q45 60.5 49 57" fill="none" stroke="${primary}" stroke-width="1.8" stroke-linecap="round"/>
        <circle cx="33" cy="55" r="2.6" fill="${primary}" opacity=".28"/>
        <circle cx="57" cy="55" r="2.6" fill="${primary}" opacity=".28"/>
        <ellipse cx="45" cy="77" rx="20" ry="3.6" fill="${primary}" opacity=".15" filter="url(#softGlow)"/>
      </svg>`;
  };

  QSVG.portal = function portal() {
    return `
      <svg viewBox="0 0 340 340" class="portal-art" role="img" aria-label="Portal cuántico">
        <circle cx="170" cy="160" r="150" fill="url(#portalHalo)" class="portal-glow"/>
        <g class="portal-runes" stroke="var(--accent)" fill="none">
          <rect x="169" y="8" width="7" height="7" transform="rotate(45 172 11)" opacity=".8"/>
          <rect x="289" y="111" width="6" height="6" transform="rotate(45 292 114)" opacity=".6"/>
          <rect x="276" y="258" width="8" height="8" transform="rotate(45 280 262)" opacity=".7"/>
          <rect x="50" y="245" width="6" height="6" transform="rotate(45 53 248)" opacity=".55"/>
          <rect x="38" y="103" width="7" height="7" transform="rotate(45 41 106)" opacity=".7"/>
        </g>
        <g class="portal-ring">
          <circle cx="170" cy="160" r="138" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="2 13" opacity=".55"/>
          <circle cx="170" cy="160" r="128" fill="none" stroke="var(--accent-2)" stroke-width="1" opacity=".2"/>
        </g>
        <g class="portal-ring ring-2">
          <circle cx="170" cy="160" r="112" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-dasharray="48 34 12 34" opacity=".75"/>
          <path d="M170 48 A112 112 0 0 1 266 104" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" opacity=".5"/>
        </g>
        <g class="portal-ring ring-3">
          <circle cx="170" cy="160" r="96" fill="none" stroke="var(--accent-2)" stroke-width="1.5" stroke-dasharray="1 9" opacity=".65"/>
          <path d="M170 64 A96 96 0 0 0 86 207" fill="none" stroke="var(--accent-2)" stroke-width="3" stroke-linecap="round" opacity=".45"/>
        </g>
        <circle cx="170" cy="160" r="79" fill="url(#portalCore)" class="portal-core"/>
        <g class="portal-core-swirl" fill="none" stroke="#E9FDFF" stroke-linecap="round">
          <path d="M170 88 C212 88 242 118 242 160 C242 199 214 226 177 228" stroke-width="2.5" opacity=".38"/>
          <path d="M170 232 C128 232 98 202 98 160 C98 121 126 94 163 92" stroke-width="2.5" opacity=".38"/>
          <path d="M170 111 C197 111 218 132 218 160 C218 185 200 205 176 208" stroke-width="1.4" opacity=".65"/>
        </g>
        <circle cx="170" cy="160" r="10" fill="#fff" opacity=".9" filter="url(#bigGlow)"/>
        <g fill="var(--accent)" class="portal-particles">
          <circle class="portal-spark" cx="76" cy="88" r="2.4"/>
          <circle class="portal-spark" cx="262" cy="102" r="1.8"/>
          <circle class="portal-spark" cx="288" cy="204" r="2.2"/>
          <circle class="portal-spark" cx="73" cy="224" r="1.6"/>
          <circle class="portal-spark" cx="222" cy="54" r="1.5"/>
          <circle class="portal-spark" cx="108" cy="268" r="1.7"/>
        </g>
        <g class="portal-island">
          <ellipse cx="170" cy="305" rx="100" ry="17" fill="rgba(4,6,20,.55)"/>
          <path d="M84 292 C104 280 236 280 256 292 C244 306 206 318 170 318 C134 318 96 306 84 292Z" fill="#101433" stroke="var(--accent)" stroke-opacity=".25" stroke-width="1.3"/>
          <path d="M112 292 C126 286 214 286 228 292" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" opacity=".7"/>
          <path d="M62 264 l18 10 -18 10 -8 -10z" fill="#141938" stroke="var(--accent)" stroke-opacity=".3" opacity=".8"/>
          <path d="M279 235 l14 8 -14 8 -6 -8z" fill="#141938" stroke="var(--accent)" stroke-opacity=".25" opacity=".6"/>
        </g>
      </svg>`;
  };

  QSVG.worldArt = function worldArt(icon, primary, secondary) {
    const glow = `
      <circle cx="50" cy="48" r="44" fill="${primary}" opacity=".08"/>
      <circle cx="50" cy="48" r="35" fill="none" stroke="${primary}" stroke-width="1" stroke-dasharray="2 6" opacity=".45"/>
      <circle cx="15" cy="29" r="1.8" fill="${primary}" opacity=".8"/>
      <circle cx="84" cy="25" r="1.4" fill="${secondary}" opacity=".8"/>
      <circle cx="78" cy="72" r="1.8" fill="${primary}" opacity=".5"/>`;
    const arts = {
      bits: `
        <circle cx="50" cy="49" r="26" fill="#171B3D" stroke="${primary}" stroke-width="2"/>
        <g fill="${primary}">
          <rect x="34" y="35" width="12" height="12" rx="3" opacity=".95"/>
          <rect x="49" y="35" width="12" height="12" rx="3" opacity=".45"/>
          <rect x="34" y="50" width="12" height="12" rx="3" opacity=".45"/>
          <rect x="49" y="50" width="12" height="12" rx="3" opacity=".9"/>
          <rect x="60" y="24" width="7" height="7" rx="2" opacity=".8"/>
          <rect x="28" y="62" width="6" height="6" rx="2" opacity=".6"/>
        </g>
        <path d="M27 47 C22 43 20 38 21 33" fill="none" stroke="${secondary}" stroke-width="1.5" opacity=".6"/>
        <circle cx="21" cy="32" r="2" fill="${secondary}"/>`,
      planet: `
        <circle cx="50" cy="49" r="25" fill="#1A183B" stroke="${primary}" stroke-width="2"/>
        <circle cx="50" cy="49" r="25" fill="${primary}" opacity=".18"/>
        <ellipse cx="50" cy="49" rx="41" ry="13" fill="none" stroke="${secondary}" stroke-width="2" transform="rotate(-18 50 49)" opacity=".8"/>
        <ellipse cx="50" cy="49" rx="41" ry="13" fill="none" stroke="${primary}" stroke-width="1" transform="rotate(-18 50 49)" opacity=".45"/>
        <circle cx="42" cy="42" r="5" fill="${primary}" opacity=".35"/>
        <circle cx="59" cy="55" r="3.5" fill="${primary}" opacity=".25"/>
        <circle cx="76" cy="26" r="3" fill="${primary}" filter="url(#softGlow)"/>`,
      temple: `
        <path d="M28 65 L50 29 L72 65 Z" fill="#171B3D" stroke="${primary}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M36 65 L50 42 L64 65" fill="none" stroke="${primary}" stroke-width="2" opacity=".65"/>
        <path d="M43 65 V53 A7 7 0 0 1 57 53 V65" fill="${primary}" opacity=".3" stroke="${primary}" stroke-width="1.5"/>
        <path d="M50 29 V17" stroke="${primary}" stroke-width="2" stroke-linecap="round"/>
        <circle cx="50" cy="14" r="4" fill="${primary}" filter="url(#softGlow)"/>
        <path d="M22 68 H78" stroke="${secondary}" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
      island: `
        <path d="M28 63 C38 54 62 54 72 63 C65 73 35 73 28 63Z" fill="#171B3D" stroke="${primary}" stroke-width="1.8"/>
        <path d="M38 60 C45 56 55 56 62 60" fill="none" stroke="${secondary}" stroke-width="1.5" opacity=".7"/>
        <circle cx="38" cy="38" r="10" fill="${primary}" opacity=".22" stroke="${primary}" stroke-width="1.8"/>
        <circle cx="63" cy="38" r="10" fill="${secondary}" opacity=".22" stroke="${secondary}" stroke-width="1.8"/>
        <path d="M48 38 C52 34 54 34 58 36" fill="none" stroke="${primary}" stroke-width="1.8" stroke-dasharray="2 2"/>
        <circle cx="38" cy="38" r="2" fill="${primary}"/><circle cx="63" cy="38" r="2" fill="${secondary}"/>
        <path d="M50 72 v8" stroke="${primary}" stroke-width="1.4" stroke-dasharray="2 3" opacity=".5"/>`,
      factory: `
        <circle cx="50" cy="49" r="26" fill="#171B3D" stroke="${primary}" stroke-width="2"/>
        <g stroke="${primary}" stroke-width="3" stroke-linecap="round">
          <path d="M50 25v8M50 65v8M26 49h8M66 49h8M33 32l5 5M62 61l5 5M67 32l-5 5M38 61l-5 5"/>
        </g>
        <circle cx="50" cy="49" r="11" fill="${primary}" opacity=".28" stroke="${secondary}" stroke-width="1.8"/>
        <circle cx="50" cy="49" r="3.4" fill="${secondary}" filter="url(#softGlow)"/>
        <circle cx="50" cy="49" r="17" fill="none" stroke="${secondary}" stroke-width="1" stroke-dasharray="2 3" opacity=".6"/>`,
      lab: `
        <path d="M41 26 h18 M45 26 v19 L31 63 a6 6 0 0 0 5 9 h28 a6 6 0 0 0 5-9 L55 45 V26" fill="#171B3D" stroke="${primary}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M36 59 h28" stroke="${secondary}" stroke-width="2" opacity=".75"/>
        <circle cx="45" cy="64" r="2.4" fill="${secondary}"/>
        <circle cx="54" cy="67" r="1.7" fill="${primary}"/>
        <circle cx="50" cy="18" r="2.6" fill="${secondary}" filter="url(#softGlow)"/>
        <path d="M26 34 l1.5 4.5 4.5 1.5-4.5 1.5L26 46l-1.5-4.5L20 40l4.5-1.5z" fill="${primary}" opacity=".7"/>
        <circle cx="71" cy="31" r="1.7" fill="${primary}" opacity=".8"/>`,
    };
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${glow}${arts[icon] || arts.planet}</svg>`;
  };

  const badgeIcons = {
    "first-spark": "i-bolt",
    "two-worlds": "i-infinity",
    "phase-weaver": "i-spiral",
    "twin-stars": "i-linked",
    "ghz-architect": "i-network",
    "qubi-trainer": "i-chip",
    "sandbox-explorer": "i-compass",
    "perfect-constellation": "i-trophy",
  };

  QSVG.badge = function badge(iconKey) {
    const href = badgeIcons[iconKey] || "i-medal";
    return `<svg><use href="#${href}"/></svg>`;
  };

  QSVG.stars = function stars(count, big) {
    let html = `<span class="stars-row${big ? " big" : ""}" aria-label="${count} de 3 estrellas">`;
    for (let i = 0; i < 3; i += 1) {
      html += `<svg class="star-ico${i < count ? " filled" : ""}"><use href="#i-star"/></svg>`;
    }
    return html + "</span>";
  };

  QSVG.icon = function icon(name, className) {
    return `<svg class="${className || ""}"><use href="#i-${name}"/></svg>`;
  };

  window.QSVG = QSVG;
})();
