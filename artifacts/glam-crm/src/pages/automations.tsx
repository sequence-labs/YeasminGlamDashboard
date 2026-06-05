import * as React from "react";
import { Shell } from "@/components/layout/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  getGetAutomationSettingsQueryKey,
  getListScheduledTasksQueryKey,
  useGetAutomationSettings,
  useListScheduledTasks,
  useRunAutomations,
  useUpdateAutomationSettings,
  type AutomationSettings,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Play, Wand2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TASK_LABELS: Record<string, string> = {
  retainer_reminder: "Retainer reminder",
  balance_reminder: "Balance reminder",
  day_before_confirm: "Day-before confirmation",
  thank_you: "Thank-you & review",
  inquiry_auto_reply: "Inquiry auto-reply",
};

export default function AutomationsPage() {
  const { data: settings, isLoading } = useGetAutomationSettings();
  const { data: tasks = [] } = useListScheduledTasks();
  const queryClient = useQueryClient();
  const update = useUpdateAutomationSettings();
  const runNow = useRunAutomations();
  const { toast } = useToast();

  function refresh() {
    queryClient.invalidateQueries({ queryKey: getGetAutomationSettingsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListScheduledTasksQueryKey() });
  }

  return (
    <Shell>
      <div className="space-y-7 sm:space-y-9">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="crm-eyebrow">Studio · Automations</span>
            <h1 className="crm-page-title mt-2">Reminders & follow-ups</h1>
            <p className="crm-page-subtitle">
              The studio prepares drafts on schedule. You approve each one before it sends.
            </p>
            <div className="crm-gold-rule mt-6 w-24" />
          </div>
          <Button
            disabled={runNow.isPending}
            onClick={() =>
              runNow.mutate(undefined, {
                onSuccess: (r) => {
                  refresh();
                  toast({ title: "Automations ran", description: `${r.completed} completed, ${r.failed} failed.` });
                },
              })
            }
          >
            <Play className="h-4 w-4" /> Run now
          </Button>
        </header>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <section className="crm-section overflow-hidden">
            <div className="border-b border-card-border/70 px-6 py-5">
              <span className="crm-eyebrow">Schedules</span>
              <h2 className="crm-section-title mt-1">What to prepare</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                When a schedule fires, the studio drafts a message and notifies you. Nothing sends without your tap.
              </p>
            </div>
            {isLoading || !settings ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="divide-y divide-card-border/60">
                <AutomationRow
                  title="Retainer reminder"
                  detail="Days after booking created without a paid retainer."
                  enabled={settings.retainerReminderEnabled}
                  days={settings.retainerReminderDays}
                  onToggle={(v) => update.mutate({ data: { retainerReminderEnabled: v } }, { onSuccess: refresh })}
                  onDays={(v) => update.mutate({ data: { retainerReminderDays: v } }, { onSuccess: refresh })}
                />
                <AutomationRow
                  title="Balance reminder"
                  detail="Days before event without a paid balance."
                  enabled={settings.balanceReminderEnabled}
                  days={settings.balanceReminderDays}
                  onToggle={(v) => update.mutate({ data: { balanceReminderEnabled: v } }, { onSuccess: refresh })}
                  onDays={(v) => update.mutate({ data: { balanceReminderDays: v } }, { onSuccess: refresh })}
                />
                <AutomationRow
                  title="Day-before confirmation"
                  detail="Logistics & timing the day before the event."
                  enabled={settings.dayBeforeReminderEnabled}
                  onToggle={(v) => update.mutate({ data: { dayBeforeReminderEnabled: v } }, { onSuccess: refresh })}
                />
                <AutomationRow
                  title="Thank-you & review"
                  detail="Days after the event completes."
                  enabled={settings.thankYouEnabled}
                  days={settings.thankYouDays}
                  onToggle={(v) => update.mutate({ data: { thankYouEnabled: v } }, { onSuccess: refresh })}
                  onDays={(v) => update.mutate({ data: { thankYouDays: v } }, { onSuccess: refresh })}
                />
                <AutomationRow
                  title="Inquiry auto-reply"
                  detail="Draft a reply ready to send when a new lead arrives."
                  enabled={settings.inquiryAutoReplyEnabled}
                  onToggle={(v) => update.mutate({ data: { inquiryAutoReplyEnabled: v } }, { onSuccess: refresh })}
                />
              </div>
            )}
          </section>

          <section className="crm-section overflow-hidden">
            <div className="border-b border-card-border/70 px-6 py-5">
              <span className="crm-eyebrow">Queue</span>
              <h2 className="crm-section-title mt-1">Upcoming &amp; recent tasks</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The last 20 entries from the scheduler.
              </p>
            </div>
            {tasks.length === 0 ? (
              <div className="flex flex-col items-center px-8 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-card-border bg-accent/50 text-foreground/70">
                  <Wand2 className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <h3 className="mt-4 font-serif text-lg text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>
                  Nothing scheduled
                </h3>
                <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
                  Tasks appear here after you create bookings.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-card-border/60">
                {tasks.slice(0, 20).map((task) => (
                  <li key={task.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-6 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">{TASK_LABELS[task.kind] || task.kind}</div>
                      <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        {task.resourceType ?? "—"} · {task.runAt ? formatDistanceToNow(parseISO(task.runAt), { addSuffix: true }) : ""}
                      </div>
                      {task.error && <div className="mt-1 truncate text-xs text-destructive">{task.error}</div>}
                    </div>
                    <Badge variant="outline" className={statusTone(task.status)}>{task.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </Shell>
  );
}

function AutomationRow({
  title,
  detail,
  enabled,
  days,
  onToggle,
  onDays,
}: {
  title: string;
  detail: string;
  enabled: boolean;
  days?: number;
  onToggle: (v: boolean) => void;
  onDays?: (v: number) => void;
}) {
  const [draftDays, setDraftDays] = React.useState(days ?? 0);
  React.useEffect(() => { setDraftDays(days ?? 0); }, [days]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 py-4">
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{detail}</div>
      </div>
      <div className="flex items-center gap-3">
        {typeof days === "number" && onDays && (
          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              min={0}
              max={365}
              value={draftDays}
              onChange={(e) => setDraftDays(Number(e.target.value) || 0)}
              onBlur={() => { if (draftDays !== days) onDays(draftDays); }}
              className="h-8 w-16 text-center text-sm tabular-nums"
            />
            <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">days</span>
          </div>
        )}
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
    </div>
  );
}

function statusTone(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-700/20 bg-emerald-700/8 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/10 dark:text-emerald-300";
    case "failed":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "pending":
      return "border-primary/25 bg-primary/8 text-primary";
    default:
      return "border-card-border bg-muted/60 text-foreground/80";
  }
}

// Keep AutomationSettings type referenced for downstream usage.
export type { AutomationSettings };
