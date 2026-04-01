import { HostelHeroIllustration } from "@/components/auth/hostel-hero-illustration";
import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams?: Promise<{
    next?: string | string[];
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const nextPath = typeof resolvedSearchParams?.next === "string" ? resolvedSearchParams.next : undefined;

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-6 text-[var(--color-text-strong)] sm:px-6 sm:py-8" style={{ background: "var(--login-page-bg)" }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ background: "var(--login-page-bg)" }} />
        <div className="absolute inset-0 opacity-90" style={{ background: "var(--login-vignette)" }} />
        <div className="theme-dark-only absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.52)_0,transparent_1.2px),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.36)_0,transparent_1.15px),radial-gradient(circle_at_28%_70%,rgba(255,255,255,0.24)_0,transparent_1px),radial-gradient(circle_at_68%_72%,rgba(255,255,255,0.2)_0,transparent_1px)] [background-size:260px_260px]" />
        <div
          className="absolute left-1/2 top-[4rem] h-[25rem] w-[25rem] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(103, 123, 246, 0.24) 0%, rgba(103, 123, 246, 0.08) 38%, transparent 74%)" }}
        />
        <div
          className="absolute left-1/2 top-[11rem] h-28 w-[70%] max-w-[720px] -translate-x-1/2 rounded-[999px] opacity-65 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(34, 44, 101, 0.34) 0%, transparent 74%)" }}
        />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-[linear-gradient(180deg,transparent_0%,rgba(5,8,20,0.18)_28%,rgba(4,6,16,0.78)_100%)]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[980px] items-center justify-center">
        <div className="w-full">
          <div className="relative mx-auto w-full max-w-[760px] px-2 pt-4 sm:pt-8">
            <div
              className="absolute left-1/2 top-[8%] h-56 w-[58%] -translate-x-1/2 rounded-[999px] opacity-85 blur-[94px]"
              style={{ background: "radial-gradient(circle, rgba(108, 129, 255, 0.22) 0%, rgba(108, 129, 255, 0.08) 48%, transparent 78%)" }}
            />
            <div
              className="absolute left-1/2 top-[12%] h-[74%] w-[72%] -translate-x-1/2 rounded-[50%] opacity-80 blur-sm"
              style={{ background: "radial-gradient(circle at 50% 34%, rgba(255,255,255,0.06) 0%, rgba(116,140,255,0.12) 36%, transparent 76%)" }}
            />
            <div className="absolute left-1/2 bottom-[15%] h-24 w-[44%] -translate-x-1/2 rounded-[999px] opacity-60 blur-3xl" style={{ background: "var(--login-floor-glow)" }} />

            <div className="mx-auto w-full max-w-[500px] login-illustration-float login-hero-mask sm:max-w-[560px]">
              <HostelHeroIllustration />
            </div>

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24" style={{ background: "var(--login-hero-bottom-fade)" }} />
          </div>

          <section className="relative z-10 -mt-16 px-2 sm:-mt-20">
            <div
              className="absolute left-1/2 top-2 h-20 w-[54%] -translate-x-1/2 rounded-[999px] opacity-55 blur-3xl"
              style={{ background: "radial-gradient(circle, rgba(74, 100, 228, 0.3) 0%, transparent 74%)" }}
            />

            <div
              className="login-card-enter relative mx-auto w-full max-w-[640px] rounded-[38px] border px-4 py-6 backdrop-blur-[20px] sm:px-9 sm:py-9"
              style={{
                background: "var(--login-card-bg)",
                borderColor: "var(--login-card-border)",
                boxShadow: "var(--login-card-shadow)",
              }}
            >
              <div
                className="pointer-events-none absolute inset-0 rounded-[38px] opacity-90"
                style={{ boxShadow: "inset 0 1px 0 var(--login-card-highlight), inset 0 -1px 0 rgba(255,255,255,0.02)" }}
              />
              <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
              <div
                className="pointer-events-none absolute -top-10 left-1/2 h-20 w-[56%] -translate-x-1/2 rounded-[999px] opacity-50 blur-3xl"
                style={{ background: "radial-gradient(circle, rgba(112, 136, 255, 0.18) 0%, transparent 74%)" }}
              />

              <div className="relative z-10">
                <LoginForm nextPath={nextPath} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
