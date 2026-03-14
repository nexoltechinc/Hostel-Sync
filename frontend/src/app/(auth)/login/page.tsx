import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

function HostelNightIllustration() {
  const stars: Array<[number, number, number]> = [
    [96, 90, 1.8],
    [132, 110, 1.2],
    [168, 56, 1.7],
    [201, 80, 1.1],
    [312, 84, 1.7],
    [344, 70, 1.3],
    [394, 104, 1.5],
    [422, 118, 1.1],
    [456, 82, 1.6],
  ];
  const windows: Array<[number, number, string]> = [
    [212, 107, "url(#windowWarm)"],
    [245, 107, "url(#windowCool)"],
    [278, 107, "url(#windowWarm)"],
    [212, 144, "url(#windowCool)"],
    [245, 144, "url(#windowCool)"],
    [278, 144, "url(#windowWarm)"],
    [212, 181, "url(#windowWarm)"],
    [245, 181, "url(#windowCool)"],
    [278, 181, "url(#windowCool)"],
  ];
  const lamps: Array<[number, number]> = [
    [165, 216],
    [353, 216],
  ];
  const bushes: Array<[number, number, number]> = [
    [132, 250, 18],
    [154, 255, 22],
    [366, 254, 24],
    [392, 251, 20],
    [211, 258, 24],
    [307, 260, 26],
  ];

  return (
    <svg viewBox="0 0 520 320" className="w-full drop-shadow-[0_24px_60px_rgba(15,23,42,0.65)]" aria-hidden="true">
      <defs>
        <radialGradient id="skyGlow" cx="50%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#7f92ff" stopOpacity="0.65" />
          <stop offset="45%" stopColor="#334596" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#0f132a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="buildingFace" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#31427d" />
          <stop offset="100%" stopColor="#18203f" />
        </linearGradient>
        <linearGradient id="roof" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#44579b" />
          <stop offset="100%" stopColor="#24315b" />
        </linearGradient>
        <linearGradient id="windowWarm" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#ffe7a6" />
          <stop offset="100%" stopColor="#f8bb58" />
        </linearGradient>
        <linearGradient id="windowCool" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#c4efff" />
          <stop offset="100%" stopColor="#87bfff" />
        </linearGradient>
        <linearGradient id="ground" x1="0%" x2="0%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#1d2443" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#0a0e20" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      <ellipse cx="260" cy="150" rx="175" ry="112" fill="url(#skyGlow)" />
      <circle cx="432" cy="54" r="14" fill="#f8f4ff" fillOpacity="0.92" />
      <circle cx="438" cy="48" r="14" fill="#0f132a" />

      {stars.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#d8e1ff" fillOpacity="0.82" />
      ))}

      <path
        d="M48 206c24-34 58-50 101-48 17-24 42-36 73-36 17 0 32 3 46 10 18-23 46-35 80-35 31 0 59 12 78 35 13-7 29-10 47-10 28 0 51 9 68 28 9-3 18-4 28-4v45H48Z"
        fill="#7c87c5"
        fillOpacity="0.18"
      />
      <path
        d="M0 245h40v-33h20v33h26v-46h28v46h28v-60h18v60h32v-74h24v74h35v-58h22v58h21v-88h18v88h29v-49h24v49h30v-67h20v67h20v-38h23v38h42v64H0Z"
        fill="#202949"
      />
      <path
        d="M0 272c22-10 50-16 84-16 13 0 26 1 38 3 17-16 41-25 71-25 16 0 31 3 44 8 18-15 41-23 69-23 23 0 44 6 61 16 14-7 31-11 50-11 27 0 50 8 69 24 11-3 22-4 34-4 21 0 40 5 58 15v43H0Z"
        fill="url(#ground)"
      />

      <rect x="193" y="110" width="134" height="132" rx="10" fill="url(#buildingFace)" stroke="#5b70b8" strokeOpacity="0.5" />
      <rect x="177" y="156" width="24" height="84" rx="7" fill="#223059" />
      <rect x="319" y="156" width="24" height="84" rx="7" fill="#223059" />
      <rect x="208" y="91" width="104" height="31" rx="8" fill="url(#roof)" stroke="#5d72bb" strokeOpacity="0.45" />
      <rect x="220" y="72" width="79" height="24" rx="4" fill="#293763" stroke="#5d72bb" strokeOpacity="0.45" />
      <rect x="246" y="54" width="28" height="20" rx="2" fill="#233059" />
      <rect x="244" y="58" width="32" height="4" rx="1" fill="#a9b7ff" />
      <rect x="244" y="65" width="20" height="3" rx="1" fill="#d6dcff" />
      <rect x="267" y="65" width="9" height="3" rx="1" fill="#d6dcff" />

      {windows.map(([x, y, fill]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="17" height="24" rx="2" fill={fill} />
      ))}

      <path d="M236 231h48v-17c0-13-11-24-24-24s-24 11-24 24Z" fill="#f8f8ff" fillOpacity="0.9" />
      <path
        d="M238 214c4-8 12-13 22-13 9 0 17 5 21 13"
        stroke="#6a7ddd"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {[
        [241, 214],
        [248, 214],
        [255, 214],
        [262, 214],
        [269, 214],
        [276, 214],
      ].map(([x, y]) => (
        <line key={`${x}-${y}`} x1={x} y1={y} x2={x} y2={231} stroke="#6a7ddd" strokeWidth="2.5" />
      ))}
      <rect x="245" y="231" width="30" height="23" rx="3" fill="#f0c4a7" />
      <rect x="257" y="231" width="6" height="23" fill="#d79e77" />
      <circle cx="259" cy="243" r="1.7" fill="#8f6248" />

      <rect x="205" y="227" width="18" height="14" rx="2" fill="#f0c4a7" />
      <rect x="297" y="227" width="18" height="14" rx="2" fill="#f0c4a7" />

      {lamps.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x + 3} cy={y - 1} r="11" fill="#fce7a1" fillOpacity="0.35" />
          <rect x={x} y={y} width="6" height="26" rx="2" fill="#7182bd" />
          <circle cx={x + 3} cy={y - 2} r="4" fill="#fff0b7" />
        </g>
      ))}

      {bushes.map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#23304d" />
      ))}
    </svg>
  );
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = typeof searchParams?.next === "string" ? searchParams.next : undefined;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090c1a] px-4 py-6 text-white sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(111,130,255,0.28),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(22,34,77,0.55),_transparent_38%),linear-gradient(180deg,_#11172f_0%,_#090c1a_48%,_#090c1a_100%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.65)_0,transparent_1.2px),radial-gradient(circle_at_80%_32%,rgba(255,255,255,0.55)_0,transparent_1.1px),radial-gradient(circle_at_32%_76%,rgba(255,255,255,0.5)_0,transparent_1.4px),radial-gradient(circle_at_72%_68%,rgba(255,255,255,0.45)_0,transparent_1.3px)] [background-size:240px_240px]" />
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(122,144,255,0.28)_0%,_rgba(122,144,255,0.08)_42%,_transparent_72%)] blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center">
        <div className="w-full max-w-[760px]">
          <div className="mx-auto w-full max-w-[560px] px-3 sm:px-8">
            <HostelNightIllustration />
          </div>

          <div className="relative -mt-10 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(23,28,53,0.92)_0%,rgba(16,19,37,0.96)_100%)] px-4 py-5 shadow-[0_24px_90px_rgba(3,6,18,0.8)] backdrop-blur-xl sm:-mt-14 sm:px-8 sm:py-8 md:px-10 md:py-10">
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <LoginForm nextPath={nextPath} />
          </div>
        </div>
      </div>
    </main>
  );
}
