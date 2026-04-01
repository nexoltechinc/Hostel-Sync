import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-6 text-[var(--color-text-strong)] sm:px-6 sm:py-8"
      style={{ background: "var(--login-page-bg)" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0" style={{ background: "var(--login-page-bg)" }} />
        <div className="absolute inset-0 opacity-90" style={{ background: "var(--login-vignette)" }} />
        <div className="absolute inset-0 login-grid opacity-[0.14]" />
        <div
          className="absolute left-1/2 top-[5rem] h-[22rem] w-[22rem] -translate-x-1/2 rounded-full blur-[110px]"
          style={{ background: "radial-gradient(circle, rgba(101, 121, 246, 0.22) 0%, rgba(101, 121, 246, 0.08) 38%, transparent 72%)" }}
        />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl items-center justify-center">
        <section
          className="relative w-full max-w-[560px] rounded-[32px] border px-5 py-6 backdrop-blur-[20px] sm:px-8 sm:py-8"
          style={{
            background: "var(--login-card-bg)",
            borderColor: "var(--login-card-border)",
            boxShadow: "var(--login-card-shadow)",
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 rounded-[32px] opacity-90"
            style={{ boxShadow: "inset 0 1px 0 var(--login-card-highlight), inset 0 -1px 0 rgba(255,255,255,0.02)" }}
          />
          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />

          <div className="relative z-10 space-y-6">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--login-copy)] transition hover:text-[var(--color-text-strong)]">
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </Link>

            <div className="space-y-3 text-center">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6d94ff_0%,#3658ff_55%,#2840c9_100%)] text-white shadow-[0_16px_36px_rgba(55,82,255,0.34)]">
                <Mail className="h-6 w-6" />
              </span>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: "var(--login-meta-text)" }}>
                  Password Recovery
                </p>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[var(--color-text-strong)] sm:text-4xl">Forgot Password?</h1>
                <p className="mx-auto max-w-md text-sm leading-6 sm:text-base" style={{ color: "var(--login-copy)" }}>
                  Password reset is handled by your hostel administrator. Share your registered email or username and request a reset.
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[var(--color-text-strong)]">Registered Email or Username</span>
                <input
                  type="text"
                  placeholder="Enter your registered email or username"
                  className="w-full rounded-[1.25rem] border px-4 py-3 text-sm outline-none transition focus:border-[var(--login-field-border-strong)] focus:shadow-[0_0_0_4px_rgba(82,111,255,0.14)] sm:text-base"
                  style={{
                    background: "var(--login-field-bg)",
                    borderColor: "var(--login-field-border)",
                    color: "var(--color-text-strong)",
                  }}
                />
              </label>

              <button
                type="button"
                className="inline-flex items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,#6f98ff_0%,#456cff_38%,#314df0_72%,#283fdb_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--login-button-shadow)] transition hover:-translate-y-0.5 hover:brightness-110 sm:text-base"
              >
                Contact Admin for Reset
              </button>
            </div>

            <div className="rounded-2xl border px-4 py-4 text-sm" style={{ borderColor: "var(--login-badge-border)", backgroundColor: "var(--login-badge-bg)" }}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[radial-gradient(circle,rgba(123,148,255,0.18)_0%,rgba(123,148,255,0.04)_72%)]">
                  <ShieldCheck className="h-4 w-4 text-[#7b94ff]" />
                </span>
                <div>
                  <p className="font-medium text-[var(--color-text-strong)]">Secure recovery workflow</p>
                  <p className="mt-1 leading-6" style={{ color: "var(--login-copy)" }}>
                    For security, password resets are completed manually by authorized management. No self-service reset is exposed publicly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
