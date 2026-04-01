"use client";

import { useTheme } from "@/providers/theme-provider";

type HostelHeroIllustrationProps = {
  className?: string;
};

const starField: Array<[number, number, number, string, string]> = [
  [132, 84, 1.6, "0s", "7.2s"],
  [188, 142, 1.2, "0.9s", "8.6s"],
  [258, 108, 1.4, "0.4s", "7.9s"],
  [324, 154, 1.3, "1.1s", "8.3s"],
  [402, 98, 1.7, "0.2s", "7.4s"],
  [468, 130, 1.2, "1.5s", "8.1s"],
  [536, 92, 1.6, "0.6s", "7.6s"],
  [624, 136, 1.2, "1.2s", "8.4s"],
  [704, 102, 1.8, "0.3s", "7.8s"],
  [770, 142, 1.3, "0.8s", "8.2s"],
  [838, 116, 1.5, "1.7s", "8.8s"],
];

const skylineFar: Array<[number, number, number, number]> = [
  [110, 356, 26, 120],
  [164, 326, 42, 150],
  [238, 286, 34, 190],
  [298, 338, 20, 138],
  [356, 268, 18, 208],
  [586, 298, 24, 178],
  [644, 328, 18, 148],
  [702, 294, 36, 182],
  [772, 346, 24, 130],
];

const skylineNear: Array<[number, number, number, number]> = [
  [82, 396, 42, 96],
  [152, 376, 30, 116],
  [228, 388, 24, 104],
  [690, 382, 30, 110],
  [744, 364, 54, 128],
  [830, 402, 28, 90],
];

const windows: Array<{ x: number; y: number; fill: string; className: string }> = [
  { x: 410, y: 206, fill: "#ffd66f", className: "login-window-warm" },
  { x: 462, y: 206, fill: "#a8d6ff", className: "login-window-cool" },
  { x: 514, y: 206, fill: "#ffd66f", className: "login-window-warm" },
  { x: 410, y: 274, fill: "#9fd1ff", className: "login-window-cool" },
  { x: 462, y: 274, fill: "#a8d6ff", className: "login-window-cool" },
  { x: 514, y: 274, fill: "#ffd66f", className: "login-window-warm" },
  { x: 410, y: 344, fill: "#ffd66f", className: "login-window-warm" },
  { x: 462, y: 344, fill: "#a8d6ff", className: "login-window-cool" },
  { x: 514, y: 344, fill: "#a8d6ff", className: "login-window-cool" },
];

const shrubs: Array<[number, number, number]> = [
  [300, 496, 26],
  [344, 502, 34],
  [390, 494, 28],
  [568, 494, 30],
  [616, 502, 34],
  [664, 496, 28],
];

export function HostelHeroIllustration({ className = "h-auto w-full" }: HostelHeroIllustrationProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const celestialLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 960 620" className="pointer-events-none h-auto w-full select-none" aria-hidden="true">
        <defs>
          <radialGradient id="heroSkyGlow" cx="50%" cy="36%" r="58%">
            <stop offset="0%" stopColor="#7086f5" stopOpacity="0.62" />
            <stop offset="36%" stopColor="#4357ad" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10162d" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="heroCloud" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#6d7dc0" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#232d56" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="heroCloudSoft" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#8090d6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#263056" stopOpacity="0.03" />
          </linearGradient>
          <linearGradient id="heroFarCity" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#4d5f9d" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#1e294b" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="heroNearCity" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#34436f" stopOpacity="0.64" />
            <stop offset="100%" stopColor="#18213f" stopOpacity="0.26" />
          </linearGradient>
          <linearGradient id="hostelBody" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#35457e" />
            <stop offset="42%" stopColor="#243260" />
            <stop offset="100%" stopColor="#19223f" />
          </linearGradient>
          <linearGradient id="hostelTrim" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#445793" />
            <stop offset="100%" stopColor="#2b3869" />
          </linearGradient>
          <linearGradient id="hostelRoof" x1="0%" x2="0%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#4b5f9d" />
            <stop offset="100%" stopColor="#313f73" />
          </linearGradient>
          <linearGradient id="awningBlue" x1="0%" x2="1%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#5e78ff" />
            <stop offset="48%" stopColor="#a4b5ff" />
            <stop offset="100%" stopColor="#4060ee" />
          </linearGradient>
          <linearGradient id="awningFabric" x1="0%" x2="1%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#f3f7ff" />
            <stop offset="50%" stopColor="#d7dff9" />
            <stop offset="100%" stopColor="#eef3ff" />
          </linearGradient>
          <linearGradient id="doorWood" x1="0%" x2="1%" y1="0%" y2="0%">
            <stop offset="0%" stopColor="#efc29f" />
            <stop offset="50%" stopColor="#e0a27a" />
            <stop offset="100%" stopColor="#f0c6a7" />
          </linearGradient>
          <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffe8a8" stopOpacity="0.95" />
            <stop offset="44%" stopColor="#ffe8a8" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#ffe8a8" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="heroGroundGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#6e87ff" stopOpacity="0.28" />
            <stop offset="60%" stopColor="#304170" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#10162d" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse cx="480" cy="210" rx="314" ry="194" fill="url(#heroSkyGlow)" />
        <ellipse cx="480" cy="442" rx="218" ry="42" fill="url(#heroGroundGlow)" />

        {starField.map(([cx, cy, r, delay, duration]) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r={r}
            fill="#d8dfff"
            fillOpacity="0.82"
            className="login-particle"
            style={{ animationDelay: delay, animationDuration: duration }}
          />
        ))}

        <path d="M212 286c42-74 146-126 268-126 150 0 250 58 292 148H174c12-8 24-16 38-22Z" fill="url(#heroCloud)" />
        <path d="M566 322c44-48 122-74 214-74 82 0 142 18 180 54v40H542c6-6 14-14 24-20Z" fill="url(#heroCloudSoft)" />

        <path
          d="M0 520c96-26 196-40 302-40 108 0 208 14 304 40H0Z"
          fill="#0f1427"
          fillOpacity="0.72"
        />

        {skylineFar.map(([x, y, width, height]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} fill="url(#heroFarCity)" />
        ))}
        {skylineNear.map(([x, y, width, height]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} fill="url(#heroNearCity)" />
        ))}

        <path d="M0 468h960v140H0Z" fill="#151b33" />
        <path d="M0 544c130-40 254-58 380-58 132 0 258 20 384 58H0Z" fill="#0d1223" />

        <g>
          <rect x="374" y="166" width="212" height="258" rx="24" fill="url(#hostelBody)" />
          <rect x="392" y="128" width="176" height="70" rx="18" fill="url(#hostelTrim)" />
          <rect x="422" y="92" width="116" height="42" rx="10" fill="url(#hostelRoof)" />
          <rect x="432" y="58" width="96" height="16" rx="4" fill="#24315a" />
          <rect x="438" y="34" width="84" height="14" rx="4" fill="#1b2547" />
          <rect x="434" y="78" width="26" height="7" rx="2" fill="#dbe4ff" />
          <rect x="470" y="78" width="18" height="7" rx="2" fill="#eff3ff" />
          <rect x="498" y="78" width="30" height="7" rx="2" fill="#dbe4ff" />

          <rect x="330" y="304" width="50" height="150" rx="16" fill="#212d53" />
          <rect x="580" y="304" width="50" height="150" rx="16" fill="#212d53" />

          <rect x="374" y="194" width="212" height="5" rx="2.5" fill="#687cc2" fillOpacity="0.36" />
          <rect x="374" y="262" width="212" height="5" rx="2.5" fill="#687cc2" fillOpacity="0.32" />
          <rect x="374" y="332" width="212" height="5" rx="2.5" fill="#687cc2" fillOpacity="0.28" />
          <rect x="374" y="422" width="212" height="8" rx="4" fill="#6c81ca" fillOpacity="0.34" />

          {windows.map(({ x, y, fill, className }) => (
            <g key={`${x}-${y}`}>
              <rect x={x - 3} y={y - 4} width="38" height="52" rx="6" fill="#1a223f" fillOpacity="0.44" />
              <rect x={x} y={y} width="30" height="44" rx="4" fill={fill} className={className} />
            </g>
          ))}

          <rect x="430" y="430" width="100" height="62" rx="12" fill="#eff4ff" />
          <path d="M436 432c12-26 30-40 44-40 16 0 32 14 44 40" stroke="url(#awningBlue)" strokeWidth="10" strokeLinecap="round" />
          {Array.from({ length: 7 }).map((_, index) => {
            const x = 440 + index * 13;
            return <line key={x} x1={x} y1="432" x2={x} y2="492" stroke={index % 2 === 0 ? "url(#awningFabric)" : "#7e90eb"} strokeWidth="8" />;
          })}

          <rect x="452" y="492" width="56" height="72" rx="8" fill="url(#doorWood)" />
          <rect x="479" y="492" width="4" height="72" fill="#d49a76" />
          <circle cx="481" cy="530" r="4" fill="#955d41" />

          <rect x="400" y="506" width="24" height="16" rx="4" fill="#ebb997" />
          <rect x="536" y="506" width="24" height="16" rx="4" fill="#ebb997" />
        </g>

        {[304, 656].map((x) => (
          <g key={x}>
            <circle cx={x} cy="444" r="32" fill="url(#lampGlow)" />
            <rect x={x - 4} y="446" width="8" height="68" rx="4" fill="#6f81cc" />
            <circle cx={x} cy="444" r="9" fill="#ffe8aa" />
          </g>
        ))}

        {shrubs.map(([cx, cy, r], index) => (
          <circle key={`${cx}-${index}`} cx={cx} cy={cy} r={r} fill={index % 2 === 0 ? "#283760" : "#223154"} />
        ))}

        <path
          d="M278 520c50-10 118-16 202-16 86 0 154 6 202 16-58 10-126 16-202 16s-144-6-202-16Z"
          fill="#1a2546"
          fillOpacity="0.76"
        />
      </svg>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={celestialLabel}
        title={celestialLabel}
        className="absolute left-[83.5%] top-[16.2%] z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/0 bg-transparent outline-none transition hover:border-white/10 hover:bg-white/[0.04] focus-visible:border-white/20 focus-visible:ring-2 focus-visible:ring-[#8aa4ff]/70"
      >
        <span className="sr-only">{celestialLabel}</span>
        {isDark ? (
          <span className="relative block h-9 w-9 rounded-full bg-[#fbfdff] shadow-[0_0_28px_rgba(255,255,255,0.16)]">
            <span className="absolute left-[38%] top-[-2%] block h-9 w-9 rounded-full bg-[#151c35]" />
          </span>
        ) : (
          <span className="relative block h-9 w-9 rounded-full bg-[#ffd873] shadow-[0_0_28px_rgba(255,216,115,0.3)]">
            <span className="absolute inset-[-10px] rounded-full bg-[#ffd873]/20 blur-md" />
          </span>
        )}
      </button>
    </div>
  );
}
