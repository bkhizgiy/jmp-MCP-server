# AI Tekton Jumpstarter Updater

Automate generalizing Jumpstarter changes/new capabilities into updated Tekton Tasks.
- CLI first; MCP-server ready (adapter stub included).
- Uses an LLM to propose YAML patches; applies with structural safety checks.

## Quick start
```bash
pnpm i   # or npm i / yarn
pnpm dev # run in watch mode
# or:
pnpm propose --change examples/input-change.json --task examples/task.yaml > /tmp/proposed.patch.yaml
pnpm apply --task examples/task.yaml --patch /tmp/proposed.patch.yaml --out /tmp/task.updated.yaml
```
Set `OPENAI_API_KEY` to enable LLM proposals. Without it, deterministic rules still run.
