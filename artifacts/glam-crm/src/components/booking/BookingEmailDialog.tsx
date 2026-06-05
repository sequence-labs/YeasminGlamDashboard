import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateEmailMessage,
  useListEmailTemplates,
  useRenderEmailTemplate,
  type EmailTemplate,
} from "@workspace/api-client-react";
import { Copy, ExternalLink, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Props = {
  bookingId: number;
  clientId: number;
  clientEmail: string | null | undefined;
  triggerLabel?: string;
};

export function BookingEmailDialog({ bookingId, clientId, clientEmail, triggerLabel = "Email client" }: Props) {
  const [open, setOpen] = React.useState(false);
  const { data: templates = [] } = useListEmailTemplates();
  const render = useRenderEmailTemplate();
  const createMessage = useCreateEmailMessage();
  const { toast } = useToast();

  const [selectedTemplate, setSelectedTemplate] = React.useState<EmailTemplate | null>(null);
  const [to, setTo] = React.useState(clientEmail || "");
  const [subject, setSubject] = React.useState("");
  const [body, setBody] = React.useState("");

  React.useEffect(() => { if (open) setTo(clientEmail || ""); }, [open, clientEmail]);

  function pickTemplate(template: EmailTemplate) {
    setSelectedTemplate(template);
    render.mutate(
      { id: template.id, data: { bookingId, clientId } },
      {
        onSuccess: (r) => {
          setSubject(r.subject);
          setBody(r.body);
          if (r.toEmail) setTo(r.toEmail);
        },
      }
    );
  }

  function recordMessage(status: "draft" | "copied" | "opened_in_mail_app" | "marked_sent") {
    if (!to || !subject || !body) return;
    createMessage.mutate({
      data: {
        templateId: selectedTemplate?.id,
        bookingId,
        clientId,
        toEmail: to,
        subject,
        body,
        status,
      },
    });
  }

  function openInMail() {
    if (!to || !subject) return;
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    recordMessage("opened_in_mail_app");
    toast({ title: "Opened in your mail app" });
  }

  async function copyPlain() {
    await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    recordMessage("copied");
    toast({ title: "Email copied to clipboard" });
  }

  async function copyHtml() {
    const html = body.replace(/\n/g, "<br>");
    await navigator.clipboard.writeText(html);
    recordMessage("copied");
    toast({ title: "HTML copied to clipboard" });
  }

  function markSent() {
    recordMessage("marked_sent");
    toast({ title: "Logged as sent", description: "Saved to the client timeline." });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Mail className="h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <span className="crm-eyebrow">Compose · Email</span>
          <DialogTitle className="font-serif text-2xl" style={{ fontVariationSettings: "'opsz' 72" }}>
            Send a note to your client
          </DialogTitle>
          <DialogDescription>
            Pick a template, edit the merge result, then open in your mail app or copy to your hand.
          </DialogDescription>
          <div className="crm-gold-rule mt-2" />
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
          <aside className="space-y-1">
            <div className="crm-eyebrow !text-[10px]">Templates</div>
            <ul className="mt-2 space-y-1">
              {templates.length === 0 && <li className="text-xs text-muted-foreground">No templates yet.</li>}
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => pickTemplate(t)}
                    className={`w-full rounded-md border px-2.5 py-2 text-left text-sm transition-colors ${
                      selectedTemplate?.id === t.id
                        ? "border-primary/35 bg-primary/8 text-primary"
                        : "border-card-border bg-card text-foreground hover:border-primary/30"
                    }`}
                  >
                    {t.name}
                    {t.builtIn && (
                      <span className="ml-1 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">Built-in</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="space-y-3">
            <label className="block">
              <span className="crm-eyebrow !text-[10px]">To</span>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="client@email.com" />
            </label>
            <label className="block">
              <span className="crm-eyebrow !text-[10px]">Subject</span>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>
            <label className="block">
              <span className="crm-eyebrow !text-[10px]">Body</span>
              <Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-sm" />
            </label>
            <p className="text-xs text-muted-foreground">
              Tip: use <code>{`{{client_name}}`}</code>, <code>{`{{event_date}}`}</code>, <code>{`{{retainer_amount}}`}</code>,
              <code>{`{{balance_due}}`}</code>, <code>{`{{artist_name}}`}</code>, etc. The studio replaces them automatically.
            </p>
          </div>
        </div>

        <DialogFooter className="!justify-between gap-2">
          <Button variant="ghost" onClick={markSent} disabled={!to || !subject}>
            <Send className="h-4 w-4" /> Mark sent
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyPlain} disabled={!subject}>
              <Copy className="h-4 w-4" /> Copy text
            </Button>
            <Button variant="outline" onClick={copyHtml} disabled={!body}>
              <Copy className="h-4 w-4" /> Copy HTML
            </Button>
            <Button onClick={openInMail} disabled={!to || !subject}>
              <ExternalLink className="h-4 w-4" /> Open in mail app
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
