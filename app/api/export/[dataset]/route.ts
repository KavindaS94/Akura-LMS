import { NextResponse } from "next/server";
import { z } from "zod";
import { getTenantContext } from "@/lib/tenant/context";
import { TenantError } from "@/lib/tenant/resolve";
import {
  EXPORT_DATASETS,
  buildTenantCsvExport,
  type ExportDataset,
} from "@/lib/export/tenant-csv";

export const runtime = "nodejs";

const paramsSchema = z.object({
  dataset: z.enum(EXPORT_DATASETS as [ExportDataset, ...ExportDataset[]]),
});

/**
 * Owner-only CSV export. Query: ?slug=
 */
export async function GET(
  req: Request,
  ctx: { params: Promise<{ dataset: string }> },
) {
  const { dataset: raw } = await ctx.params;
  const parsed = paramsSchema.safeParse({ dataset: raw });
  if (!parsed.success) {
    return NextResponse.json({ error: "Unknown dataset" }, { status: 400 });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  try {
    const tenantCtx = await getTenantContext(slug);
    if (!tenantCtx.membership.isOwner) {
      return NextResponse.json(
        { error: "Only the Owner can export institute data." },
        { status: 403 },
      );
    }

    const { filename, csv } = await buildTenantCsvExport({
      tenantId: tenantCtx.tenantId,
      userId: tenantCtx.user.id,
      dataset: parsed.data.dataset,
    });

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof TenantError && err.code === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }
    if (err instanceof TenantError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
