"use client";
// src/app/report/[id]/page.tsx

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface AuditSection {
  score: number;
  grade: string;
  summary: string;
  issues: string[];
  recommendations: string[];
}

interface FullAudit {
  overallScore: number;
  overallGrade: string;
  executiveSummary: string;
  seo: AuditSection;
  ux: AuditSection;
  conversion: AuditSection;
  performance: AuditSection;
  content: AuditSection;
  topPriorities: string[];
  generatedAt: string;
}

interface ReportData {
  id: string;
  url: string;
  pageTitle: string;
  isUnlocked: boolean;
  full: FullAudit | null;
}

const SECTION_LABELS: Record<string, string> = {
  seo: "SEO",
  ux: "User Experience",
  conversion: "Conversion",
  performance: "Performance",
  content: "Content",
};

function GradeChip({ score, grade }: { score: number; grade: string }) {
  const cls =
    score >= 75 ? "bg-green-50 text-green-700 border-green-200" :
    score >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
    "bg-red-50 text-red-700 border-red-200";
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls}`}>
      {grade} · {score}
    </span>
  );
}

function SectionBlock({ label, section }: { label: string; section: AuditSection }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">{label}</h3>
        <GradeChip score={section.score} grade={section.grade} />
      </div>
      <p className="text-gray-600 text-sm mb-5">{section.summary}</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2">Issues found</p>
          <ul className="space-y-2">
            {section.issues.map((issue, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-red-400 shrink-0">✗</span>
                {issue}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-2">Recommendations</p>
          <ul className="space-y-2">
            {section.recommendations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700">
                <span className="text-green-500 shrink-0">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const auditId = params.id as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/audit/${auditId}`)
      .then((r) => r.json())
      .then((data: ReportData) => {
        if (!data.isUnlocked) {
          router.replace(`/audit/${auditId}`);
          return;
        }
        setReport(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [auditId, router]);

  if (loading || !report?.full) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading your report…</p>
        </div>
      </main>
    );
  }

  const full = report.full;
  const sections = ["seo", "ux", "conversion", "performance", "content"] as const;

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Levvate</span>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            New audit
          </button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-gray-400 font-mono mb-1">{report.url}</p>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Full Site Assessment
          </h1>
          <p className="text-sm text-gray-400">
            Generated {new Date(full.generatedAt).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric"
            })}
          </p>
        </div>

        {/* Overall score */}
        <div className="bg-gray-900 text-white rounded-2xl p-8 mb-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="text-center shrink-0">
            <div className="text-6xl font-black">{full.overallScore}</div>
            <div className="text-gray-400 text-sm mt-1">Overall score</div>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl font-bold">Grade {full.overallGrade}</span>
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">{full.executiveSummary}</p>
          </div>
        </div>

        {/* Top 3 priorities */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8">
          <h2 className="font-bold text-blue-900 mb-4">Top 3 priorities to fix first</h2>
          <ol className="space-y-3">
            {full.topPriorities.map((priority, i) => (
              <li key={i} className="flex gap-3 text-sm text-blue-800">
                <span className="font-black text-blue-400 shrink-0 w-5">{i + 1}.</span>
                {priority}
              </li>
            ))}
          </ol>
        </div>

        {/* Score bar summary */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-8">
          <h2 className="font-semibold text-gray-900 mb-5">Score summary</h2>
          <div className="space-y-4">
            {sections.map((key) => {
              const s = full[key];
              const color = s.score >= 75 ? "bg-green-500" : s.score >= 50 ? "bg-amber-400" : "bg-red-500";
              return (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-sm text-gray-600 w-32 shrink-0">{SECTION_LABELS[key]}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${color} transition-all duration-700`}
                      style={{ width: `${s.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-8 text-right">{s.score}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed sections */}
        <div className="space-y-5">
          {sections.map((key) => (
            <SectionBlock
              key={key}
              label={SECTION_LABELS[key]}
              section={full[key]}
            />
          ))}
        </div>

        {/* CTA footer */}
        <div className="mt-12 bg-gray-900 text-white rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to fix these issues?</h2>
          <p className="text-gray-400 text-sm mb-6">
            Levvate specializes in high-converting websites. Let&apos;s talk about your site.
          </p>
          <a
            href="https://levvate.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition"
          >
            Book a free strategy call →
          </a>
        </div>
      </div>
    </main>
  );
}
