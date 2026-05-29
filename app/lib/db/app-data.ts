// Data layer for generated-app documents — the centralized, schemaless store
// every business Cabana ships writes into. See appProjects / appDocuments in
// schema.ts. Reads here are Cabana-internal (CoS + Desk); writes come through
// the public ingestion API after key validation.

import { db } from "./index";
import { appProjects, appDocuments } from "./schema";
import { and, eq, desc, sql } from "drizzle-orm";

export type AppDocument = {
  id: string;
  project_id: string;
  collection: string;
  data: Record<string, unknown>;
  created_at: Date;
};

// Mint a new project for a generated app. Returns the id + public write key to
// bake into the page.
export async function createAppProject(opts: { cabanaId?: string; label?: string } = {}) {
  const [row] = await db
    .insert(appProjects)
    .values({ cabana_id: opts.cabanaId ?? null, label: opts.label ?? "" })
    .returning();
  return row;
}

export async function getAppProject(projectId: string) {
  const [row] = await db.select().from(appProjects).where(eq(appProjects.id, projectId)).limit(1);
  return row ?? null;
}

// Validate that the supplied public key matches the project. Cheap gate for the
// public ingestion endpoint — write-only, so a leaked key only allows writes
// into that one project's collections.
export async function projectKeyValid(projectId: string, publicKey: string) {
  const project = await getAppProject(projectId);
  return !!project && project.public_key === publicKey;
}

// Write a document. `data` is whatever the generated app sent — any shape.
export async function insertDocument(
  projectId: string,
  collection: string,
  data: Record<string, unknown>,
) {
  const [row] = await db
    .insert(appDocuments)
    .values({ project_id: projectId, collection, data })
    .returning();
  return row as AppDocument;
}

// Read a project's documents, newest first. Optionally scoped to a collection.
export async function listDocuments(
  projectId: string,
  opts: { collection?: string; limit?: number } = {},
) {
  const where = opts.collection
    ? and(eq(appDocuments.project_id, projectId), eq(appDocuments.collection, opts.collection))
    : eq(appDocuments.project_id, projectId);
  return db
    .select()
    .from(appDocuments)
    .where(where)
    .orderBy(desc(appDocuments.created_at))
    .limit(opts.limit ?? 200) as Promise<AppDocument[]>;
}

// Per-collection counts for a project — drives the Signals summary.
export async function countByCollection(projectId: string) {
  const rows = await db
    .select({ collection: appDocuments.collection, count: sql<number>`count(*)::int` })
    .from(appDocuments)
    .where(eq(appDocuments.project_id, projectId))
    .groupBy(appDocuments.collection);
  return rows as { collection: string; count: number }[];
}
