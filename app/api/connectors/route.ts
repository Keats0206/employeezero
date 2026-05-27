import { NextResponse } from "next/server";
import { getConnectors, getConnectorEvents } from "@/app/lib/db/queries";

export async function GET() {
  const [items, events] = await Promise.all([getConnectors(), getConnectorEvents(20)]);
  return NextResponse.json({ items, events });
}
