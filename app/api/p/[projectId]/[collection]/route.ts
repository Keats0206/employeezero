// Public ingestion endpoint for generated apps. A landing page Cabana ships
// POSTs form submissions here; we validate the project's public key, then store
// the payload as a schemaless document. Write-only and cross-origin (the page
// lives on its own *.vercel.app domain), so CORS is wide open for POST.

import { projectKeyValid, insertDocument } from "@/app/lib/db/app-data";

export const runtime = "nodejs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-cabana-key",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ projectId: string; collection: string }> },
) {
  const { projectId, collection } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }

  // Key can arrive as a header (preferred) or in the body as `_key` so a plain
  // HTML form fetch with no custom headers still works.
  const key = req.headers.get("x-cabana-key") ?? (typeof body._key === "string" ? body._key : "");
  if (!key || !(await projectKeyValid(projectId, key))) {
    return json({ error: "invalid project key" }, 401);
  }

  // Strip control fields; everything else is the document.
  const { _key, ...data } = body;
  void _key;

  const doc = await insertDocument(projectId, collection, data);
  return json({ ok: true, id: doc.id }, 200);
}

function json(obj: unknown, status: number) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
