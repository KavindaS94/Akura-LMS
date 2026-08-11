import { auth } from "@/lib/auth/server";
import { enforceHostCookies } from "@/lib/auth/cookies";

const handler = auth.handler();

async function wrap(
  method: keyof typeof handler,
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) {
  const response = await handler[method](request, ctx);
  return enforceHostCookies(response);
}

export const GET = (
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) => wrap("GET", request, ctx);

export const POST = (
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) => wrap("POST", request, ctx);

export const PUT = (
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) => wrap("PUT", request, ctx);

export const PATCH = (
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) => wrap("PATCH", request, ctx);

export const DELETE = (
  request: Request,
  ctx: { params: Promise<{ path: string[] }> },
) => wrap("DELETE", request, ctx);
