import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.jobApplication.deleteMany();
  await prisma.job.deleteMany();
  await prisma.performanceReview.deleteMany();
  await prisma.document.deleteMany();
  await prisma.payrollRecord.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const departments = await Promise.all([
    prisma.department.create({ data: { name: "Human Resources", description: "HR and people operations" } }),
    prisma.department.create({ data: { name: "Engineering", description: "Software development" } }),
    prisma.department.create({ data: { name: "Marketing", description: "Brand and growth" } }),
    prisma.department.create({ data: { name: "Finance", description: "Accounting and finance" } }),
    prisma.department.create({ data: { name: "Operations", description: "Business operations" } }),
  ]);

  const [hrDept, engDept, mktDept, finDept, opsDept] = departments;

  const adminUser = await prisma.user.create({
    data: { email: "admin@smarthr.com", passwordHash, role: Role.ADMIN },
  });

  const managerUser = await prisma.user.create({
    data: { email: "manager@smarthr.com", passwordHash, role: Role.MANAGER },
  });

  const employeeUser = await prisma.user.create({
    data: { email: "employee@smarthr.com", passwordHash, role: Role.EMPLOYEE },
  });

  const extraUsers = await Promise.all([
    prisma.user.create({ data: { email: "sarah.j@smarthr.com", passwordHash, role: Role.EMPLOYEE } }),
    prisma.user.create({ data: { email: "mike.c@smarthr.com", passwordHash, role: Role.EMPLOYEE } }),
    prisma.user.create({ data: { email: "lisa.w@smarthr.com", passwordHash, role: Role.MANAGER } }),
    prisma.user.create({ data: { email: "david.r@smarthr.com", passwordHash, role: Role.EMPLOYEE } }),
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
      managerId: admin.id,
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
      managerId: manager.id,
      hireDate: new Date("2024-02-01"),
      salary: 65000,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (const emp of [admin, manager, employee, sarah, mike, lisa]) {
      await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date,
          checkIn: new Date(date.getTime() + 9 * 60 * 60 * 1000),
          checkOut: new Date(date.getTime() + 17 * 60 * 60 * 1000),
          status: i === 1 && emp.id === employee.id ? "LATE" : "PRESENT",
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

  for (const emp of [admin, manager, employee, sarah, mike, lisa]) {
    const bonus = emp.salary * 0.05;
    const deductions = emp.salary * 0.15;
    await prisma.payrollRecord.create({
      data: {
        employeeId: emp.id,
        periodStart,
        periodEnd,
        baseSalary: emp.salary,
        bonus,
        deductions,
        netPay: emp.salary + bonus - deductions,
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
      description: "We are looking for an experienced full stack developer to join our engineering team.",
      requirements: "5+ years experience, React, Node.js, TypeScript, PostgreSQL",
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
      status: "OPEN",
    },
  });

  await prisma.jobApplication.createMany({
    data: [
      {
        jobId: engJob.id,
        firstName: "Chris",
        lastName: "Anderson",
        email: "chris.a@email.com",
        phone: "+1 555-0201",
        status: "INTERVIEW",
        reviewerId: manager.id,
      },
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

  await prisma.performanceReview.createMany({
    data: [
      {
        employeeId: employee.id,
        managerId: manager.id,
        period: "Q2 2026",
        rating: 4,
        goals: "Deliver feature X, improve code quality, mentor junior dev",
        achievements: "Shipped 3 major features, reduced bug count by 30%",
        feedback: "Strong performer, ready for senior role consideration",
        status: "COMPLETED",
        reviewDate: new Date("2026-07-01"),
      },
      {
        employeeId: sarah.id,
        managerId: admin.id,
        period: "Q2 2026",
        goals: "Launch Q3 campaign, grow social media by 20%",
        status: "IN_PROGRESS",
      },
    ],
  });

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
  console.log("  Admin:    admin@smarthr.com");
  console.log("  Manager:  manager@smarthr.com");
  console.log("  Employee: employee@smarthr.com");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
