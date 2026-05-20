import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { apiUrl, authHeaders, clearStoredSessionToken, storeSessionToken } from "@/lib/api-base";

type SessionStatus = {
  authenticated: boolean;
  authRequired: boolean;
  token?: string;
};

function isLocalDevelopmentHost() {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;

  const hostname = window.location.hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
}

async function readSession(): Promise<SessionStatus> {
  const response = await fetch(apiUrl("/api/session"), {
    credentials: "include",
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Unable to check session");
  return response.json() as Promise<SessionStatus>;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = React.useState(true);
  const [authenticated, setAuthenticated] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    if (isLocalDevelopmentHost()) {
      setAuthenticated(true);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    readSession()
      .then((session) => {
        if (cancelled) return;
        if (session.authenticated) {
          storeSessionToken(session.token);
        } else {
          clearStoredSessionToken();
        }
        setAuthenticated(session.authenticated);
      })
      .catch(() => {
        if (!cancelled) {
          clearStoredSessionToken();
          setAuthenticated(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(apiUrl("/api/session"), {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        setError("Password did not match.");
        return;
      }

      const session = await response.json() as SessionStatus;
      storeSessionToken(session.token);
      setAuthenticated(true);
    } catch {
      setError("Could not connect to the CRM API.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="crm-section flex items-center gap-3 px-5 py-4">
          <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">Checking access…</span>
        </div>
      </div>
    );
  }

  if (authenticated) return <>{children}</>;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md crm-fade-up">
        <div className="crm-section overflow-hidden p-8 sm:p-10">
          {/* Brand block */}
          <div className="flex items-center gap-3">
            <div className="crm-monogram h-11 w-11">
              <Sparkles className="h-5 w-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="crm-eyebrow">Glam Studio</div>
              <div className="text-[15px] font-semibold tracking-tight text-foreground">
                Atelier access
              </div>
            </div>
          </div>

          <div className="crm-gold-rule my-7" />

          <h1
            className="font-serif text-[2rem] leading-[1.05] text-foreground"
            style={{ fontVariationSettings: "'opsz' 128", letterSpacing: "-0.025em" }}
          >
            Sign in to the studio.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Private workspace for clients, bookings, contracts, and payments.
            Enter the studio password to continue.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="admin-password"
                className="crm-eyebrow mb-2 block"
              >
                Studio password
              </label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                className="text-[15px]"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={submitting || password.length === 0}
            >
              {submitting ? "Unlocking…" : "Unlock studio"}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Private · authorised use only
        </p>
      </div>
    </div>
  );
}
