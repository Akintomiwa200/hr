import { revalidatePath } from "next/cache";
import { broadcastEvent } from "@/lib/events";

export function notifyEmployeeChange(
  id: string,
  action: "created" | "updated" | "deleted" | "bulk_updated"
) {
  broadcastEvent("employee_updated", { id, action });
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  revalidatePath(`/employees/${id}`);
}
