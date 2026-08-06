import { revalidatePath } from "next/cache";
import { broadcastAppEvent } from "@/lib/realtime-broadcast";

export function notifyEmployeeChange(
  id: string,
  action: "created" | "updated" | "deleted" | "bulk_updated"
) {
  broadcastAppEvent("employee_updated", { id, action });
  revalidatePath("/employees");
  revalidatePath("/dashboard");
  revalidatePath(`/employees/${id}`);
}
