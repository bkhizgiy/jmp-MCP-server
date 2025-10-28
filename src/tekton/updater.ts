import YAML from "yaml";
import Ajv from "ajv";
import fs from "node:fs";
import path from "node:path";
import schema from "./schemas/task.schema.json" assert { type: "json" };
import { DeterministicRuleResult, JumpstarterChange } from "../types.js";

const ajv = new Ajv({allErrors:true});

export function validateTaskYaml(yamlStr: string) {
  const obj = YAML.parse(yamlStr);
  const validate = ajv.compile(schema as any);
  const ok = validate(obj);
  if (!ok) {
    const msg = ajv.errorsText(validate.errors);
    throw new Error("Tekton Task schema validation failed: " + msg);
  }
  return obj;
}

// Simple deterministic rules that generalize frequent Jumpstarter updates.
export function applyDeterministicRules(yamlStr: string, changes: JumpstarterChange[]): DeterministicRuleResult[] {
  const obj = YAML.parse(yamlStr);
  const results: DeterministicRuleResult[] = [];

  // Rule 1: If change mentions "secondary network", ensure NET_ATTACH_DEF param exists
  {
    const name = "ensure-secondary-network-param";
    const mentionsSecondary = changes.some(c =>
      /secondary\s+network|multus|nad/i.test([c.title,c.description].join(" "))
    );
    if (mentionsSecondary) {
      obj.spec.params = obj.spec.params || [];
      const hasParam = (obj.spec.params as any[]).some(p => p.name === "secondaryNetworkNAD");
      if (!hasParam) {
        (obj.spec.params as any[]).push({ name: "secondaryNetworkNAD", type: "string", description: "NetworkAttachmentDefinition name for secondary network (Multus)." });
        results.push({ name, changed: true, notes: ["Added param secondaryNetworkNAD"], yaml: YAML.stringify(obj) });
      } else {
        results.push({ name, changed: false, notes: ["Param already present"] });
      }
    }
  }

  // Rule 2: Add results placeholder when change mentions "export" or "artifact"
  {
    const name = "ensure-results-for-artifacts";
    const mentionsArtifacts = changes.some(c => /artifact|result|export/i.test([c.title,c.description].join(" ")));
    if (mentionsArtifacts) {
      obj.spec.results = obj.spec.results || [];
      const hasRes = (obj.spec.results as any[]).some(r => r.name === "artifactDigest");
      if (!hasRes) {
        (obj.spec.results as any[]).push({ name: "artifactDigest", description: "Digest of produced artifact/image" });
        results.push({ name, changed: true, notes: ["Added result artifactDigest"], yaml: YAML.stringify(obj) });
      } else {
        results.push({ name, changed: false, notes: ["Result already present"] });
      }
    }
  }

  // Rule 3: For Buildah users, ensure QUAY_URL param when change mentions "quay"
  {
    const name = "ensure-quay-url-param";
    const mentionsQuay = changes.some(c => /quay\.io|quay/i.test([c.title,c.description].join(" ")));
    if (mentionsQuay) {
      obj.spec.params = obj.spec.params || [];
      const hasParam = (obj.spec.params as any[]).some(p => p.name === "quayUrl");
      if (!hasParam) {
        (obj.spec.params as any[]).push({ name: "quayUrl", type: "string", description: "Target Quay repository (e.g., quay.io/org/repo)" });
        results.push({ name, changed: true, notes: ["Added param quayUrl"], yaml: YAML.stringify(obj) });
      } else {
        results.push({ name, changed: false, notes: ["Param already present"] });
      }
    }
  }

  return results;
}

export function mergeYAMLs(preferred: string, fallback: string): string {
  // naive: prefer preferred; fallback unused for now; kept for future merge strategies
  return preferred || fallback;
}

export async function writeOut(outPath: string, content: string) {
  const full = path.resolve(outPath);
  fs.mkdirSync(path.dirname(full), { recursive: True as any });
  fs.writeFileSync(full, content, "utf8");
}
