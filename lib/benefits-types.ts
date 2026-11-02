export type BenefitLive = {
  currencyCode: string;
  leave: {
    balance: number | null;
    annualDefaultDays: number;
    pending: number;
    approved: number;
    familyApproved: number;
    allocationEnabled: boolean;
  };
  loans: {
    pending: number;
    approved: number;
    outstanding: number;
  };
  pension: {
    configured: boolean;
    monthlyAmount: number;
    label: string | null;
  };
  bonuses: {
    enabled: boolean;
    pending: number;
    approvedValue: number;
    paidValue: number;
    annualPlans: number;
    holidayAllowanceEnabled: boolean;
    holidayAllowanceAmount: number;
  };
  training: {
    activeCycles: number;
    completedReviews: number;
  };
  medical: {
    documentCount: number;
    folderCount: number;
  };
  mobility: {
    openRoles: number;
  };
};

export type BenefitAccess = {
  canManageDocuments: boolean;
  canManagePayroll: boolean;
  canManageBonuses: boolean;
  canApproveLoans: boolean;
  canManagePerformance: boolean;
  canManageRecruitment: boolean;
  role: string;
};
