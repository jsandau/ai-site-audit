// src/app/api/audit/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const audit = await prisma.audit.findUnique({
      where: { id },
    });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    const isUnlocked = !!audit.unlockedAt;

    return NextResponse.json({
      id: audit.id,
      url: audit.url,
      status: audit.status,
      pageTitle: audit.pageTitle,
      isUnlocked,
      preview: audit.auditData
        ? {
            overallScore: (audit.auditData as { overallScore: number }).overallScore,
            overallGrade: (audit.auditData as { overallGrade: string }).overallGrade,
            executiveSummary: (audit.auditData as { executiveSummary: string }).executiveSummary,
            seo: (audit.auditData as { seo: object }).seo,
            ux: (audit.auditData as { ux: object }).ux,
          }
        : null,
      full: isUnlocked ? audit.auditData : null,
    });
  } catch (err) {
    console.error("GET /api/audit/[id] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}