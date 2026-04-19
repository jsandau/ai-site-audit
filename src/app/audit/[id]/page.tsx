"use client";
// src/app/audit/[id]/page.tsx

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

interface AuditSection {
  score: number;
  grade: string;
  summary: string;
  issues: string[];
  recommendations: string[];
}

interface AuditPreview {
  overallScore: number;
  overallGrade: string;
  executiveSummary: string;
  seo: AuditSection;
  ux: AuditSection;
}

interface AuditData {
  id: string;
  url: string;
  status: string;
  pageTitle: string;
  isUnlocked: boolean;
  preview: AuditPreview | null;
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const fill = (score / 100) * circ;
  const color =
    score >= 75 ? "#16a34a" : score >= 50 ? "#d97706" : "#dc2626";

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg width="144" height="144" viewBox="0 0 144 144">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="10" />
        <circle
          cx="72" cy="72" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${fill} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 72 72)"
          style={{ transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span className="text-sm text-gray-500">Grade {grade}</span>
      </div>
    </div>
  );
}

function SectionCard({ title, section, blurred }: { title: string; section: AuditSection; blurred?: boolean }) {
  const color =
    section.score >= 75 ? "text-green-600 bg-green-50" :
    section.score >= 50 ? "text-amber-600 bg-amber-50" :
    "text-red-600 bg-red-50";

  return (
    <div className={`bg-white border border-gray-100 rounded-2xl p-6 relative ${blurred ? "overflow-hidden" : ""}`}>
      {blurred && (
        <div className="absolute inset-0 backdrop-blur-sm bg-white/60 rounded-2xl z-10 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-sm font-medium text-gray-700">Unlock full report</p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${color}`}>
          {section.score}/100
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-4">{section.summary}</p>
      <div className="space-y-2">
        {section.issues.map((issue, i) => (
          <div key={i} className="flex gap-2 text-sm text-gray-700">
            <span className="text-red-500 mt-0.5 shrink-0">✗</span>
            <span>{issue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeadGateModal({ auditId, onUnlocked }: { auditId: string; onUnlocked: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", company: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, ...form }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }

      onUnlocked();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Get your full report</h2>
        <p className="text-gray-500 text-sm mb-6">
          We found issues that are likely costing you leads. Enter your info to see the
          complete audit with all recommendations.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Your name *"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            placeholder="Work email *"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Company name"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? "Unlocking…" : "Unlock Full Report →"}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          No spam. Your info is only used to send your report.
        </p>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.id as string;

  const [audit, setAudit] = useState<AuditData | null>(null);
  const [showGate, setShowGate] = useState(false);
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function poll() {
      try {
        const res = await fetch(`/api/audit/${auditId}`);
        if (!res.ok) return;
        const data: AuditData = await res.json();
        setAudit(data);

        if (data.status === "complete" || data.status === "failed") {
          clearInterval(interval);
          setPolling(false);
        }

        if (data.isUnlocked) {
          router.push(`/report/${auditId}`);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    }

    poll();
    interval = setInterval(poll, 2500);
    return () => clearInterval(interval);
  }, [auditId, router]);

  if (!audit || polling) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Analyzing your website…</p>
          <p className="text-gray-400 text-sm mt-1">This takes about 30–45 seconds</p>
        </div>
      </main>
    );
  }

  if (audit.status === "failed") {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Couldn&apos;t reach this site</h2>
          <p className="text-gray-500 text-sm mb-6">
            The website may be blocking automated requests or offline.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition"
          >
            Try another URL
          </button>
        </div>
      </main>
    );
  }

  const preview = audit.preview!;

  return (
    <>
      {showGate && (
        <LeadGateModal
          auditId={auditId}
          onUnlocked={() => router.push(`/report/${auditId}`)}
        />
      )}

      <main className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <span className="font-semibold text-gray-900">SiteIQ</span>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← New audit
          </button>
        </nav>

        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-10">
            <p className="text-sm text-gray-500 mb-2 font-mono">{audit.url}</p>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              {audit.pageTitle ? `"${audit.pageTitle}"` : "Your Site Audit"}
            </h1>
            <ScoreRing score={preview.overallScore} grade={preview.overallGrade} />
            <p className="mt-6 text-gray-600 max-w-xl mx-auto">{preview.executiveSummary}</p>
          </div>

          {/* Preview sections */}
          <div className="grid gap-5 mb-8">
            <SectionCard title="SEO" section={preview.seo} />
            <SectionCard title="User Experience" section={preview.ux} />

            {/* Blurred / gated sections */}
            <div className="relative">
              <SectionCard
                title="Conversion Rate"
                section={{ score: 0, grade: "?", summary: "", issues: ["Unlock to see"], recommendations: [] }}
                blurred
              />
            </div>
            <div className="relative">
              <SectionCard
                title="Performance"
                section={{ score: 0, grade: "?", summary: "", issues: ["Unlock to see"], recommendations: [] }}
                blurred
              />
            </div>
          </div>

          {/* CTA */}
          <div className="bg-blue-600 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-2">See the full picture</h2>
            <p className="text-blue-100 text-sm mb-6">
              Your full report includes conversion, performance, and content analysis — plus
              your top 3 priorities to fix first.
            </p>
            <button
              onClick={() => setShowGate(true)}
              className="px-8 py-3.5 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition"
            >
              Unlock Full Report — Free
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
