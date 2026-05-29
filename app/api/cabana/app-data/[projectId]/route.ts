// Cabana-internal read of a generated app's captured documents. Drives the
// Desk's Signals tab. Same-origin only (no CORS) — this is the owner view, not
// the public write path.

import { listDocuments, countByCollection } from "@/app/lib/db/app-data";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const url = new URL(req.url);
  const collection = url.searchParams.get("collection") ?? undefined;

  const [documents, counts] = await Promise.all([
    listDocuments(projectId, { collection }),
    countByCollection(projectId),
  ]);

  return Response.json({ documents, counts });
}
