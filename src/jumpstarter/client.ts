// Placeholder: adapt to your Jumpstarter sources (Git, API, Changelog)
import fs from "node:fs";
import path from "node:path";
import { JumpstarterChange } from "../types.js";

export async function loadChangesFromFile(p: string): Promise<JumpstarterChange[]> {
  const full = path.resolve(p);
  const raw = fs.readFileSync(full, "utf8");
  const j = JSON.parse(raw);
  if (Array.isArray(j)) return j;
  return [j];
}
