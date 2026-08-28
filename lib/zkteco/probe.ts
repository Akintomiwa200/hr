import net from "node:net";
import { isPrivateIpv4 } from "@/lib/zkteco/device-ip";

export type ProbeResult = "open" | "refused" | "timeout" | "unreachable";

const PRIVATE_CONNECT_MS = 12_000;
const PUBLIC_CONNECT_MS = 8_000;

export function connectTimeoutMs(ip: string) {
  return isPrivateIpv4(ip) ? PRIVATE_CONNECT_MS : PUBLIC_CONNECT_MS;
}

export function probeTcp(ip: string, port: number, timeoutMs: number) {
  return new Promise<ProbeResult>((resolve) => {
    const socket = net.connect({ host: ip, port });
    let settled = false;
    const finish = (result: ProbeResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardStop);
      socket.destroy();
      resolve(result);
    };
    const hardStop = setTimeout(() => finish("timeout"), timeoutMs);
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish("open"));
    socket.once("timeout", () => finish("timeout"));
    socket.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ECONNREFUSED" || err.code === "ECONNRESET") finish("refused");
      else if (err.code === "EHOSTUNREACH" || err.code === "ENETUNREACH") finish("unreachable");
      else finish("timeout");
    });
  });
}

export async function probeDevicePort(ip: string, port: number, timeoutMs?: number) {
  return probeTcp(ip, port, timeoutMs ?? connectTimeoutMs(ip));
}
