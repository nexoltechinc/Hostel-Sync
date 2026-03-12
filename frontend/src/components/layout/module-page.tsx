type ModulePageProps = {
  title: string;
  description: string;
  phase: string;
};

export function ModulePage({ title, description, phase }: ModulePageProps) {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{phase}</p>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-600">{description}</p>
      </header>

      <div className="panel p-6">
        <p className="text-sm text-slate-600">
          This module shell is ready. The business logic and data workflows will be implemented in its designated phase.
        </p>
      </div>
    </section>
  );
}
