import { useState, type FormEvent } from "react";
import { KeyRound, Soup } from "lucide-react";
import { useAuth } from "../../app/useAuth";

export function LoginPage() {
  const { signIn, signOut, session, accessError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-ink-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Soup className="h-9 w-9 text-brand-600" />
          <div>
            <h1 className="text-xl font-bold text-ink-900">Idly Express ERP</h1>
            <p className="text-sm text-ink-500">Staff sign in</p>
          </div>
        </div>

        {session && accessError ? (
          <div role="alert" className="space-y-4">
            <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{accessError}</p>
            <button className="btn-secondary w-full" onClick={() => void signOut()}>
              Sign out and try another account
            </button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className="label" htmlFor="staff-email">Email</label>
              <input
                id="staff-email"
                className="input"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="staff-password">Password</label>
              <input
                id="staff-password"
                className="input"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
            {(error || accessError) && <p role="alert" className="text-sm text-red-700">{error ?? accessError}</p>}
            <button className="btn-primary w-full" type="submit" disabled={submitting}>
              <KeyRound className="h-4 w-4" />
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}