import { useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGuestAuth } from "../../guestAuth/GuestAuthContext";

export function GuestLoginPage() {
  const { requestOtp, verifyOtp } = useGuestAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await requestOtp(email);
      setStep("code");
      setInfo("We've sent a 6-digit code to your email. It expires in 10 minutes.");
      startCooldown();
    } catch {
      setError("Could not send a code right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function startCooldown() {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      await requestOtp(email);
      setInfo("A new code has been sent.");
      startCooldown();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? "Please wait before requesting another code.");
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await verifyOtp(email, code, fullName || undefined);
      const from = (location.state as { from?: string })?.from ?? "/guest";
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message ?? "That code didn't work. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-sm text-ink-400">Grand Lotus Hotel</p>
          <h1 className="text-xl font-semibold text-brand-800">Guest sign in</h1>
        </div>

        {step === "email" && (
          <form onSubmit={handleRequestOtp} className="space-y-4 rounded-lg border border-ink-200 bg-white p-6">
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="you@example.com"
              />
            </div>
            {error && <p className="text-sm text-danger-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {submitting ? "Sending code…" : "Send me a login code"}
            </button>
            <p className="text-xs text-ink-400 text-center">
              No password needed — we'll email you a 6-digit code.
            </p>
          </form>
        )}

        {step === "code" && (
          <form onSubmit={handleVerify} className="space-y-4 rounded-lg border border-ink-200 bg-white p-6">
            {info && <p className="text-sm text-brand-800">{info}</p>}
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1" htmlFor="code">
                6-digit code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm tracking-[0.3em] text-center text-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="000000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-800 mb-1" htmlFor="fullName">
                Your name <span className="text-ink-400 font-normal">(first time only)</span>
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                placeholder="Jayani Silva"
              />
            </div>
            {error && <p className="text-sm text-danger-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting || code.length !== 6}
              className="w-full rounded-md bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {submitting ? "Verifying…" : "Verify and sign in"}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="w-full text-xs text-ink-400 hover:text-brand-600 disabled:opacity-50"
            >
              {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
              }}
              className="w-full text-xs text-ink-400 hover:text-brand-600"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
