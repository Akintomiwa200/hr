import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { companyHolidays2026 } from "../lib/holidays";
import { createChecklistFromTemplate } from "../lib/checklist/instantiate";

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
  await prisma.performanceSettings.deleteMany();
  await prisma.checklistTaskComment.deleteMany();
  await prisma.checklistTask.deleteMany();
  await prisma.checklistInstance.deleteMany();
  await prisma.checklistTemplateTask.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.document.deleteMany();
  await prisma.documentFolder.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.payrollSettings.deleteMany();
  await prisma.applicationEvaluation.deleteMany();
  await prisma.applicationActivity.deleteMany();
  await prisma.recruitmentEmailTemplate.deleteMany();
  await prisma.recruitmentSource.deleteMany();
  await prisma.recruitmentTag.deleteMany();
  await prisma.recruitmentStage.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.attendanceDevice.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await bcrypt.hash("password", 10);

  const company = await prisma.company.create({
    data: {
      name: "Smart HR Demo",
      slug: "smarthr-demo",
      plan: "enterprise",
      subscriptionStatus: "ACTIVE",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      billingEmail: "billing@smarthr.com",
      isActive: true,
    },
  });

  const departments = await Promise.all([
    prisma.department.create({ data: { name: "Human Resources", description: "HR and people operations", companyId: company.id } }),
    prisma.department.create({ data: { name: "Engineering", description: "Software development", companyId: company.id } }),
    prisma.department.create({ data: { name: "Marketing", description: "Brand and growth", companyId: company.id } }),
    prisma.department.create({ data: { name: "Finance", description: "Accounting and finance", companyId: company.id } }),
    prisma.department.create({ data: { name: "Operations", description: "Business operations", companyId: company.id } }),
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

  const david = await prisma.employee.create({
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
      companyId: company.id,
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
      companyId: company.id,
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
      companyId: company.id,
      location: "Remote / New York",
      office: "HQ Office",
      type: "Full-time",
      quantity: 2,
      expectedClosingDate: new Date("2026-09-30"),
      salaryMin: 90000,
      salaryMax: 130000,
      description: "We are looking for an experienced full stack developer to join our engineering team and help build the next generation of our HR platform.",
      requirements: "5+ years experience, React, Node.js, TypeScript, PostgreSQL",
      responsibilities: "Design and ship features end-to-end\nCollaborate with product and design\nMentor junior engineers\nParticipate in code reviews",
      benefits: "Health insurance\nRemote flexibility\nLearning budget\nEquity options",
      pipelineStages: JSON.stringify(["Applied", "Screening", "1st Interview", "2nd Interview", "Offered", "Hired", "Rejected"]),
      status: "OPEN",
    },
  });

  await prisma.job.create({
    data: {
      title: "HR Coordinator",
      departmentId: hrDept.id,
      companyId: company.id,
      location: "New York, NY",
      office: "Main Office",
      type: "Full-time",
      quantity: 1,
      salaryMin: 55000,
      salaryMax: 70000,
      description: "Support HR operations including recruitment, onboarding, and employee relations.",
      requirements: "2+ years HR experience, excellent communication skills",
      responsibilities: "Coordinate interviews and onboarding\nMaintain employee records\nSupport payroll and benefits admin",
      benefits: "Health & dental\nPaid time off\nProfessional development",
      pipelineStages: JSON.stringify(["Applied", "Screening", "1st Interview", "Offered", "Hired", "Rejected"]),
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
      source: "LinkedIn",
      pipelineStage: "1st Interview",
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
        source: "Referral",
        pipelineStage: "Screening",
        status: "SCREENING",
      },
      {
        jobId: engJob.id,
        firstName: "Ryan",
        lastName: "Miller",
        email: "ryan.m@email.com",
        source: "Company Website",
        pipelineStage: "Applied",
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

  await prisma.performanceReview.deleteMany();
  await prisma.appraisalKpiScore.deleteMany();
  await prisma.performanceAppraisal.deleteMany();
  await prisma.appraisalCycleKpi.deleteMany();
  await prisma.appraisalCycle.deleteMany();
  await prisma.kpiDefinition.deleteMany();
  // Performance module starts empty — HR defines KPIs, cycles, and scoring rules live.

  const taxFolder = await prisma.documentFolder.create({
    data: {
      companyId: company.id,
      name: "Essential Tax",
      description: "Tax forms and compliance documents",
      createdByName: "Jennifer Law",
      shareScope: "EVERYONE",
    },
  });

  const pmFolder = await prisma.documentFolder.create({
    data: {
      companyId: company.id,
      name: "Project Manager",
      description: "PM resources and templates",
      createdByName: "Jennifer Law",
      shareScope: "EVERYONE",
    },
  });

  await prisma.document.createMany({
    data: [
      {
        companyId: company.id,
        folderId: taxFolder.id,
        title: "Essential Tax 01",
        category: "Tax",
        fileName: "Essential Tax 01.pdf",
        fileUrl: "https://example.com/tax-01.pdf",
        fileSize: 2400000,
        uploadedBy: "HR Admin",
        employeeId: null,
      },
      {
        companyId: company.id,
        folderId: taxFolder.id,
        title: "Essential Tax 02",
        category: "Tax",
        fileName: "Essential Tax 02.pdf",
        fileUrl: "https://example.com/tax-02.pdf",
        fileSize: 1800000,
        uploadedBy: "HR Admin",
        employeeId: null,
      },
      {
        companyId: company.id,
        title: "Employee Handbook 2026",
        category: "Policy",
        fileName: "handbook.pdf",
        fileUrl: "https://example.com/handbook.pdf",
        fileSize: 5200000,
        uploadedBy: "HR Admin",
        employeeId: null,
        shareScope: "EVERYONE",
      },
      {
        companyId: company.id,
        title: "Employment Contract",
        category: "Contract",
        fileName: "contract.pdf",
        uploadedBy: "HR Admin",
        employeeId: employee.id,
      },
    ],
  });

  const onboardingTemplate = await prisma.checklistTemplate.create({
    data: {
      companyId: company.id,
      type: "ONBOARDING",
      name: "Onboarding v.1",
      description: "Standard new hire onboarding",
      tasks: {
        create: [
          { title: "Prepare company welcome kit", assigneeType: "HR", dueDaysOffset: -1, sortOrder: 0 },
          { title: "Collect documents - Hard copies", assigneeType: "EMPLOYEE", dueDaysOffset: 3, sortOrder: 1 },
          { title: "Upload signed work contract", assigneeType: "EMPLOYEE", dueDaysOffset: 5, sortOrder: 2 },
          { title: "Line manager intro meeting", assigneeType: "LINE_MANAGER", dueDaysOffset: 1, sortOrder: 3 },
        ],
      },
    },
  });

  const offboardingTemplate = await prisma.checklistTemplate.create({
    data: {
      companyId: company.id,
      type: "OFFBOARDING",
      name: "Offboarding v.1",
      description: "Standard employee exit checklist",
      tasks: {
        create: [
          { title: "Schedule exit interview", assigneeType: "HR", dueDaysOffset: 1, sortOrder: 0 },
          { title: "Return company equipment", assigneeType: "EMPLOYEE", dueDaysOffset: 3, sortOrder: 1 },
          { title: "Revoke system access", assigneeType: "HR", dueDaysOffset: 5, sortOrder: 2 },
          { title: "Knowledge transfer session", assigneeType: "LINE_MANAGER", dueDaysOffset: 2, sortOrder: 3 },
        ],
      },
    },
  });

  const taylorStart = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const taylorOnboarding = await createChecklistFromTemplate({
    templateId: onboardingTemplate.id,
    employeeId: employee.id,
    companyId: company.id,
    type: "ONBOARDING",
    startDate: taylorStart,
  });

  const davidOnboarding = await createChecklistFromTemplate({
    templateId: onboardingTemplate.id,
    employeeId: david.id,
    companyId: company.id,
    type: "ONBOARDING",
    startDate: new Date(),
  });

  if (taylorOnboarding?.tasks) {
    const [welcomeKit, collectDocs, uploadContract, managerMeeting] = taylorOnboarding.tasks;
    await prisma.checklistTask.update({
      where: { id: welcomeKit.id },
      data: { status: "COMPLETED", priority: "HIGH", completedAt: new Date(), completedById: hrEmployee.id },
    });
    await prisma.checklistTask.update({
      where: { id: collectDocs.id },
      data: { status: "IN_PROGRESS", priority: "MEDIUM" },
    });
    await prisma.checklistTask.update({
      where: { id: managerMeeting.id },
      data: { status: "PENDING", priority: "HIGH" },
    });
    await prisma.checklistTaskComment.createMany({
      data: [
        {
          taskId: collectDocs.id,
          authorId: employee.id,
          authorName: "Taylor Brown",
          content: "I have my ID and tax forms ready — where should I drop them off?",
        },
        {
          taskId: collectDocs.id,
          authorId: hrEmployee.id,
          authorName: "Morgan Lee",
          content: "Please bring them to HR on the 2nd floor before Friday.",
        },
      ],
    });
    void uploadContract;
  }

  void davidOnboarding;

  await createChecklistFromTemplate({
    templateId: offboardingTemplate.id,
    employeeId: mike.id,
    companyId: company.id,
    type: "OFFBOARDING",
    startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  });

  await prisma.employee.update({
    where: { id: mike.id },
    data: { status: "INACTIVE" },
  });

  const employeeProfiles = [
    { code: "EMP001", gender: "Male", dob: "1985-04-12" },
    { code: "EMP002", gender: "Male", dob: "1988-09-03" },
    { code: "EMP008", gender: "Female", dob: "1990-01-18" },
    { code: "EMP009", gender: "Female", dob: "1992-07-22" },
    { code: "EMP003", gender: "Male", dob: "1995-06-08" },
    { code: "EMP004", gender: "Female", dob: "1993-11-15" },
    { code: "EMP005", gender: "Male", dob: "1991-03-27" },
    { code: "EMP006", gender: "Female", dob: "1987-12-05" },
    { code: "EMP007", gender: "Male", dob: "1998-02-14" },
  ];
  for (const profile of employeeProfiles) {
    await prisma.employee.update({
      where: { employeeCode: profile.code },
      data: { gender: profile.gender, dateOfBirth: new Date(profile.dob) },
    });
  }

  void offboardingTemplate;
  void pmFolder;

  await prisma.announcement.createMany({
    data: [
      {
        title: "Company Town Hall — August 15",
        content: "Join us for our quarterly town hall meeting. All employees are encouraged to attend.",
        author: "Alex Johnson",
        priority: "HIGH",
        companyId: company.id,
      },
      {
        title: "New Benefits Enrollment Period",
        content: "Open enrollment for health and dental benefits starts September 1. Review your options in the HR portal.",
        author: "Alex Johnson",
        priority: "NORMAL",
        companyId: company.id,
      },
      {
        title: "Office Closure — Labor Day",
        content: "The office will be closed on September 1 for Labor Day. Enjoy the long weekend!",
        author: "HR Team",
        priority: "NORMAL",
        companyId: company.id,
      },
    ],
  });

  await prisma.holiday.createMany({
    data: companyHolidays2026.map((holiday) => ({
      name: holiday.name,
      date: new Date(holiday.date),
      type: holiday.type,
      companyId: company.id,
    })),
  });

  await prisma.applicationActivity.create({
    data: {
      applicationId: chrisApp.id,
      type: "stage_change",
      title: "Stage updated",
      message: "Moved from Screening to 1st Interview",
      actorName: "Jordan Smith",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: managerUser.id,
        type: "leave",
        title: "Leave approval needed",
        message: "Mike Chen requested personal leave",
        href: "/leave",
      },
      {
        userId: employeeUser.id,
        type: "payroll",
        title: "Payslip available",
        message: "Your latest payroll is ready to view",
        href: "/payroll",
      },
    ],
  });

  console.log("Seed completed!");
  console.log("\nDemo accounts (password: password):");
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
