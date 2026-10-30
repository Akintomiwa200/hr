import "dotenv/config";
import { jwtVerify } from "jose";

async function main() {
  const token = process.argv[2];
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || "smart-hr-dev-secret");
  console.log("secret source", process.env.JWT_SECRET ? "env" : "fallback");
  try {
    const { payload } = await jwtVerify(token, secret);
    console.log("verified", JSON.stringify(payload));
  } catch (error) {
    console.error("verify failed", error);
  }
}

main();
