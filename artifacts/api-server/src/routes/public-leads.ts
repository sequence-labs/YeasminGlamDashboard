import { Router, type IRouter } from "express";
import { db, leadsTable } from "@workspace/db";
import { CreatePublicLeadBody } from "@workspace/api-zod";
import {
  enqueueTaskIfMissing,
  getOrCreateAutomationSettings,
} from "../lib/scheduler";
import { createNotification } from "../lib/notifications";

const router: IRouter = Router();

// minimal in-process rate limit: 10 inserts / 10 minutes per IP
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 10;
const recentByIp = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const arr = (recentByIp.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_LIMIT) {
    recentByIp.set(ip, arr);
    return false;
  }
  arr.push(now);
  recentByIp.set(ip, arr);
  return true;
}

router.post("/public/leads", async (req, res): Promise<void> => {
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ?? req.ip ?? "unknown";
  if (!checkRateLimit(ip)) {
    res.status(429).json({ error: "Too many submissions — please try again later." });
    return;
  }
  const parsed = CreatePublicLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const userAgent = req.headers["user-agent"] ?? null;
  const [lead] = await db
    .insert(leadsTable)
    .values({
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim(),
      phone: parsed.data.phone ?? null,
      eventDate: parsed.data.eventDate ?? null,
      eventType: parsed.data.eventType ?? null,
      borough: parsed.data.borough ?? null,
      headcount: parsed.data.headcount ?? null,
      source: parsed.data.source ?? null,
      vision: parsed.data.vision ?? null,
      status: "new",
      ipAddress: ip,
      userAgent: userAgent ?? null,
    })
    .returning();

  const settings = await getOrCreateAutomationSettings();
  if (settings.inquiryAutoReplyEnabled) {
    await enqueueTaskIfMissing({
      kind: "inquiry_auto_reply",
      resourceType: "lead",
      resourceId: lead.id,
      runAt: new Date(),
    });
  }

  await createNotification({
    category: "lead",
    title: `New lead — ${lead.name}`,
    body: `${lead.eventType ?? "Inquiry"} on ${lead.eventDate ?? "TBD"}`,
    href: `/leads`,
    resourceType: "lead",
    resourceId: lead.id,
  });

  res.status(201).json({ received: true, leadId: lead.id });
});

export default router;
