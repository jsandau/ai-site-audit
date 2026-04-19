// src/lib/ai.ts
// Uses Groq (free tier) instead of OpenAI.
// Sign up free at https://console.groq.com — no credit card needed.
import type { ScrapedData } from "./scraper";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

export interface AuditSection {
  score: number; // 0–100
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  issues: string[];
  recommendations: string[];
}

export interface AuditResult {
  overallScore: number;
  overallGrade: "A" | "B" | "C" | "D" | "F";
  executiveSummary: string;
  seo: AuditSection;
  ux: AuditSection;
  conversion: AuditSection;
  performance: AuditSection;
  content: AuditSection;
  topPriorities: string[]; // top 3 things to fix immediately
  generatedAt: string;
}

function scoreToGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

export async function generateAudit(scraped: ScrapedData): Promise<AuditResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set in .env.local");

  const prompt = `You are an expert web consultant who specializes in conversion rate optimization, SEO, and UX for business websites. Analyze the following website data and produce a structured audit.

WEBSITE DATA:
URL: ${scraped.url}
SSL/HTTPS: ${scraped.hasSSL ? "Yes" : "No"}
Page Title: ${scraped.pageTitle || "Missing"}
Meta Description: ${scraped.metaDesc || "Missing"}
H1 Tags: ${scraped.h1s.length > 0 ? scraped.h1s.join(" | ") : "None found"}
H2 Tags: ${scraped.h2s.slice(0, 6).join(" | ") || "None found"}
Images: ${scraped.imageCount} total, ${scraped.imagesWithoutAlt} missing alt text
Internal Links: ${scraped.internalLinks.length}
External Links: ${scraped.externalLinks.length}
Scrape Method: ${scraped.loadMethod}
${scraped.error ? `Scrape Warning: ${scraped.error}` : ""}

PAGE CONTENT SAMPLE:
${scraped.bodyText.slice(0, 2000)}

Analyze this website across 5 dimensions. For each, give a realistic score (0-100) and 2-4 concrete issues and recommendations tied to what you see above. Do NOT give generic advice.

Respond ONLY with valid JSON — no markdown, no backticks, no explanation before or after:
{
  "overallScore": <number>,
  "executiveSummary": "<2-3 sentence plain-English summary of the site's biggest opportunity>",
  "seo": {
    "score": <number>,
    "summary": "<1-2 sentences>",
    "issues": ["<specific issue>", "<specific issue>"],
    "recommendations": ["<specific fix>", "<specific fix>"]
  },
  "ux": {
    "score": <number>,
    "summary": "<1-2 sentences>",
    "issues": ["<specific issue>", "<specific issue>"],
    "recommendations": ["<specific fix>", "<specific fix>"]
  },
  "conversion": {
    "score": <number>,
    "summary": "<1-2 sentences>",
    "issues": ["<specific issue>", "<specific issue>"],
    "recommendations": ["<specific fix>", "<specific fix>"]
  },
  "performance": {
    "score": <number>,
    "summary": "<1-2 sentences>",
    "issues": ["<specific issue>", "<specific issue>"],
    "recommendations": ["<specific fix>", "<specific fix>"]
  },
  "content": {
    "score": <number>,
    "summary": "<1-2 sentences>",
    "issues": ["<specific issue>", "<specific issue>"],
    "recommendations": ["<specific fix>", "<specific fix>"]
  },
  "topPriorities": ["<most critical fix>", "<second priority>", "<third priority>"]
}`;

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse AI response as JSON. Raw: ${raw.slice(0, 300)}`);
  }

  const withGrades: AuditResult = {
    overallScore: parsed.overallScore,
    overallGrade: scoreToGrade(parsed.overallScore),
    executiveSummary: parsed.executiveSummary,
    seo: { ...parsed.seo, grade: scoreToGrade(parsed.seo.score) },
    ux: { ...parsed.ux, grade: scoreToGrade(parsed.ux.score) },
    conversion: { ...parsed.conversion, grade: scoreToGrade(parsed.conversion.score) },
    performance: { ...parsed.performance, grade: scoreToGrade(parsed.performance.score) },
    content: { ...parsed.content, grade: scoreToGrade(parsed.content.score) },
    topPriorities: parsed.topPriorities,
    generatedAt: new Date().toISOString(),
  };

  return withGrades;
}
