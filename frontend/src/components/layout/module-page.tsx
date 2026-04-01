"use client";

import { ChevronRight, Smartphone } from "lucide-react";
import Link from "next/link";

import { IconBadge } from "@/components/ui/icon-badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { moduleIcons, type AppModuleKey, workflowIcons, type WorkflowKey } from "@/lib/app-icons";

type WorkflowCard = {
  name: string;
  description: string;
  tag?: string;
  iconKey?: WorkflowKey;
  href?: string;
};

type ModulePageProps = {
  title: string;
  description: string;
  phase: string;
  moduleKey: AppModuleKey;
  workflows?: WorkflowCard[];
  mobileBehavior?: string[];
};

const defaultMobileBehavior = [
  "Header actions should stack cleanly on phones and stay aligned on larger screens.",
  "Forms, filters, and selectors should collapse into one-column mobile sections before widening on tablet and desktop.",
  "Dense data should switch from wide tables to cards, stacked rows, accordions, or controlled horizontal scroll only when necessary.",
];

export function ModulePage({
  title,
  description,
  phase,
  moduleKey,
  workflows = [],
  mobileBehavior = defaultMobileBehavior,
}: ModulePageProps) {
  const ModuleIcon = moduleIcons[moduleKey];

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <SectionHeading icon={ModuleIcon} eyebrow={phase} title={title} description={description} />

        <div className="panel panel-soft flex items-start gap-3 px-4 py-3 text-sm">
          <IconBadge icon={Smartphone} size="sm" tone="primary" />
          <div>
            <p className="font-medium text-[var(--color-text-strong)]">Responsive workspace</p>
            <p className="mt-1 text-[var(--color-text-soft)]">Designed to stay usable for hostel admins, wardens, accountants, and staff on any screen size.</p>
          </div>
        </div>
      </header>

      {workflows.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Included Screens</h2>
            <p className="text-xs text-[var(--color-text-muted)]">Grouped for mobile-first operations</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {workflows.map((workflow) => {
              const content = (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {workflow.iconKey ? (
                      <IconBadge icon={workflowIcons[workflow.iconKey]} size="sm" className="transition-transform group-hover:scale-110" tone="primary" />
                    ) : null}
                    <div>
                      <p className="text-base font-semibold text-[var(--color-text-strong)] transition-colors group-hover:text-[var(--color-text-strong)]">{workflow.name}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--color-text-soft)]">{workflow.description}</p>
                    </div>
                  </div>
                  {workflow.tag ? (
                    <span className="shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-text-muted)] transition-colors group-hover:border-[var(--color-border-strong)]" style={{ borderColor: "var(--color-border)" }}>
                      {workflow.tag}
                    </span>
                  ) : null}
                </div>
              );

              if (workflow.href) {
                return (
                  <Link key={workflow.name} href={workflow.href} className="group panel panel-soft panel-interactive block p-4 shadow-sm">
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={workflow.name}
                  type="button"
                  onClick={() => alert(`The "${workflow.name}" workflow is currently under active development. Keep an eye out for updates!`)}
                  className="group panel panel-soft panel-interactive block w-full p-4 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
                >
                  {content}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4">

        <div className="panel panel-soft p-6">
          <div className="flex items-center gap-2">
            <IconBadge icon={Smartphone} size="sm" tone="primary" />
            <p className="text-sm font-medium text-[var(--color-text-strong)]">Mobile behavior</p>
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-text-soft)]">
            {mobileBehavior.map((item) => (
              <li key={item} className="flex items-start gap-2 rounded-2xl border bg-white/4 px-3 py-2.5" style={{ borderColor: "var(--color-border)" }}>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
