import { iclockOk } from "@/lib/zkteco/protocol";

/** Some firmware probes /iclock before /iclock/cdata. */
export async function GET() {
  return iclockOk();
}

export async function POST() {
  return iclockOk();
}
