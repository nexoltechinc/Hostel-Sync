import { Building2, CreditCard, Users } from "lucide-react";

const CARDS = [
  {
    title: "Members",
    value: "--",
    subtitle: "Total active residents",
    icon: Users,
  },
  {
    title: "Occupancy",
    value: "--",
    subtitle: "Beds currently occupied",
    icon: Building2,
  },
  {
    title: "Collections",
    value: "--",
    subtitle: "Monthly receipts",
    icon: CreditCard,
  },
];

export default function DashboardPage() {
  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Phase 1</p>
        <h1 className="text-2xl font-semibold text-slate-900">Operations Dashboard</h1>
        <p className="text-sm text-slate-600">Authentication, RBAC, and workspace shell are now wired.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map((card) => (
          <article key={card.title} className="panel p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{card.title}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
                <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
              </div>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <card.icon className="h-4 w-4" />
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
