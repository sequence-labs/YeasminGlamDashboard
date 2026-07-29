import type { ClientSocialLink } from "@workspace/api-client-react";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const SOCIAL_PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X / Twitter" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "youtube", label: "YouTube" },
  { value: "website", label: "Website" },
  { value: "other", label: "Other" },
] as const;

function platformLabel(platform: string) {
  return SOCIAL_PLATFORM_OPTIONS.find((option) => option.value === platform)?.label ?? platform;
}

function handlePlaceholder(platform: string) {
  if (platform === "instagram") return "@username";
  if (platform === "tiktok") return "@username";
  if (platform === "linkedin") return "in/name";
  if (platform === "website") return "Your site name";
  return "Handle or display name";
}

function isExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function cleanSocialLinks(links: ClientSocialLink[] | undefined) {
  return (links ?? [])
    .map((link) => ({
      platform: link.platform.trim().toLowerCase(),
      handle: link.handle.trim(),
      url: link.url?.trim() || null,
    }))
    .filter((link) => link.platform && link.handle)
    .slice(0, 12);
}

export function socialLinkHref(link: ClientSocialLink) {
  const directUrl = link.url?.trim();
  if (directUrl) {
    const normalizedUrl = /^[a-z][a-z\d+.-]*:/i.test(directUrl) ? directUrl : `https://${directUrl}`;
    return isExternalUrl(normalizedUrl) ? normalizedUrl : null;
  }

  const handle = link.handle.trim().replace(/^@+/, "");
  if (!handle) return null;

  const encodedHandle = encodeURIComponent(handle);
  const baseUrls: Record<string, string> = {
    instagram: `https://www.instagram.com/${encodedHandle}`,
    facebook: `https://www.facebook.com/${encodedHandle}`,
    tiktok: `https://www.tiktok.com/@${encodedHandle}`,
    x: `https://x.com/${encodedHandle}`,
    linkedin: `https://www.linkedin.com/in/${encodedHandle}`,
    youtube: `https://www.youtube.com/@${encodedHandle}`,
  };

  if (link.platform === "website") {
    const websiteUrl = /^https?:\/\//i.test(link.handle) ? link.handle : `https://${link.handle}`;
    return isExternalUrl(websiteUrl) ? websiteUrl : null;
  }

  return baseUrls[link.platform] ?? null;
}

export function SocialLinksField({
  value,
  onChange,
  disabled = false,
  showLabel = true,
}: {
  value: ClientSocialLink[];
  onChange: (links: ClientSocialLink[]) => void;
  disabled?: boolean;
  showLabel?: boolean;
}) {
  const updateLink = (index: number, patch: Partial<ClientSocialLink>) => {
    onChange(value.map((link, linkIndex) => (linkIndex === index ? { ...link, ...patch } : link)));
  };

  return (
    <div className="space-y-3">
      <div className={`flex items-center gap-3 ${showLabel ? "justify-between" : "justify-end"}`}>
        {showLabel ? (
          <div>
            <div className="crm-eyebrow !text-[10px]">Social profiles</div>
            <p className="mt-1 text-xs text-muted-foreground">Handles become clickable profile links. Add a direct URL when a platform needs one.</p>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || value.length >= 12}
          onClick={() => onChange([...value, { platform: "instagram", handle: "", url: null }])}
          data-testid="button-add-social-link"
        >
          <Plus className="h-3.5 w-3.5" />
          Add profile
        </Button>
      </div>

      {value.length > 0 ? (
        <div className="space-y-2">
          {value.map((link, index) => (
            <div key={`${index}-${link.platform}`} className="grid grid-cols-1 gap-2 rounded-lg border border-card-border/70 bg-accent/15 p-3 sm:grid-cols-[150px_1fr_1fr_auto] sm:items-center">
              <label className="sr-only" htmlFor={`social-link-platform-${index}`}>Platform</label>
              <select
                id={`social-link-platform-${index}`}
                value={link.platform}
                disabled={disabled}
                onChange={(event) => updateLink(index, { platform: event.target.value })}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
                data-testid={`select-social-link-platform-${index}`}
              >
                {SOCIAL_PLATFORM_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <label className="sr-only" htmlFor={`social-link-handle-${index}`}>Handle or display name</label>
              <Input
                id={`social-link-handle-${index}`}
                value={link.handle}
                disabled={disabled}
                onChange={(event) => updateLink(index, { handle: event.target.value })}
                placeholder={handlePlaceholder(link.platform)}
                data-testid={`input-social-link-handle-${index}`}
              />
              <label className="sr-only" htmlFor={`social-link-url-${index}`}>Direct profile URL</label>
              <Input
                id={`social-link-url-${index}`}
                value={link.url ?? ""}
                disabled={disabled}
                onChange={(event) => updateLink(index, { url: event.target.value || null })}
                placeholder="https://direct-profile-link (optional)"
                type="url"
                data-testid={`input-social-link-url-${index}`}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={disabled}
                onClick={() => onChange(value.filter((_, linkIndex) => linkIndex !== index))}
                aria-label={`Remove ${platformLabel(link.platform)} profile`}
                data-testid={`button-remove-social-link-${index}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-card-border px-4 py-3 text-sm italic text-muted-foreground">No social profiles added yet.</p>
      )}
    </div>
  );
}

export function SocialLinksList({ links }: { links?: ClientSocialLink[] | null }) {
  const validLinks = (links ?? []).filter((link) => link.handle.trim());
  if (validLinks.length === 0) {
    return <span className="italic text-muted-foreground">No social profiles added</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {validLinks.map((link, index) => {
        const href = socialLinkHref(link);
        const label = `${platformLabel(link.platform)} · ${link.handle}`;
        return href ? (
          <a
            key={`${link.platform}-${link.handle}-${index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-card-border bg-accent/30 px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            title={`Open ${label}`}
            data-testid={`link-social-${index}`}
          >
            <span className="truncate">{label}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <span key={`${link.platform}-${link.handle}-${index}`} className="inline-flex max-w-full items-center rounded-full border border-card-border bg-accent/20 px-3 py-1.5 text-xs text-muted-foreground">
            <span className="truncate">{label}</span>
          </span>
        );
      })}
    </div>
  );
}
