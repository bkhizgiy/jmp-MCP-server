# Quick Start Guide - 5 Minutes to Your First Agent Run

## Step 1: Install (1 minute)

```bash
cd jmp-MCP-server
pnpm install
```

## Step 2: Set API Key (30 seconds)

```bash
export OPENAI_API_KEY="sk-your-key-here"
```

Don't have one? Get it from https://platform.openai.com/api-keys

**Optional**: Skip this if you just want to see deterministic rules (no LLM).

## Step 3: Run Your First Update (30 seconds)

```bash
pnpm agent propose \
  --task examples/task.yaml \
  --changes examples/input-change.json \
  --out /tmp/my-updated-task.yaml
```

## Step 4: See What Changed (1 minute)

```bash
# View the updated task
cat /tmp/my-updated-task.yaml

# Compare with original
diff examples/task.yaml /tmp/my-updated-task.yaml
```

## Step 5: Try the Interactive Demo (2 minutes)

```bash
./examples/agent-demo.sh
```

This runs through all major features automatically.

## What Just Happened?

The agent:
1. ✅ Read your Tekton Task YAML
2. ✅ Analyzed the Jumpstarter changes
3. ✅ Applied deterministic rules (fast)
4. ✅ Used LLM for complex reasoning (if API key set)
5. ✅ Generated updated YAML with new capabilities
6. ✅ Validated everything against Tekton schemas

## Next Steps

### Learn the Main Commands

```bash
# 1. Just see what would change (safe)
pnpm agent propose --task task.yaml --changes changes.json

# 2. Check if changes are risky
pnpm agent analyze --task task.yaml --changes changes.json

# 3. Let agent decide and apply if safe
pnpm agent auto-update --task task.yaml --changes changes.json --out task.yaml

# 4. Update many tasks at once
pnpm agent batch --tasks-dir ./tasks --changes changes.json --out-dir ./updated
```

### Try With Your Own Files

```bash
# Create your changes file
cat > my-changes.json << 'EOF'
[
  {
    "id": "MY-001",
    "title": "Add custom registry support",
    "description": "Need to push images to custom registry with auth",
    "impactAreas": ["params"],
    "suggestedParams": {
      "registryUrl": "myregistry.com",
      "registrySecret": "my-secret"
    }
  }
]
EOF

# Run the agent
pnpm agent propose --task your-task.yaml --changes my-changes.json --out updated.yaml
```

### Understand Risk Levels

```bash
# Check impact before applying
pnpm agent analyze --task task.yaml --changes changes.json

# Output tells you:
#   Impact Score: 0.25 = Low risk (safe to apply)
#   Impact Score: 0.55 = Medium risk (review recommended)  
#   Impact Score: 0.85 = High risk (manual review required)
```

### Use in CI/CD

Add to your pipeline:

```bash
# Conservative mode for production
pnpm agent auto-update \
  --task prod-task.yaml \
  --changes changes.json \
  --out prod-task.yaml \
  --threshold 0.5

# More aggressive for dev
pnpm agent auto-update \
  --task dev-task.yaml \
  --changes changes.json \
  --out dev-task.yaml \
  --threshold 0.8
```

## Common Patterns

### Pattern 1: Review Before Applying

```bash
# Step 1: See proposed changes
pnpm agent propose --task task.yaml --changes changes.json --out proposed.yaml

# Step 2: Review the diff
diff task.yaml proposed.yaml

# Step 3: Apply if you like it
cp proposed.yaml task.yaml
```

### Pattern 2: Safe Auto-Apply

```bash
# Agent will only apply if safe
pnpm agent auto-update \
  --task task.yaml \
  --changes changes.json \
  --out task.yaml \
  --threshold 0.6
```

### Pattern 3: Batch with Review

```bash
# Process all, agent will flag risky ones
pnpm agent batch \
  --tasks-dir ./all-tasks \
  --changes changes.json \
  --out-dir ./updated

# Review the summary
# Agent shows: "8 auto-applied, 2 require review"
```

## Troubleshooting

### "Command not found"

```bash
# Make sure you're in the right directory
cd jmp-MCP-server

# Make sure dependencies are installed
pnpm install
```

### "OPENAI_API_KEY not set"

```bash
# Option 1: Set the key
export OPENAI_API_KEY="sk-..."

# Option 2: Run without LLM (uses rules only)
pnpm agent propose --task task.yaml --changes changes.json
# Will work but with limited intelligence
```

### "Agent too cautious"

```bash
# Increase threshold (0.0 = cautious, 1.0 = aggressive)
pnpm agent auto-update ... --threshold 0.8
```

### "Agent too aggressive"

```bash
# Decrease threshold
pnpm agent auto-update ... --threshold 0.5
```

## What's Next?

- **Full Guide**: See [README.md](README.md) for complete documentation
- **Architecture**: Read [AGENT_GUIDE.md](AGENT_GUIDE.md) to understand how it works
- **MCP Integration**: Use with Cursor/Claude - see README.md § MCP Integration
- **Examples**: Check [examples/](examples/) directory

## Quick Reference Card

```bash
# Most common commands (copy-paste ready)

# See proposed changes
pnpm agent propose --task task.yaml --changes changes.json --out /tmp/proposed.yaml

# Check risk level
pnpm agent analyze --task task.yaml --changes changes.json

# Auto-apply if safe
pnpm agent auto-update --task task.yaml --changes changes.json --out task.yaml

# Process multiple tasks
pnpm agent batch --tasks-dir ./tasks --changes changes.json --out-dir ./updated

# Check agent memory
pnpm agent state --verbose

# Get help
pnpm agent help
```

---

**Ready to go!** 🚀

You now have an AI agent managing your Tekton updates. Start with `propose`, move to `analyze`, then try `auto-update` when you're comfortable.

