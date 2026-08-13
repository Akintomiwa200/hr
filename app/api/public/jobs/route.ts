import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const publicJobSelect = {
  id: true,
  title: true,
  location: true,
  office: true,
  type: true,
  quantity: true,
  salaryMin: true,
  salaryMax: true,
  description: true,
  requirements: true,
  responsibilities: true,
  benefits: true,
  status: true,
  postedAt: true,
  expectedClosingDate: true,
  department: { select: { id: true, name: true } },
  company: { select: { id: true, name: true, slug: true } },
} as const;

/** Public list of OPEN jobs for the Careers board. */
export async function GET(request: NextRequest) {
  const department = request.nextUrl.searchParams.get("department");
  const search = request.nextUrl.searchParams.get("search")?.trim();
  const companySlug = request.nextUrl.searchParams.get("company");

  const jobs = await prisma.job.findMany({
    where: {
      status: "OPEN",
      ...(companySlug ? { company: { slug: companySlug } } : {}),
      ...(department ? { department: { name: department } } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { department: { name: { contains: search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    select: publicJobSelect,
    orderBy: { postedAt: "desc" },
  });

  return NextResponse.json(jobs);
}
