"use client";

import Link from "next/link";
import { ExternalLink, Video } from "lucide-react";
import { Card, statusBadge } from "@/components/ui";
import { formatDate, fullName } from "@/lib/utils";

type InterviewRow = {
  id: string;
  scheduledAt: Date | string;
  durationMinutes: number;
  type: string;
  status: string;
  googleMeetLink: string | null;
  calendarSynced: boolean;
  application: {
    id: string;
    firstName: string;
    lastName: string;
    job: { title: string };
  };
  interviewer: { firstName: string; lastName: string };
  reviews: { rating: number; recommendation: string }[];
};

export function InterviewsModule({ interviews }: { interviews: InterviewRow[] }) {
  return (
    <>
      <div className="mb-4">
        <Link href="/recruitment" className="text-sm font-medium text-violet-600 hover:text-violet-700">
          ← Back to recruitment
        </Link>
      </div>
      <Card>
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Scheduled interviews</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Synced with Google Calendar when connected
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Candidate</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">When</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Interviewer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {interviews.map((interview) => (
                <tr key={interview.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <Link href={`/recruitment/candidates/${interview.application.id}`} className="hover:text-violet-600">
                      {fullName(interview.application.firstName, interview.application.lastName)}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{interview.application.job.title}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {formatDate(interview.scheduledAt)} · {interview.durationMinutes}m
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {fullName(interview.interviewer.firstName, interview.interviewer.lastName)}
                  </td>
                  <td className="px-4 py-3">{statusBadge(interview.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {interview.googleMeetLink && (
                        <a
                          href={interview.googleMeetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Meet
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <Link
                        href={`/recruitment/candidates/${interview.application.id}`}
                        className="text-xs text-gray-500 hover:text-violet-600"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {interviews.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No interviews scheduled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
