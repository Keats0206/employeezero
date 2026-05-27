import { getConnectors, getConnectorEvents } from "../lib/db/queries";
import ConnectorsClient from "./ConnectorsClient";

export const dynamic = "force-dynamic";

export default async function ConnectorsPage() {
  const [connectors, events] = await Promise.all([
    getConnectors(),
    getConnectorEvents(20),
  ]);

  return <ConnectorsClient initialConnectors={connectors} initialEvents={events} />;
}
