import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, Inbox } from "lucide-react";
import { Link } from "wouter";
import {
  getListNotificationsQueryKey,
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format, isToday, isThisWeek, parseISO } from "date-fns";

export function NotificationBell() {
  const [open, setOpen] = React.useState(false);
  const { data: notifications = [] } = useListNotifications({
    query: {
      refetchInterval: 60_000,
      refetchOnWindowFocus: true,
      queryKey: getListNotificationsQueryKey(),
    },
  });
  const queryClient = useQueryClient();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const visibleNotifications = React.useMemo(
    () => notifications.filter((n) => n.category !== "lead"),
    [notifications],
  );
  const unread = visibleNotifications.filter((n) => !n.readAt);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
  }

  const grouped = React.useMemo(() => {
    const groups: { today: typeof visibleNotifications; week: typeof visibleNotifications; earlier: typeof visibleNotifications } = {
      today: [],
      week: [],
      earlier: [],
    };
    for (const note of visibleNotifications) {
      const at = parseISO(note.createdAt);
      if (isToday(at)) groups.today.push(note);
      else if (isThisWeek(at, { weekStartsOn: 1 })) groups.week.push(note);
      else groups.earlier.push(note);
    }
    return groups;
  }, [visibleNotifications]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open notifications"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-card-border bg-card text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:outline-none"
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          {unread.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto px-0">
        <SheetHeader className="px-6">
          <span className="crm-eyebrow">Atelier · Inbox</span>
          <SheetTitle className="font-serif text-2xl" style={{ fontVariationSettings: "'opsz' 72" }}>
            Notifications
          </SheetTitle>
          <SheetDescription>
            Reminders and signatures — kept calmly until you act.
          </SheetDescription>
          <div className="crm-gold-rule mt-2" />
        </SheetHeader>

        {visibleNotifications.length === 0 ? (
          <div className="flex flex-col items-center px-8 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-card-border bg-accent/50 text-muted-foreground">
              <Inbox className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <h3 className="mt-4 font-serif text-lg text-foreground" style={{ fontVariationSettings: "'opsz' 48" }}>
              No notifications yet
            </h3>
            <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
              Drafted reminders and signed contracts will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6 px-6 pb-10 pt-2">
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                disabled={unread.length === 0 || markAll.isPending}
                onClick={() => markAll.mutate(undefined, { onSuccess: refresh })}
              >
                Mark all read
              </Button>
            </div>
            {grouped.today.length > 0 && (
              <Group
                title="Today"
                items={grouped.today}
                onItemClick={(id) => markRead.mutate({ id }, { onSuccess: refresh })}
                onClose={() => setOpen(false)}
              />
            )}
            {grouped.week.length > 0 && (
              <Group
                title="This week"
                items={grouped.week}
                onItemClick={(id) => markRead.mutate({ id }, { onSuccess: refresh })}
                onClose={() => setOpen(false)}
              />
            )}
            {grouped.earlier.length > 0 && (
              <Group
                title="Earlier"
                items={grouped.earlier}
                onItemClick={(id) => markRead.mutate({ id }, { onSuccess: refresh })}
                onClose={() => setOpen(false)}
              />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Group({
  title,
  items,
  onItemClick,
  onClose,
}: {
  title: string;
  items: Array<{ id: number; title: string; body?: string | null; href?: string | null; readAt?: string | null; createdAt: string; category: string }>;
  onItemClick: (id: number) => void;
  onClose: () => void;
}) {
  return (
    <section>
      <div className="crm-eyebrow !text-[10px]">{title}</div>
      <ul className="mt-3 space-y-2">
        {items.map((note) => {
          const inner = (
            <div className={`group rounded-xl border p-3.5 transition-colors hover:border-primary/30 ${note.readAt ? "border-card-border/60 bg-card/70" : "border-primary/25 bg-primary/5"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{note.category}</div>
                  <div className="mt-0.5 text-sm font-medium text-foreground">{note.title}</div>
                  {note.body && <div className="mt-1 text-xs text-muted-foreground">{note.body}</div>}
                </div>
                <time className="shrink-0 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {format(parseISO(note.createdAt), "h:mm a")}
                </time>
              </div>
            </div>
          );
          return (
            <li key={note.id}>
              {note.href ? (
                <Link href={note.href} onClick={() => { onItemClick(note.id); onClose(); }}>
                  {inner}
                </Link>
              ) : (
                <button type="button" className="w-full text-left" onClick={() => onItemClick(note.id)}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
