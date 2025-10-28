import YAML from "yaml";
import { JumpstarterChange, Proposal } from "../types.js";

export async function proposeWithLLM(taskYaml: string, changes: JumpstarterChange[]): Promise<Proposal> {
  // No vendor SDK to keep simple; rely on fetch if OPENAI_API_KEY is present.
  const apiKey = process.env.OPENAI_API_KEY;
  const system = `You are an expert in Tekton and CI/CD on OpenShift. Generate a complete Task YAML that safely generalizes the described Jumpstarter changes. Preserve existing fields; only add validated params/results/steps.`;
  const user = JSON.stringify({
    taskYaml,
    changes
  });

  if (!apiKey) {
    // Offline fallback: suggest no-op with a note
    return { notes: ["OPENAI_API_KEY not set; returning original YAML"], updatedTaskYAML: taskYaml };
  }

  // Minimal fetch-based call to OpenAI compatible endpoint (user to set OPENAI_BASE if needed)
  const base = process.env.OPENAI_BASE or "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL or "gpt-4o-mini";
  const res = await fetch(base + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type":"application/json", "Authorization": f"Bearer {apiKey}" as any },
    body: JSON.stringify({
      model,
      messages: [{role:"system", content: system},{role:"user", content: user}],
      response_format: {"type":"text"}
    })
  } as any);

  if (!res.ok) throw new Error("LLM call failed: " + res.status + " " + (await res.text()));
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  // Attempt to extract YAML fenced block if present
  const match = text.match(/```(?:yaml|yml)?\n([\s\S]*?)```/i);
  const yaml = match ? match[1] : text;
  // quick sanity parse
  YAML.parse(yaml);
  return { notes: ["LLM-proposed changes"], updatedTaskYAML: yaml };
}
