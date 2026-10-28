CREATE TABLE "_EmployeeAdditionalManagers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_EmployeeAdditionalManagers_AB_pkey" PRIMARY KEY ("A", "B"),
    CONSTRAINT "_EmployeeAdditionalManagers_A_fkey" FOREIGN KEY ("A") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EmployeeAdditionalManagers_B_fkey" FOREIGN KEY ("B") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "_EmployeeAdditionalManagers_B_index" ON "_EmployeeAdditionalManagers"("B");

-- The primary manager remains the existing managerId; migrate no data here.
