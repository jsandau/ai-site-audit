// src/app/api/audit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeWebsite } from "@/lib/scraper";
import { generateAudit } from "@/lib/ai";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Create audit record immediately so we can return an ID to poll
    const audit = await prisma.audit.create({
      data: { url, status: "processing" },
    });

    // Run scrape + AI in the background (don't await — return ID immediately)
    processAudit(audit.id, url).catch((err) => {
      console.error(`Audit ${audit.id} failed:`, err);
      prisma.audit.update({
        where: { id: audit.id },
        data: { status: "failed" },
      });
    });

    return NextResponse.json({ auditId: audit.id }, { status: 201 });
  } catch (err) {
    console.error("POST /api/audit error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processAudit(auditId: string, url: string) {
  // 1. Scrape
  const scraped = await scrapeWebsite(url);

  // 2. Generate AI audit
  const auditData = await generateAudit(scraped);

  // 3. Persist results
  await prisma.audit.update({
    where: { id: auditId },
    data: {
      status: "complete",
      pageTitle: scraped.pageTitle,
      metaDesc: scraped.metaDesc,
      auditData: auditData as object,
    },
  });
}
