/** Default password for newly onboarded employee accounts */
export const DEFAULT_EMPLOYEE_PASSWORD = "password";

export function getAppUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}
