import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiUrl, authHeaders, clearStoredSessionToken, storeSessionToken } from "@/lib/api-base";

type SessionStatus = {
  authenticated: boolean;
  authRequired: boolean;
  token?: string;
};

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking access...</div>
      </div>
    );
  }

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <form onSubmit={submit} className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Alyaan Inc.</p>
          <h1 className="mt-2 text-2xl font-serif text-foreground">Glam CRM Access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the private admin password to view clients, bookings, contracts, and payments.
          </p>
        </div>
        <label className="text-sm font-medium text-foreground" htmlFor="admin-password">
          Admin password
        </label>
        <Input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2"
          autoComplete="current-password"
          autoFocus
        />
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <Button type="submit" className="mt-5 w-full" disabled={submitting || password.length === 0}>
          {submitting ? "Unlocking..." : "Unlock CRM"}
        </Button>
      </form>
    </div>
  );
}
