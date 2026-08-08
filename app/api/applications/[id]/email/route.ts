import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, isHr, notFound, requireSession, unauthorized } from "@/lib/api-auth";
import { logApplicationActivity } from "@/lib/recruitment/activity";
import { interpolateTemplate } from "@/lib/recruitment/constants";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  if (!session || !isHr(session)) return unauthorized();

  const { id } = await params;
  const { subject, body, templateId } = await request.json();

  const application = await prisma.jobApplication.findUnique({
    where: { id },
    include: { job: { include: { department: true } } },
  });
  if (!application) return notFound();

  let finalSubject = subject;
  let finalBody = body;

  if (templateId) {
    const template = await prisma.recruitmentEmailTemplate.findUnique({ where: { id: templateId } });
    if (template) {
      finalSubject = subject || template.subject;
      finalBody = body || template.body;
    }
  }

  if (!finalSubject || !finalBody) return badRequest("Subject and body are required");

  const vars = {
    candidate_first_name: application.firstName,
    candidate_last_name: application.lastName,
    candidate_email: application.email,
    job_title: application.job.title,
    company_name: application.job.department.name,
    salary_amount: application.job.salaryMax?.toString() ?? "TBD",
    start_date: "TBD",
  };

  const renderedSubject = interpolateTemplate(finalSubject, vars);
  const renderedBody = interpolateTemplate(finalBody, vars);

  await logApplicationActivity({
    applicationId: id,
    type: "email",
    title: "Email sent",
    message: renderedSubject,
    actorName: session.firstName
      ? `${session.firstName} ${session.lastName ?? ""}`.trim()
      : session.email,
    metadata: { subject: renderedSubject, body: renderedBody },
  });

  return NextResponse.json({
    success: true,
    preview: { subject: renderedSubject, body: renderedBody },
  });
}
