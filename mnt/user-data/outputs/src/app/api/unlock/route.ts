// src/app/api/unlock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncLeadToHubSpot } from "@/lib/hubspot";

export async function POST(req: NextRequest) {
  try {
    const { auditId, email, name, company } = await req.json();

    if (!auditId || !email || !name) {
      return NextResponse.json(
        { error: "auditId, email, and name are required" },
        { status: 400 }
      );
    }

    const audit = await prisma.audit.findUnique({ where: { id: auditId } });

    if (!audit) {
      return NextResponse.json({ error: "Audit not found" }, { status: 404 });
    }

    if (audit.status !== "complete") {
      return NextResponse.json({ error: "Audit not ready yet" }, { status: 409 });
    }

    // If already unlocked, just return success (idempotent)
    if (audit.unlockedAt) {
      return NextResponse.json({ success: true, alreadyUnlocked: true });
    }

    // Mark as unlocked and save lead info
    await prisma.audit.update({
      where: { id: auditId },
      data: {
        leadEmail: email,
        leadName: name,
        leadCompany: company ?? "",
        unlockedAt: new Date(),
      },
    });

    // Fire HubSpot sync (non-blocking — don't fail the request if CRM is down)
    const auditData = audit.auditData as { overallScore: number } | null;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

    syncLeadToHubSpot({
      email,
      name,
      company: company ?? "",
      auditUrl: audit.url,
      auditScore: auditData?.overallScore ?? 0,
      reportLink: `${baseUrl}/report/${auditId}`,
    }).catch((err) => console.error("HubSpot sync failed (non-critical):", err));

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("POST /api/unlock error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
