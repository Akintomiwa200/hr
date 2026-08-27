export const BRANCH_TIMEZONES = [
  { value: "Africa/Lagos", label: "West Africa (Lagos, WAT)" },
  { value: "Africa/Accra", label: "Ghana (Accra, GMT)" },
  { value: "Africa/Abidjan", label: "Côte d'Ivoire (Abidjan, GMT)" },
  { value: "Africa/Nairobi", label: "East Africa (Nairobi, EAT)" },
  { value: "Africa/Johannesburg", label: "Southern Africa (Johannesburg, SAST)" },
  { value: "Africa/Cairo", label: "Egypt (Cairo)" },
  { value: "Africa/Casablanca", label: "Morocco (Casablanca)" },
  { value: "Europe/London", label: "United Kingdom (London)" },
  { value: "Europe/Paris", label: "Central Europe (Paris)" },
  { value: "Asia/Dubai", label: "UAE (Dubai, GST)" },
  { value: "Asia/Kolkata", label: "India (Kolkata, IST)" },
  { value: "America/New_York", label: "US Eastern" },
  { value: "America/Chicago", label: "US Central" },
  { value: "America/Los_Angeles", label: "US Pacific" },
  { value: "UTC", label: "UTC" },
] as const;

export const DEFAULT_BRANCH_TIMEZONE = "Africa/Lagos";

export function isKnownTimezone(value: string) {
  return BRANCH_TIMEZONES.some((tz) => tz.value === value);
}
