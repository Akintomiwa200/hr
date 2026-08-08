import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canExportReports } from "@/lib/reports/access";
import { parseReportFilters } from "@/lib/reports/scope";
import {
  getAgeProfileReport,
  getBirthdayReport,
  getHeadcountReport,
  getGenderProfileReport,
  getOffboardingReport,
  getOnboardingReport,
  getTenureReport,
  getTimeOffBalanceReport,
  getTimeOffScheduleReport,
  getTurnoverReport,
} from "@/lib/reports/data";

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || !canExportReports(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = request.nextUrl.searchParams.get("report");
  const filters = parseReportFilters({
    get: (k) => request.nextUrl.searchParams.get(k),
  });

  let rows: Record<string, unknown>[] = [];
  let filename = "report.csv";

  switch (report) {
    case "headcount": {
      const data = await getHeadcountReport(session, filters);
      rows = data.rows;
      filename = "headcount.csv";
      break;
    }
    case "age": {
      rows = (await getAgeProfileReport(session, filters)).rows;
      filename = "age-profile.csv";
      break;
    }
    case "gender": {
      rows = (await getGenderProfileReport(session, filters)).rows;
      filename = "gender-profile.csv";
      break;
    }
    case "birthday": {
      rows = (await getBirthdayReport(session, filters)).rows;
      filename = "birthdays.csv";
      break;
    }
    case "tenure": {
      rows = (await getTenureReport(session, filters)).rows;
      filename = "tenure.csv";
      break;
    }
    case "turnover": {
      rows = (await getTurnoverReport(session, filters)).rows;
      filename = "turnover.csv";
      break;
    }
    case "onboarding": {
      rows = (await getOnboardingReport(session, filters)).rows;
      filename = "onboarding.csv";
      break;
    }
    case "offboarding": {
      rows = (await getOffboardingReport(session, filters)).rows;
      filename = "offboarding.csv";
      break;
    }
    case "time-off-balance": {
      rows = (await getTimeOffBalanceReport(session, filters)).rows;
      filename = "time-off-balance.csv";
      break;
    }
    case "time-off-schedule": {
      rows = (await getTimeOffScheduleReport(session, filters)).rows;
      filename = "time-off-schedule.csv";
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown report" }, { status: 400 });
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
