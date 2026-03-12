import { LoginForm } from "@/components/auth/login-form";

type LoginPageProps = {
  searchParams?: {
    next?: string | string[];
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = typeof searchParams?.next === "string" ? searchParams.next : undefined;

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-xl shadow-slate-200/40 backdrop-blur md:grid md:grid-cols-[1fr_420px] md:p-8">
        <section className="hidden space-y-4 rounded-2xl bg-slate-900 p-8 text-white md:block">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">One Hostel Manager</p>
          <h2 className="text-3xl font-semibold leading-tight">Unified hostel operations with role-safe access</h2>
          <p className="text-sm text-slate-300">
            Centralized management for admissions, room allotments, fees, attendance, and reporting.
          </p>
        </section>
        <div className="flex items-center justify-center p-2 md:p-4">
          <LoginForm nextPath={nextPath} />
        </div>
      </div>
    </main>
  );
}
