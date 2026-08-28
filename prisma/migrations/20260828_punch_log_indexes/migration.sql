-- Speed up attendance overview and punch replay queries
CREATE INDEX IF NOT EXISTS "AttendancePunchLog_serialNumber_punchedAt_idx"
  ON "AttendancePunchLog" ("serialNumber", "punchedAt" DESC);

CREATE INDEX IF NOT EXISTS "AttendancePunchLog_punchedAt_idx"
  ON "AttendancePunchLog" ("punchedAt" DESC);

CREATE INDEX IF NOT EXISTS "AttendancePunchLog_processed_error_idx"
  ON "AttendancePunchLog" ("processed", "error");
