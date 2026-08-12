import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { activateAppraisalCycle } from "@/lib/performance/cycles";
import { isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session) return unauthorized();

  const { id } = await params;
  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id },
    include: {
      kpis: { include: { kpi: true } },
      appraisals: {
        include: {
          employee: true,
          manager: true,
          kpiScores: { include: { kpi: true } },
        },
        orderBy: { employee: { firstName: "asc" } },
      },
    },
  });
  if (!cycle) return notFound();
  return NextResponse.json(cycle);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { id } = await params;
  const body = await request.json();

  if (body.action === "activate") {
    try {
      const cycle = await activateAppraisalCycle(id);
      revalidatePath("/performance");
      broadcastAppEvent("appraisal_updated", { id, action: "activated" });
      broadcastAppEvent("performance_updated", { id, action: "activated" });
      return NextResponse.json(cycle);
    } catch (err) {
      const code = err instanceof Error ? err.message : "Failed to activate";
      const message =
        code === "CYCLE_NEEDS_KPIS"
          ? "Add at least one KPI before activating this cycle."
          : code === "CYCLE_NO_ELIGIBLE_EMPLOYEES"
            ? "No eligible employees match this cycle’s enrollment filters."
            : code === "CYCLE_NOT_FOUND"
              ? "Review cycle not found."
              : code;
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (body.action === "close") {
    const cycle = await prisma.appraisalCycle.update({
      where: { id },
      data: { status: "CLOSED" },
      include: { kpis: { include: { kpi: true } } },
    });
    revalidatePath("/performance");
    broadcastAppEvent("appraisal_updated", { id, action: "closed" });
    broadcastAppEvent("performance_updated", { id, action: "closed" });
    return NextResponse.json(cycle);
  }

  const cycle = await prisma.appraisalCycle.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.status !== undefined && { status: body.status }),
    },
    include: { kpis: { include: { kpi: true } } },
  });

  revalidatePath("/performance");
  broadcastAppEvent("appraisal_updated", { id });
  broadcastAppEvent("performance_updated", { id });
  return NextResponse.json(cycle);
}
