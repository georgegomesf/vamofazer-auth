import { handlers } from "@/auth";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  return await handlers.GET(req);
}

export async function POST(req: NextRequest) {
  return await handlers.POST(req);
}
