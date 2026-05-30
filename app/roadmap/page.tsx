import fs from "fs";
import path from "path";
import RoadmapClient from "./RoadmapClient";

export const metadata = { title: "Roadmap — Cabana" };

export default function RoadmapPage() {
  const mdPath = path.join(process.cwd(), "app", "roadmap", "roadmap.md");
  const source = fs.readFileSync(mdPath, "utf-8");
  return <RoadmapClient source={source} />;
}
