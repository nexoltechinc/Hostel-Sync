import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

function HostelFacadeIllustration() {
  const windowRows: Array<[number, number, string]> = [
    [392, 212, "#ffd97a"],
    [452, 212, "#aedfff"],
    [512, 212, "#ffd97a"],
    [392, 288, "#acd7ff"],
    [452, 288, "#acd7ff"],
    [512, 288, "#ffd97a"],
    [392, 364, "#ffd97a"],
    [452, 364, "#a9dbff"],
    [512, 364, "#a9dbff"],
  ];
  const skyline: Array<[number, number, number, number]> = [
    [74, 426, 36, 182],
    [158, 392, 52, 216],
    [260, 368, 34, 240],
    [724, 352, 40, 256],
    [798, 410, 42, 198],
  ];
  const shrubs: Array<[number, number, number]> = [
    [242, 530, 34],
    [282, 540, 42],
    [392, 548, 46],
    [560, 554, 48],
    [694, 542, 42],
    [742, 532, 36],
  ];

  return (
    <svg viewBox="0 0 960 620" className="h-auto w-full" aria-hidden="true">
      <defs>
        <linearGradient id="bgSky" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f8faff" />
          <stop offset="100%" stopColor="#e9eefb" />
        </linearGradient>
        <radialGradient id="mainGlow" cx="50%" cy="45%" r="52%">
          <stop offset="0%" stopColor="#d4dbf8" />
          <stop offset="100%" stopColor="#d4dbf8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cloudA" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#dbe1f5" />
          <stop offset="100%" stopColor="#c7d0f1" />
        </linearGradient>
        <linearGradient id="cloudB" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#d3daf2" />
          <stop offset="100%" stopColor="#c2ccec" />
        </linearGradient>
        <linearGradient id="buildingMain" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#33427c" />
          <stop offset="100%" stopColor="#26335f" />
        </linearGradient>
        <linearGradient id="buildingSide" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#2d3a6b" />
          <stop offset="100%" stopColor="#243056" />
        </linearGradient>
        <linearGradient id="awn" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#4e6cff" />
          <stop offset="100%" stopColor="#2d45c7" />
        </linearGradient>
        <linearGradient id="door" x1="0%" x2="1%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="#f1c59f" />
          <stop offset="50%" stopColor="#e8b287" />
          <stop offset="100%" stopColor="#f1c59f" />
        </linearGradient>
        <linearGradient id="lampGlow" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe9a6" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#ffe9a6" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="960" height="620" fill="url(#bgSky)" />
      <ellipse cx="480" cy="210" rx="320" ry="206" fill="url(#mainGlow)" />
      <circle cx="808" cy="64" r="25" fill="#171c3d" />

      <path
        d="M196 300c42-64 118-104 224-104 157 0 257 78 301 179H160c8-26 20-51 36-75Z"
        fill="url(#cloudA)"
        opacity="0.8"
      />
      <path
        d="M608 332c48-48 112-72 196-72 64 0 118 18 156 50v65H552c14-16 33-30 56-43Z"
        fill="url(#cloudB)"
        opacity="0.72"
      />
      <path
        d="M88 402c42-72 110-112 204-112 66 0 124 19 172 56v29H88Z"
        fill="#d0d8f0"
        opacity="0.72"
      />

      {[
        [180, 138],
        [246, 174],
        [574, 150],
        [616, 136],
        [842, 188],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="4" fill="#cfd8f7" />
      ))}

      <path
        d="M0 534c82-44 164-64 282-64 145 0 254 35 334 108H0Z"
        fill="#2a3154"
        opacity="0.16"
      />
      <path
        d="M676 544c34-28 85-48 152-48 74 0 120 17 132 48H676Z"
        fill="#2b3356"
        opacity="0.2"
      />

      {skyline.map(([x, y, width, height]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={width} height={height} fill="#283256" />
      ))}

      <rect x="0" y="476" width="960" height="144" fill="#1f2748" />
      <path d="M0 558c88-34 176-48 282-48 118 0 198 17 276 48H0Z" fill="#1a213e" />

      <rect x="354" y="160" width="252" height="258" rx="24" fill="url(#buildingMain)" />
      <rect x="384" y="118" width="192" height="72" rx="16" fill="#3b4b87" />
      <rect x="404" y="78" width="152" height="48" rx="8" fill="#33406f" />
      <rect x="426" y="44" width="108" height="20" rx="4" fill="#2d375f" />
      <rect x="430" y="24" width="100" height="16" rx="4" fill="#2b345c" />
      <rect x="426" y="56" width="38" height="8" rx="2" fill="#cad3f6" />
      <rect x="472" y="56" width="16" height="8" rx="2" fill="#cad3f6" />
      <rect x="496" y="56" width="34" height="8" rx="2" fill="#cad3f6" />

      <rect x="326" y="284" width="46" height="150" rx="14" fill="url(#buildingSide)" />
      <rect x="592" y="284" width="46" height="150" rx="14" fill="url(#buildingSide)" />
      <rect x="356" y="418" width="248" height="8" rx="4" fill="#50639e" opacity="0.4" />

      {windowRows.map(([x, y, fill]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="32" height="44" rx="4" fill={fill} />
      ))}

      <path d="M438 470h84v-28c0-24-18-43-42-43s-42 19-42 43Z" fill="#eff2fb" />
      <path d="M440 440c12-18 26-28 40-28 17 0 31 10 42 28" stroke="url(#awn)" strokeWidth="8" strokeLinecap="round" />
      {[446, 458, 470, 482, 494, 506].map((x) => (
        <line key={x} x1={x} y1="440" x2={x} y2="470" stroke="#6a7ed6" strokeWidth="6" />
      ))}
      <rect x="452" y="470" width="56" height="48" rx="6" fill="url(#door)" />
      <rect x="478" y="470" width="6" height="48" fill="#d69f7a" />
      <circle cx="481" cy="498" r="3.5" fill="#9f6545" />
      <rect x="394" y="462" width="30" height="22" rx="4" fill="#efbf99" />
      <rect x="536" y="462" width="30" height="22" rx="4" fill="#efbf99" />

      {[
        [298, 444],
        [656, 444],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x + 6} cy={y + 4} r="22" fill="url(#lampGlow)" />
          <rect x={x} y={y} width="12" height="56" rx="6" fill="#6d7fc2" />
          <circle cx={x + 6} cy={y + 4} r="8" fill="#ffebae" />
        </g>
      ))}

      {shrubs.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#2b385f" />
      ))}
    </svg>
  );
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = typeof searchParams?.next === "string" ? searchParams.next : undefined;

  return (
    <main className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f9fbff_0%,#edf1fb_100%)] px-3 py-4 text-slate-900 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col justify-between rounded-[28px] border border-white/70 bg-white/40 shadow-[0_20px_80px_rgba(129,145,184,0.14)] backdrop-blur-[6px]">
        <section className="relative px-2 pt-4 sm:px-4 sm:pt-6 md:px-6 md:pt-8">
          <HostelFacadeIllustration />
        </section>

        <section className="relative mx-auto -mt-5 w-full max-w-3xl px-3 pb-4 sm:-mt-8 sm:px-6 sm:pb-6 md:-mt-10">
          <div className="rounded-[30px] border border-white/80 bg-white/84 px-4 py-6 shadow-[0_24px_64px_rgba(137,149,180,0.18)] backdrop-blur-xl sm:px-8 sm:py-8">
            <LoginForm nextPath={nextPath} />
          </div>
        </section>
      </div>
    </main>
  );
}
