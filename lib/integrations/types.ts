export type IntegrationProvider =
  | "GOOGLE_WORKSPACE"
  | "ZOHO_PEOPLE"
  | "ZOHO_RECRUIT"
  | "ZOHO_BOOKS"
  | "ZOHO_SIGN"
  | "ZOHO_MAIL";

export type IntegrationStatus = "DISCONNECTED" | "CONNECTED" | "ERROR" | "SYNCING";

export type IntegrationRecord = {
  id: string;
  companyId: string | null;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  accessToken: string | null;
  refreshToken: string | null;
  expiryDate: Date | null;
  accountEmail: string | null;
  accountId: string | null;
  scopes: string | null;
  metadata: string | null;
  webhookSecret: string | null;
  lastSyncAt: Date | null;
  lastError: string | null;
  connectedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
