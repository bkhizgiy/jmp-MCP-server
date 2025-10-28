#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import { loadChangesFromFile } from "./jumpstarter/client.js";
import { applyDeterministicRules, validateTaskYaml, mergeYAMLs, writeOut } from "./tekton/updater.js";
import { proposeWithLLM } from "./llm/propose.js";

function read(p: string) { return fs.readFileSync(path.resolve(p), "utf8"); }

async function propose(changePath: string, taskPath: string, out?: string) {
  const changes = await loadChangesFromFile(changePath);
  const orig = read(taskPath);
  validateTaskYaml(orig);
  const rules = applyDeterministicRules(orig, changes);
  const latest = rules.reverse().find(r => r.yaml)?.yaml || orig;
  const proposal = await proposeWithLLM(latest, changes);
  const merged = mergeYAMLs(proposal.updatedTaskYAML, latest);
  if (out) await writeOut(out, merged);
  else process.stdout.write(merged);
  process.stderr.write(["\nNotes:", ...rules.flatMap(r=>r.notes), ...proposal.notes].join("\n") + "\n");
}

async function apply(taskPath: string, patchPath: string, out: string) {
  const orig = read(taskPath);
  const updated = read(patchPath);
  // validate both
  validateTaskYaml(orig);
  validateTaskYaml(updated);
  await writeOut(out, updated);
  process.stderr.write(`Wrote ${out}\n`);
}

const [,, cmd, ...args] = process.argv;

(async () => {
  if (cmd === "propose") {
    const changeIdx = args.indexOf("--change");
    const taskIdx = args.indexOf("--task");
    const outIdx = args.indexOf("--out");
    if (changeIdx === -1 || taskIdx === -1) {
      console.error("Usage: propose --change <changes.json> --task <task.yaml> [--out <outfile>]");
      process.exit(1);
    }
    await propose(args[changeIdx+1], args[taskIdx+1], outIdx !== -1 ? args[outIdx+1] : undefined);
    return;
  }
  if (cmd === "apply") {
    const taskIdx = args.indexOf("--task");
    const patchIdx = args.indexOf("--patch");
    const outIdx = args.indexOf("--out");
    if (taskIdx === -1 || patchIdx === -1 || outIdx === -1) {
      console.error("Usage: apply --task <task.yaml> --patch <proposal.yaml> --out <outfile>");
      process.exit(1);
    }
    await apply(args[taskIdx+1], args[patchIdx+1], args[outIdx+1]);
    return;
  }
  console.log(`Commands:
  propose --change <changes.json> --task <task.yaml> [--out <outfile>]
  apply   --task <task.yaml> --patch <proposal.yaml> --out <outfile>
  `);
})().catch(e => { console.error(e); process.exit(1); });
