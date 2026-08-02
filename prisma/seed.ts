import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.interviewReview.deleteMany();
  await prisma.interview.deleteMany();
  await prisma.jobApplication.deleteMany();
  await prisma.job.deleteMany();
  await prisma.appraisalKpiScore.deleteMany();
  await prisma.performanceAppraisal.deleteMany();
  await prisma.appraisalCycleKpi.deleteMany();
  await prisma.appraisalCycle.deleteMany();
  await prisma.kpiDefinition.deleteMany();
  await prisma.performanceReview.deleteMany();
  await prisma.document.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.payrollSettings.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.attendanceDevice.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const company = await prisma.company.create({
    data: {
      name: "Smart HR Demo",
      slug: "smarthr-demo",
      plan: "enterprise",
      isActive: true,
    },
  });

  const departments = await Promise.all([
    prisma.department.create({ data: { name: "Human Resources", description: "HR and people operations" } }),
    prisma.department.create({ data: { name: "Engineering", description: "Software development" } }),
    prisma.department.create({ data: { name: "Marketing", description: "Brand and growth" } }),
    prisma.department.create({ data: { name: "Finance", description: "Accounting and finance" } }),
    prisma.department.create({ data: { name: "Operations", description: "Business operations" } }),
  ]);

  const [hrDept, engDept, mktDept, finDept, opsDept] = departments;

  await prisma.user.create({
    data: {
      email: "superadmin@smarthr.com",
      passwordHash,
      role: Role.SUPER_ADMIN,
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@smarthr.com",
      passwordHash,
      role: Role.COMPANY_ADMIN,
      companyId: company.id,
    },
  });

  const hrUser = await prisma.user.create({
    data: {
      email: "hr@smarthr.com",
      passwordHash,
      role: Role.HR,
      companyId: company.id,
    },
  });

  const managerUser = await prisma.user.create({
    data: {
      email: "manager@smarthr.com",
      passwordHash,
      role: Role.MANAGER,
      companyId: company.id,
    },
  });

  const supervisorUser = await prisma.user.create({
    data: {
      email: "supervisor@smarthr.com",
      passwordHash,
      role: Role.SUPERVISOR,
      companyId: company.id,
    },
  });

  const employeeUser = await prisma.user.create({
    data: {
      email: "employee@smarthr.com",
      passwordHash,
      role: Role.EMPLOYEE,
      companyId: company.id,
    },
  });

  const extraUsers = await Promise.all([
    prisma.user.create({ data: { email: "sarah.j@smarthr.com", passwordHash, role: Role.EMPLOYEE, companyId: company.id } }),
    prisma.user.create({ data: { email: "mike.c@smarthr.com", passwordHash, role: Role.EMPLOYEE, companyId: company.id } }),
    prisma.user.create({ data: { email: "lisa.w@smarthr.com", passwordHash, role: Role.MANAGER, companyId: company.id } }),
    prisma.user.create({ data: { email: "david.r@smarthr.com", passwordHash, role: Role.EMPLOYEE, companyId: company.id } }),
  ]);

  const admin = await prisma.employee.create({
    data: {
      userId: adminUser.id,
      employeeCode: "EMP001",
      firstName: "Alex",
      lastName: "Johnson",
      email: "admin@smarthr.com",
      phone: "+1 555-0101",
      jobTitle: "HR Director",
      departmentId: hrDept.id,
      hireDate: new Date("2020-03-15"),
      salary: 95000,
      address: "123 Main St, New York, NY",
    },
  });

  const manager = await prisma.employee.create({
    data: {
      userId: managerUser.id,
      employeeCode: "EMP002",
      firstName: "Jordan",
      lastName: "Smith",
      email: "manager@smarthr.com",
      phone: "+1 555-0102",
      jobTitle: "Engineering Manager",
      departmentId: engDept.id,
      hireDate: new Date("2021-06-01"),
      salary: 110000,
    },
  });

  const hrEmployee = await prisma.employee.create({
    data: {
      userId: hrUser.id,
      employeeCode: "EMP008",
      firstName: "Morgan",
      lastName: "Lee",
      email: "hr@smarthr.com",
      phone: "+1 555-0108",
      jobTitle: "HR Manager",
      departmentId: hrDept.id,
      hireDate: new Date("2020-08-01"),
      salary: 88000,
    },
  });

  const supervisor = await prisma.employee.create({
    data: {
      userId: supervisorUser.id,
      employeeCode: "EMP009",
      firstName: "Casey",
      lastName: "Nguyen",
      email: "supervisor@smarthr.com",
      phone: "+1 555-0109",
      jobTitle: "Team Supervisor",
      departmentId: engDept.id,
      managerId: manager.id,
      hireDate: new Date("2021-03-20"),
      salary: 82000,
    },
  });

  const employee = await prisma.employee.create({
    data: {
      userId: employeeUser.id,
      employeeCode: "EMP003",
      firstName: "Taylor",
      lastName: "Brown",
      email: "employee@smarthr.com",
      phone: "+1 555-0103",
      jobTitle: "Software Engineer",
      departmentId: engDept.id,
      managerId: manager.id,
      hireDate: new Date("2022-09-10"),
      salary: 85000,
    },
  });

  const [sarahUser, mikeUser, lisaUser, davidUser] = extraUsers;

  const sarah = await prisma.employee.create({
    data: {
      userId: sarahUser.id,
      employeeCode: "EMP004",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.j@smarthr.com",
      jobTitle: "Marketing Specialist",
      departmentId: mktDept.id,
      managerId: hrEmployee.id,
      hireDate: new Date("2023-01-20"),
      salary: 72000,
    },
  });

  const mike = await prisma.employee.create({
    data: {
      userId: mikeUser.id,
      employeeCode: "EMP005",
      firstName: "Mike",
      lastName: "Chen",
      email: "mike.c@smarthr.com",
      jobTitle: "Financial Analyst",
      departmentId: finDept.id,
      hireDate: new Date("2022-04-05"),
      salary: 78000,
    },
  });

  const lisa = await prisma.employee.create({
    data: {
      userId: lisaUser.id,
      employeeCode: "EMP006",
      firstName: "Lisa",
      lastName: "Williams",
      email: "lisa.w@smarthr.com",
      jobTitle: "Operations Manager",
      departmentId: opsDept.id,
      hireDate: new Date("2021-11-12"),
      salary: 92000,
    },
  });

  await prisma.employee.create({
    data: {
      userId: davidUser.id,
      employeeCode: "EMP007",
      firstName: "David",
      lastName: "Rodriguez",
      email: "david.r@smarthr.com",
      jobTitle: "Junior Developer",
      departmentId: engDept.id,
      managerId: supervisor.id,
      hireDate: new Date("2024-02-01"),
      salary: 65000,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const receptionKiosk = await prisma.attendanceDevice.create({
    data: {
      name: "Reception Kiosk",
      location: "Main lobby",
      apiKey: "dev-device-key-reception-kiosk",
      isActive: true,
    },
  });

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (const emp of [admin, manager, employee, sarah, mike, lisa]) {
      const isToday = i === 0;
      const isDeviceCheckIn = isToday && emp.id === sarah.id;
      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date,
          checkIn: new Date(date.getTime() + 9 * 60 * 60 * 1000),
          checkOut: isToday ? null : new Date(date.getTime() + 17 * 60 * 60 * 1000),
          status: i === 1 && emp.id === employee.id ? "LATE" : "PRESENT",
          checkInMethod: isDeviceCheckIn ? "DEVICE" : "WEB",
          deviceId: isDeviceCheckIn ? receptionKiosk.id : undefined,
          deviceName: isDeviceCheckIn ? receptionKiosk.name : undefined,
        },
      });
    }
  }

  await prisma.leaveRequest.createMany({
    data: [
      {
        employeeId: employee.id,
        type: "ANNUAL",
        startDate: new Date("2026-08-10"),
        endDate: new Date("2026-08-14"),
        reason: "Family vacation",
        status: "PENDING",
      },
      {
        employeeId: sarah.id,
        type: "SICK",
        startDate: new Date("2026-07-15"),
        endDate: new Date("2026-07-16"),
        reason: "Medical appointment",
        status: "APPROVED",
        approverId: admin.id,
      },
      {
        employeeId: mike.id,
        type: "PERSONAL",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-01"),
        reason: "Personal matters",
        status: "PENDING",
      },
    ],
  });

  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  await prisma.payrollSettings.create({
    data: {
      id: "default",
      holidayAllowanceEnabled: true,
      holidayAllowanceAmount: 150,
      latenessDeductionPerDay: 25,
      absenceDeductionPerDay: 100,
      damageDeductionEnabled: true,
      taxRatePercent: 10,
    },
  });

  for (const emp of [admin, manager, employee, sarah, mike, lisa]) {
    const bonus = Math.round(emp.salary * 0.05);
    const holidayAllowance = 150;
    const taxBase = emp.salary + bonus + holidayAllowance;
    const tax = Math.round(taxBase * 0.1);
    const lateness = emp.id === employee.id ? 25 : 0;
    const grossPay = emp.salary + bonus + holidayAllowance;
    const deductions = tax + lateness;
    const breakdown = JSON.stringify([
      { id: "base", type: "EARNING", category: "BASE_SALARY", label: "Base salary", amount: emp.salary, auto: false, editable: true },
      { id: "bonus", type: "EARNING", category: "BONUS", label: "Performance bonus", amount: bonus, auto: false, editable: true },
      { id: "holiday", type: "EARNING", category: "HOLIDAY_ALLOWANCE", label: "Holiday allowance", amount: holidayAllowance, auto: true, editable: true },
      ...(lateness > 0 ? [{ id: "late", type: "DEDUCTION", category: "LATENESS", label: "Lateness deduction (1 day)", amount: lateness, auto: true, editable: true }] : []),
      { id: "tax", type: "DEDUCTION", category: "TAX", label: "Tax (10%)", amount: tax, auto: true, editable: true },
    ]);

    await prisma.payrollRecord.create({
      data: {
        employeeId: emp.id,
        periodStart,
        periodEnd,
        baseSalary: emp.salary,
        bonus,
        deductions,
        grossPay,
        netPay: grossPay - deductions,
        breakdown,
        status: "PAID",
        paidAt: new Date(),
      },
    });
  }

  const engJob = await prisma.job.create({
    data: {
      title: "Senior Full Stack Developer",
      departmentId: engDept.id,
      location: "Remote / New York",
      type: "Full-time",
      salaryMin: 90000,
      salaryMax: 130000,
      description: "We are looking for an experienced full stack developer to join our engineering team and help build the next generation of our HR platform.",
      requirements: "5+ years experience, React, Node.js, TypeScript, PostgreSQL",
      responsibilities: "Design and ship features end-to-end\nCollaborate with product and design\nMentor junior engineers\nParticipate in code reviews",
      benefits: "Health insurance\nRemote flexibility\nLearning budget\nEquity options",
      status: "OPEN",
    },
  });

  await prisma.job.create({
    data: {
      title: "HR Coordinator",
      departmentId: hrDept.id,
      location: "New York, NY",
      type: "Full-time",
      salaryMin: 55000,
      salaryMax: 70000,
      description: "Support HR operations including recruitment, onboarding, and employee relations.",
      requirements: "2+ years HR experience, excellent communication skills",
      responsibilities: "Coordinate interviews and onboarding\nMaintain employee records\nSupport payroll and benefits admin",
      benefits: "Health & dental\nPaid time off\nProfessional development",
      status: "OPEN",
    },
  });

  const chrisApp = await prisma.jobApplication.create({
    data: {
      jobId: engJob.id,
      firstName: "Chris",
      lastName: "Anderson",
      email: "chris.a@email.com",
      phone: "+1 555-0201",
      status: "INTERVIEW",
      reviewerId: manager.id,
      coverLetter: "I am excited to apply for the Senior Full Stack Developer role. I have 6 years of experience building React and Node applications.",
    },
  });

  await prisma.jobApplication.createMany({
    data: [
      {
        jobId: engJob.id,
        firstName: "Emma",
        lastName: "Davis",
        email: "emma.d@email.com",
        status: "SCREENING",
      },
      {
        jobId: engJob.id,
        firstName: "Ryan",
        lastName: "Miller",
        email: "ryan.m@email.com",
        status: "APPLIED",
      },
    ],
  });

  const interviewDate = new Date();
  interviewDate.setDate(interviewDate.getDate() + 3);
  interviewDate.setHours(14, 0, 0, 0);

  await prisma.interview.create({
    data: {
      applicationId: chrisApp.id,
      interviewerId: manager.id,
      scheduledAt: interviewDate,
      durationMinutes: 60,
      type: "VIDEO",
      status: "SCHEDULED",
      notes: "Technical screen — system design and coding exercise",
      calendarSynced: false,
    },
  });

  await prisma.performanceReview.createMany({
    data: [
      {
        employeeId: employee.id,
        managerId: manager.id,
        period: "Q1 2026",
        rating: 4,
        goals: "Deliver feature X, improve code quality, mentor junior dev",
        achievements: "Shipped 3 major features, reduced bug count by 30%",
        feedback: "Strong performer, ready for senior role consideration",
        status: "COMPLETED",
        reviewDate: new Date("2026-04-01"),
      },
    ],
  });

  const kpiDelivery = await prisma.kpiDefinition.create({
    data: {
      title: "Delivery & quality",
      description: "On-time delivery and code quality standards",
      metricType: "RATING",
      targetValue: 4,
      weight: 1.5,
      departmentId: engDept.id,
    },
  });
  const kpiCollaboration = await prisma.kpiDefinition.create({
    data: {
      title: "Collaboration",
      description: "Teamwork, communication, and mentoring",
      metricType: "RATING",
      targetValue: 4,
    },
  });
  const kpiAttendance = await prisma.kpiDefinition.create({
    data: {
      title: "Attendance & presence",
      description: "Reliability and punctuality",
      metricType: "PERCENTAGE",
      targetValue: 95,
    },
  });

  const cycle = await prisma.appraisalCycle.create({
    data: {
      name: "Mid-Year 2026 Review",
      period: "H1 2026",
      description: "Company-wide mid-year performance and KPI review",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-07-31"),
      selfReviewDeadline: new Date("2026-07-15"),
      managerReviewDeadline: new Date("2026-07-31"),
      status: "ACTIVE",
      includeAllEmployees: true,
      kpis: {
        create: [
          { kpiId: kpiDelivery.id },
          { kpiId: kpiCollaboration.id },
          { kpiId: kpiAttendance.id },
        ],
      },
    },
  });

  const appraisalEmployee = await prisma.performanceAppraisal.create({
    data: {
      cycleId: cycle.id,
      employeeId: employee.id,
      managerId: manager.id,
      status: "MANAGER_REVIEW",
      selfRating: 4,
      selfAchievements: "Delivered payroll module and calendar rewrite on schedule.",
      selfComments: "Ready for more ownership on architecture decisions.",
      selfSubmittedAt: new Date(),
      kpiScores: {
        create: [
          { kpiId: kpiDelivery.id, selfScore: 4, selfNotes: "Met sprint commitments" },
          { kpiId: kpiCollaboration.id, selfScore: 5, selfNotes: "Helped onboard new hire" },
          { kpiId: kpiAttendance.id, selfScore: 98 },
        ],
      },
    },
  });

  await prisma.performanceAppraisal.create({
    data: {
      cycleId: cycle.id,
      employeeId: sarah.id,
      managerId: admin.id,
      status: "SELF_REVIEW",
      kpiScores: {
        create: [
          { kpiId: kpiCollaboration.id },
          { kpiId: kpiAttendance.id },
        ],
      },
    },
  });

  void appraisalEmployee;

  await prisma.document.createMany({
    data: [
      { title: "Employee Handbook 2026", category: "Policy", uploadedBy: admin.id, employeeId: null },
      { title: "Remote Work Policy", category: "Policy", uploadedBy: admin.id, employeeId: null },
      { title: "Employment Contract", category: "Contract", uploadedBy: admin.id, employeeId: employee.id },
      { title: "Tax Form W-4", category: "Tax", uploadedBy: admin.id, employeeId: employee.id },
    ],
  });

  await prisma.announcement.createMany({
    data: [
      {
        title: "Company Town Hall — August 15",
        content: "Join us for our quarterly town hall meeting. All employees are encouraged to attend.",
        author: "Alex Johnson",
        priority: "HIGH",
      },
      {
        title: "New Benefits Enrollment Period",
        content: "Open enrollment for health and dental benefits starts September 1. Review your options in the HR portal.",
        author: "Alex Johnson",
        priority: "NORMAL",
      },
      {
        title: "Office Closure — Labor Day",
        content: "The office will be closed on September 1 for Labor Day. Enjoy the long weekend!",
        author: "HR Team",
        priority: "NORMAL",
      },
    ],
  });

  console.log("Seed completed!");
  console.log("\nDemo accounts (password: password123):");
  console.log("  Super Admin:  superadmin@smarthr.com");
  console.log("  Company Admin: admin@smarthr.com");
  console.log("  HR:           hr@smarthr.com");
  console.log("  Manager:      manager@smarthr.com");
  console.log("  Supervisor:   supervisor@smarthr.com");
  console.log("  Employee:     employee@smarthr.com");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
