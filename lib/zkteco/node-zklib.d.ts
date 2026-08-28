declare module "node-zklib" {
  class ZKLib {
    constructor(ip: string, port?: number, timeout?: number, inport?: number);
    createSocket(): Promise<unknown>;
    disconnect(): Promise<unknown>;
    getAttendances(): Promise<{
      data?: Array<{
        userSn?: number;
        deviceUserId?: string | number;
        recordTime?: Date | string;
        ip?: string;
      }>;
      err?: Error | null;
    }>;
    getInfo(): Promise<{ userCounts?: number; logCounts?: number; logCapacity?: number }>;
    executeCmd(command: number, data?: string | Buffer): Promise<Buffer>;
  }

  export = ZKLib;
}
