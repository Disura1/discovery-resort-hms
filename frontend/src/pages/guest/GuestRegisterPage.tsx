import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useGuestAuth } from "../../guestAuth/GuestAuthContext";

export function GuestRegisterPage() {
  const { register } = useGuestAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await register(fullName, email, password);
      navigate("/guest", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? "Could not create an account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm text-ink-400">Discovery-Resort-Muwanthanna</p>
          <h1 className="text-xl font-semibold text-brand-800">Create your account</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-ink-200 bg-white p-6">
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1" htmlFor="fullName">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              required
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Jayani Silva"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="At least 8 characters"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-800 mb-1" htmlFor="confirmPassword">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Re-enter your password"
            />
          </div>
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
          >
            {submitting ? "Creating account…" : "Create account"}
          </button>
          <p className="text-xs text-ink-400 text-center">
            Already have an account?{" "}
            <Link to="/guest/login" className="text-brand-600 hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}