export type ChatPresence = "ONLINE" | "AWAY" | "OFFLINE";

export function presenceLabel(presence?: ChatPresence) {
  return presence === "ONLINE" ? "Live" : presence === "AWAY" ? "Away" : "Offline";
}

export function presenceColor(presence?: ChatPresence) {
  return presence === "ONLINE"
    ? "bg-emerald-500"
    : presence === "AWAY"
      ? "bg-amber-400"
      : "bg-gray-400";
}

export function presenceTextColor(presence?: ChatPresence) {
  return presence === "ONLINE"
    ? "text-emerald-700"
    : presence === "AWAY"
      ? "text-amber-700"
      : "text-gray-400";
}
