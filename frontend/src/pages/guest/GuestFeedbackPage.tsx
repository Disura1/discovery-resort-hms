import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { guestPortalApi } from "../../api/guestEndpoints";

export function GuestFeedbackPage() {
  const [searchParams] = useSearchParams();
  const reservationId = searchParams.get("reservation") ?? undefined;

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await guestPortalApi.submitFeedback({ reservationId, rating, comment: comment || undefined });
      setSubmitted(true);
    } catch {
      setError("Could not submit your feedback right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-md mx-auto text-center space-y-2 py-12">
        <h1 className="text-xl font-semibold text-brand-800">Thank you!</h1>
        <p className="text-sm text-ink-600">Your feedback helps us improve. We appreciate you taking the time.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-semibold text-ink-800">Share your feedback</h1>
      {reservationId && <p className="text-sm text-ink-400">About your recent stay.</p>}

      <div className="rounded-lg border border-ink-200 bg-white p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-800 mb-2">How was your stay?</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={`flex-1 rounded-md border py-2 text-sm font-medium ${
                  rating === n ? "bg-brand-600 border-brand-600 text-white" : "border-ink-200 text-ink-600 hover:bg-ink-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-ink-400 mt-1">
            <span>Poor</span>
            <span>Excellent</span>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-ink-800 mb-1">Comments (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-ink-200 px-3 py-2 text-sm"
            placeholder="Tell us what you loved or what we could improve…"
          />
        </div>
        {error && <p className="text-sm text-danger-600">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit feedback"}
        </button>
      </div>
    </div>
  );
}
