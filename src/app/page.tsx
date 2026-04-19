"use client";
// src/app/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = url.trim();
    if (!trimmed) return;

    setLoading(true);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      router.push(`/audit/${data.auditId}`);
    } catch {
      setError("Network error. Please check your connection.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="px-8 py-5 flex items-center justify-between border-b border-gray-100">
        <span className="font-semibold text-gray-900 tracking-tight">Levvate</span>
        <span className="text-sm text-gray-500">Free Site Assessment</span>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-2xl w-full text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            AI-powered — results in under 60 seconds
          </div>

          <h1 className="text-5xl font-bold text-gray-900 leading-tight mb-5">
            Is your website
            <br />
            <span className="text-blue-600">losing you leads?</span>
          </h1>

          <p className="text-lg text-gray-500 mb-12 max-w-lg mx-auto">
            Get a free, AI-generated audit covering SEO, UX, conversion rate, and
            content — in seconds.
          </p>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="yourwebsite.com"
              className="flex-1 px-5 py-3.5 text-base border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="px-7 py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
            >
              {loading ? "Analyzing…" : "Get Free Audit"}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}

          <p className="mt-5 text-xs text-gray-400">
            No credit card required. No spam. Just your results.
          </p>
        </div>

        {/* Social proof */}
        <div className="mt-20 flex flex-col sm:flex-row gap-10 text-center">
          {[
            { stat: "5 areas", label: "Analyzed instantly" },
            { stat: "100-pt", label: "Scoring system" },
            { stat: "0 cost", label: "Always free" },
          ].map(({ stat, label }) => (
            <div key={stat}>
              <div className="text-2xl font-bold text-gray-900">{stat}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
