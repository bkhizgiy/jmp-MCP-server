// Minimal MCP-like JSON-RPC over stdio (adapter stub).
// You can wire this into Cursor/VSCode MCP clients later.
import { loadChangesFromFile } from "./jumpstarter/client.js";
import { applyDeterministicRules, validateTaskYaml, mergeYAMLs } from "./tekton/updater.js";
import { proposeWithLLM } from "./llm/propose.js";
import fs from "node:fs";

type Req = { id: number|string, method: string, params?: any };
type Res = { id: number|string, result?: any, error?: {code:number,message:string} };

async function handle(req: Req): Promise<Res> {
  try {
    if (req.method === "proposeUpdate") {
      const { changePath, taskYaml } = req.params;
      const changes = changePath ? await loadChangesFromFile(changePath) : req.params.changes;
      validateTaskYaml(taskYaml);
      const deterministic = applyDeterministicRules(taskYaml, changes);
      const latest = deterministic.reverse().find(r => r.yaml)?.yaml || taskYaml;
      const proposal = await proposeWithLLM(latest, changes);
      const merged = mergeYAMLs(proposal.updatedTaskYAML, latest);
      return { id: req.id, result: { yaml: merged, notes: [...deterministic.flatMap(r=>r.notes), ...proposal.notes] } };
    }
    return { id: req.id, error: { code: -32601, message: "Method not found" } };
  } catch (e:any) {
    return { id: req.id, error: { code: -32000, message: e.message } };
  }
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", async (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx+1);
    if (!line) continue;
    const req = JSON.parse(line) as Req;
    const res = await handle(req);
    process.stdout.write(JSON.stringify(res) + "\n");
  }
});
