import { NextResponse } from "next/server";
import QRCode from "qrcode";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");
  const format = searchParams.get("format") === "svg" ? "svg" : "png";
  if (!data || data.length > 2048) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  if (format === "svg") {
    const svg = await QRCode.toString(data, { type: "svg", margin: 1 });
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  const png = await QRCode.toBuffer(data, { type: "png", margin: 1, width: 320 });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
