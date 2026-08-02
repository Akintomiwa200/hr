import { InterviewType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  cancelCalendarEvent,
  createCalendarEventWithMeet,
  updateCalendarEvent,
} from "@/lib/google-calendar";
import { sendInterviewScheduledEmail } from "@/lib/email";
import { fullName } from "@/lib/utils";

export async function scheduleInterview(input: {
  applicationId: string;
  interviewerId: string;
  scheduledAt: Date;
  durationMinutes?: number;
  type?: string;
  location?: string;
  notes?: string;
}) {
  const application = await prisma.jobApplication.findUnique({
    where: { id: input.applicationId },
    include: {
      job: { include: { department: true } },
    },
  });
  if (!application) throw new Error("APPLICATION_NOT_FOUND");

  const interviewer = await prisma.employee.findUnique({
    where: { id: input.interviewerId },
  });
  if (!interviewer) throw new Error("INTERVIEWER_NOT_FOUND");

  const duration = input.durationMinutes ?? 60;
  const end = new Date(input.scheduledAt.getTime() + duration * 60_000);
  const candidateName = fullName(application.firstName, application.lastName);
  const summary = `Interview: ${candidateName} — ${application.job.title}`;
  const description = [
    `Candidate: ${candidateName}`,
    `Email: ${application.email}`,
    `Position: ${application.job.title}`,
    `Department: ${application.job.department.name}`,
    input.notes ? `Notes: ${input.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  let googleCalendarEventId: string | null = null;
  let googleMeetLink: string | null = null;
  let calendarSynced = false;

  try {
    const event = await createCalendarEventWithMeet({
      summary,
      description,
      start: input.scheduledAt,
      end,
      attendeeEmails: [application.email, interviewer.email],
      location: input.location,
    });
    googleCalendarEventId = event.eventId;
    googleMeetLink = event.meetLink;
    calendarSynced = true;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Calendar sync failed";
    if (message !== "GOOGLE_NOT_CONNECTED") {
      console.error("[interview] Google Calendar error:", message);
    }
  }

  const interview = await prisma.$transaction(async (tx) => {
    const created = await tx.interview.create({
      data: {
        applicationId: application.id,
        interviewerId: interviewer.id,
        scheduledAt: input.scheduledAt,
        durationMinutes: duration,
        type: (input.type as InterviewType) || InterviewType.VIDEO,
        location: input.location,
        googleCalendarEventId,
        googleMeetLink,
        calendarSynced,
        notes: input.notes,
        status: "SCHEDULED",
      },
      include: {
        application: { include: { job: true } },
        interviewer: true,
        reviews: true,
      },
    });

    if (application.status === "APPLIED" || application.status === "SCREENING") {
      await tx.jobApplication.update({
        where: { id: application.id },
        data: { status: "INTERVIEW" },
      });
    }

    return created;
  });

  await sendInterviewScheduledEmail({
    candidateEmail: application.email,
    candidateName,
    interviewerName: fullName(interviewer.firstName, interviewer.lastName),
    jobTitle: application.job.title,
    scheduledAt: input.scheduledAt,
    durationMinutes: duration,
    meetLink: googleMeetLink,
    calendarSynced,
  }).catch((err) => console.error("[interview] email failed:", err));

  return interview;
}

export async function rescheduleInterview(
  interviewId: string,
  input: {
    scheduledAt?: Date;
    durationMinutes?: number;
    interviewerId?: string;
    type?: string;
    location?: string;
    notes?: string;
    status?: string;
  }
) {
  const existing = await prisma.interview.findUnique({
    where: { id: interviewId },
    include: {
      application: { include: { job: true } },
      interviewer: true,
    },
  });
  if (!existing) throw new Error("INTERVIEW_NOT_FOUND");

  const scheduledAt = input.scheduledAt ?? existing.scheduledAt;
  const durationMinutes = input.durationMinutes ?? existing.durationMinutes;
  const interviewerId = input.interviewerId ?? existing.interviewerId;
  const end = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

  let googleMeetLink = existing.googleMeetLink;
  let calendarSynced = existing.calendarSynced;

  if (existing.googleCalendarEventId && calendarSynced) {
    try {
      const interviewer =
        input.interviewerId && input.interviewerId !== existing.interviewerId
          ? await prisma.employee.findUnique({ where: { id: input.interviewerId } })
          : existing.interviewer;

      const updated = await updateCalendarEvent(existing.googleCalendarEventId, {
        summary: `Interview: ${fullName(existing.application.firstName, existing.application.lastName)} — ${existing.application.job.title}`,
        start: scheduledAt,
        end,
        attendeeEmails: interviewer
          ? [existing.application.email, interviewer.email]
          : [existing.application.email],
        location: input.location ?? existing.location ?? undefined,
      });
      googleMeetLink = updated.meetLink ?? googleMeetLink;
    } catch (err) {
      console.error("[interview] reschedule calendar error:", err);
    }
  }

  return prisma.interview.update({
    where: { id: interviewId },
    data: {
      scheduledAt,
      durationMinutes,
      interviewerId,
      ...(input.type && { type: input.type as "VIDEO" }),
      ...(input.location !== undefined && { location: input.location }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.status && { status: input.status as "SCHEDULED" }),
      googleMeetLink,
      calendarSynced,
    },
    include: {
      application: { include: { job: true } },
      interviewer: true,
      reviews: { include: { reviewer: true } },
    },
  });
}

export async function cancelInterview(interviewId: string) {
  const existing = await prisma.interview.findUnique({ where: { id: interviewId } });
  if (!existing) throw new Error("INTERVIEW_NOT_FOUND");

  if (existing.googleCalendarEventId && existing.calendarSynced) {
    await cancelCalendarEvent(existing.googleCalendarEventId).catch((err) =>
      console.error("[interview] cancel calendar error:", err)
    );
  }

  return prisma.interview.update({
    where: { id: interviewId },
    data: { status: "CANCELLED" },
    include: {
      application: { include: { job: true } },
      interviewer: true,
      reviews: { include: { reviewer: true } },
    },
  });
}
