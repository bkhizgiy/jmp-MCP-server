# Tekton Jumpstarter AI Agent

An **autonomous AI agent** that intelligently manages Tekton Task updates from Jumpstarter changes. Goes beyond simple CLI automation with reasoning, memory, planning, and decision-making capabilities.

> **🚀 New here?** Check out the [QUICK_START.md](QUICK_START.md) guide for a 5-minute hands-on introduction!

## 📋 Table of Contents
- [What It Does](#what-it-does)
- [Quick Start](#quick-start)
- [Common Workflows](#common-workflows)
- [Command Reference](#command-reference)
- [Agent Features](#agent-features)
- [MCP Integration](#mcp-integration)
- [Configuration](#configuration)
- [Examples](#examples)

## What It Does

This agent automates the process of updating Tekton CI/CD Task definitions when your Jumpstarter environment gains new capabilities.

### Visual Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        INPUT                                     │
│  ┌────────────────┐              ┌────────────────────┐        │
│  │ Tekton Task    │              │ Jumpstarter Changes│        │
│  │ YAML           │              │ (JSON)             │        │
│  │ - params       │              │ - New capabilities │        │
│  │ - steps        │              │ - Network configs  │        │
│  │ - results      │              │ - Security needs   │        │
│  └────────────────┘              └────────────────────┘        │
└────────────────────────┬─────────────────┬─────────────────────┘
                         │                 │
                         └────────┬────────┘
                                  ▼
                    ┌─────────────────────────┐
                    │    AI AGENT PROCESSING  │
                    │                         │
                    │  1. Observe & Analyze   │
                    │  2. Reason about Risk   │
                    │  3. Decide Action       │
                    │  4. Execute Update      │
                    │  5. Learn & Remember    │
                    └────────────┬────────────┘
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        OUTPUT                                    │
│  ┌────────────────┐    ┌──────────────┐    ┌────────────────┐ │
│  │ Updated YAML   │    │ Risk Score   │    │ Reasoning      │ │
│  │ + new params   │    │ 0.35 = Safe  │    │ "Low impact,   │ │
│  │ + new steps    │    │ 0.85 = Review│    │  auto-applied" │ │
│  │ + validated    │    │              │    │                │ │
│  └────────────────┘    └──────────────┘    └────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Key Capabilities

**Input**: 
- Your existing Tekton Task YAML
- Description of Jumpstarter changes (new features, network configs, etc.)

**Processing**:
- 🧠 **Reasons** about impact and risk using LLM + rules
- 💾 **Learns** from past updates and outcomes
- 🎯 **Decides** autonomously whether to apply or review
- 📊 **Tracks** success/failure patterns over time

**Output**:
- Updated Task YAML with appropriate params, steps, and configurations
- Risk assessment score (0-1, where >0.7 = needs review)
- Transparent reasoning for all decisions
- Validation against Tekton schemas

## Quick Start

### 1. Installation

```bash
# Clone the repo
git clone <your-repo-url>
cd jmp-MCP-server

# Install dependencies
pnpm install    # or: npm install / yarn

# Build TypeScript
pnpm build

# Set up OpenAI API (required for LLM features)
export OPENAI_API_KEY="sk-your-key-here"
```

### 2. Run Your First Update

```bash
# Try the interactive demo
./examples/agent-demo.sh

# Or manually propose an update
pnpm agent propose \
  --task examples/task.yaml \
  --changes examples/input-change.json \
  --out /tmp/updated-task.yaml

# Review the output
cat /tmp/updated-task.yaml
```

### 3. Check What the Agent Learned

```bash
pnpm agent state --verbose
```

**That's it!** You now have an autonomous agent managing your Tekton updates.

## Common Workflows

### Workflow 1: Safe Production Update

**Scenario**: You have changes to apply but want to verify safety first.

```bash
# Step 1: Analyze the risk
pnpm agent analyze \
  --task production-task.yaml \
  --changes latest-changes.json

# Output shows:
#   Impact Score: 0.35
#   Requires Review: NO
#   Recommendation: auto-apply

# Step 2: Let agent decide and apply
pnpm agent auto-update \
  --task production-task.yaml \
  --changes latest-changes.json \
  --out production-task.yaml \
  --threshold 0.7

# Agent will auto-apply if safe, or request review if risky
```

### Workflow 2: Bulk Update Across Multiple Tasks

**Scenario**: You need to apply the same changes to 50+ task definitions.

```bash
# Create directory structure
mkdir -p updated-tasks

# Let the agent process all tasks intelligently
pnpm agent batch \
  --tasks-dir ./tekton-tasks \
  --changes quarterly-updates.json \
  --out-dir ./updated-tasks

# Review results
# Agent applies different strategies per task based on complexity
```

### Workflow 3: Continuous Integration

**Scenario**: Automatically update tasks when changes are detected.

```bash
# In your CI pipeline
#!/bin/bash
set -e

# Pull latest changes
git pull origin main

# Agent analyzes and applies safe updates
pnpm agent auto-update \
  --task ./tasks/build-task.yaml \
  --changes ./changes/latest.json \
  --out ./tasks/build-task.yaml \
  --threshold 0.6

# Commit if changes were made
if git diff --quiet ./tasks/build-task.yaml; then
  echo "No changes needed"
else
  git add ./tasks/build-task.yaml
  git commit -m "Auto-update: Applied low-impact changes"
  git push
fi
```

### Workflow 4: Work with AI Assistants (Cursor/Claude)

**Scenario**: Use natural language to update tasks via your IDE.

```bash
# Start MCP server
pnpm agent mcp-server
```

Then in Cursor/Claude:
```
You: "Update all my Tekton tasks to support the new Multus networking configuration"
AI: *Uses propose_tekton_update tool*
    "I've analyzed your tasks and proposed updates. Task 1 needs review (high impact),
     but Tasks 2-5 can be auto-applied. Would you like me to proceed?"
```

## Command Reference

### `pnpm agent propose`

Proposes updates to a Tekton Task with AI reasoning.

```bash
pnpm agent propose \
  --task <path-to-task.yaml> \
  --changes <path-to-changes.json> \
  [--out <output-path>]
```

**Options**:
- `--task` (required) - Path to your Tekton Task YAML
- `--changes` (required) - Path to Jumpstarter changes JSON
- `--out` (optional) - Where to save updated YAML (prints to stdout if omitted)

**Example**:
```bash
pnpm agent propose \
  --task ./my-task.yaml \
  --changes ./new-features.json \
  --out ./my-task-updated.yaml
```

### `pnpm agent analyze`

Analyzes impact and risk of proposed changes WITHOUT applying them.

```bash
pnpm agent analyze \
  --task <path-to-task.yaml> \
  --changes <path-to-changes.json>
```

**Output**:
```
Impact Score: 0.42
Requires Review: NO
Recommendation: auto-apply
Reasoning: Changes affect network configuration but are low risk
```

**Example**:
```bash
pnpm agent analyze \
  --task ./critical-task.yaml \
  --changes ./breaking-changes.json
```

### `pnpm agent auto-update`

Automatically applies changes IF the agent determines they're safe.

```bash
pnpm agent auto-update \
  --task <path-to-task.yaml> \
  --changes <path-to-changes.json> \
  --out <output-path> \
  [--threshold <0.0-1.0>]
```

**Options**:
- `--threshold` (optional, default: 0.7) - Impact score threshold for auto-apply
  - Lower = more cautious (0.5 = only very safe changes)
  - Higher = more aggressive (0.9 = apply almost everything)

**Example**:
```bash
# Cautious mode
pnpm agent auto-update \
  --task ./prod.yaml \
  --changes ./changes.json \
  --out ./prod.yaml \
  --threshold 0.5

# Aggressive mode
pnpm agent auto-update \
  --task ./dev.yaml \
  --changes ./changes.json \
  --out ./dev.yaml \
  --threshold 0.9
```

### `pnpm agent batch`

Process multiple Tekton Tasks in batch mode.

```bash
pnpm agent batch \
  --tasks-dir <directory-with-yamls> \
  --changes <path-to-changes.json> \
  --out-dir <output-directory>
```

**Example**:
```bash
pnpm agent batch \
  --tasks-dir ./catalog/tasks \
  --changes ./updates/q1-2026.json \
  --out-dir ./catalog/tasks-v2
```

### `pnpm agent state`

View agent's memory, learning history, and statistics.

```bash
pnpm agent state [--verbose]
```

**Example**:
```bash
# Quick summary
pnpm agent state

# Detailed history
pnpm agent state --verbose
```

### `pnpm agent mcp-server`

Start MCP server for AI assistant integration.

```bash
pnpm agent mcp-server [--state-dir <path>]
```

**Example**:
```bash
# Start with default state directory
pnpm agent mcp-server

# Custom state directory
pnpm agent mcp-server --state-dir /path/to/state
```

### Legacy Commands (Backwards Compatible)

Original CLI commands still work:

```bash
# Old propose command
pnpm propose --change changes.json --task task.yaml > output.yaml

# Old apply command
pnpm apply --task task.yaml --patch patch.yaml --out output.yaml
```

## Agent Features

### 🧠 Intelligent Decision Making

The agent doesn't just blindly apply changes—it **reasons** about them:

**Example Output:**
```
$ pnpm agent auto-update --task task.yaml --changes changes.json --out task.yaml

[Agent] Starting task: update-task
[Agent] Reasoning about next action...
[Agent] Decision: auto-apply
[Agent] Reasoning: Impact score 0.35. Changes affect network params but are low risk.
                    No security or RBAC modifications detected.
[Agent] Executing: propose-with-llm
[Agent] Task completed successfully

✓ Changes auto-applied successfully
  Output: task.yaml
  Impact Score: 0.35
```

### 💾 Memory & Learning

The agent maintains persistent state across runs and learns from experience:

```bash
$ pnpm agent state --verbose

Agent State:
  Total Tasks: 23
  Successful: 21
  Failed: 2
  Total Memories: 67
  Last Run: 2026-01-08T14:23:15Z

Recent Memories:
  1. propose-with-llm - ✓ (confidence: 0.85)
     Reasoning: Changes are complex, using LLM for sophisticated analysis
  
  2. auto-apply - ✓ (confidence: 0.92)
     Reasoning: Impact score 0.25, safe to auto-apply
  
  3. high-impact-review - ✓ (confidence: 0.95)
     Reasoning: Impact score 0.85. High impact detected, requesting review
```

**How Memory Works:**
- Stores every decision and its outcome
- Uses past experience to inform future decisions
- Avoids repeating mistakes
- Improves confidence scores over time

### 📦 Batch Processing Intelligence

The agent processes multiple tasks with per-task strategies:

```bash
$ pnpm agent batch --tasks-dir ./tasks --changes updates.json --out-dir ./updated

[Orchestrator] Found 12 task files
[Orchestrator] Processing task 1/12: build-task.yaml
[Agent] Impact score: 0.25 → auto-applying
[Orchestrator] Processing task 2/12: deploy-task.yaml
[Agent] Impact score: 0.82 → requires review
...

Batch Update Results:
  Total: 12
  Successful: 10
  Failed: 0
  Requires Review: 2

Details:
  build-task.yaml: ✓ (auto-applied)
  deploy-task.yaml: ⚠ (requires review - high impact)
  test-task.yaml: ✓ (auto-applied)
  ...
```

### ⚡ Risk Assessment

Automatic impact scoring helps you make safe decisions:

| Impact Score | Risk Level | Action | Examples |
|-------------|------------|--------|----------|
| 0.0 - 0.3 | Low | Auto-apply | Network params, storage configs |
| 0.3 - 0.7 | Medium | Analyze first | Resource limits, new steps |
| 0.7 - 1.0 | High | Manual review | Security context, RBAC, serviceAccount |

**Risk Factors:**
- **+0.4**: Security context or serviceAccount changes
- **+0.3**: RBAC or permissions modifications
- **+0.2**: Network, storage, or resource changes
- **+0.1-0.2**: Complexity (description length, number of changes)

## MCP Integration

### Setting Up with Cursor

1. Start the MCP server:
```bash
pnpm agent mcp-server
```

2. Add to your Cursor settings (`~/.cursor/config.json` or workspace settings):
```json
{
  "mcpServers": {
    "tekton-agent": {
      "command": "pnpm",
      "args": ["agent", "mcp-server"],
      "cwd": "/home/you/dev/jmp-MCP-server",
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

3. Use in Cursor with natural language:
```
You: "Analyze the impact of adding Multus networking to my build task"
Cursor: *Uses analyze_change_impact tool*
        "The impact score is 0.42 (medium risk). Changes affect networking 
         but don't modify security contexts..."

You: "Go ahead and apply it"
Cursor: *Uses propose_tekton_update tool*
        "Done! Updated task saved. The agent added secondaryNetworkNAD param
         and updated the pod spec."
```

### Setting Up with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "tekton-agent": {
      "command": "pnpm",
      "args": ["agent", "mcp-server"],
      "cwd": "/home/you/dev/jmp-MCP-server",
      "env": {
        "OPENAI_API_KEY": "sk-your-key-here"
      }
    }
  }
}
```

### Available MCP Tools

The agent provides 5 powerful tools:

| Tool | Description | Use Case |
|------|-------------|----------|
| `propose_tekton_update` | Propose YAML updates with reasoning | "Update this task with the new changes" |
| `analyze_change_impact` | Calculate risk score | "Is this safe to apply?" |
| `monitor_jumpstarter_changes` | Watch for new changes | "Monitor my changes directory" |
| `get_agent_state` | Query agent memory | "Show me what the agent has learned" |
| `batch_update_tasks` | Process multiple tasks | "Update all tasks in this directory" |

### Example MCP Usage

**Via Cursor/Claude:**
```
You: Update my Tekton task with these Jumpstarter changes:
     - Add support for Multus secondary network
     - Export image digest to Quay
     - Use custom service account for registry access

Cursor: *Analyzes changes*
        Impact Score: 0.45 (medium risk)
        - Network changes: +0.2
        - Registry config: +0.15
        - Service account: +0.1
        
        This looks safe to auto-apply. Should I proceed?

You: Yes, go ahead

Cursor: *Applies updates*
        ✓ Added secondaryNetworkNAD param
        ✓ Added artifactDigest result
        ✓ Added quayUrl param
        ✓ Updated step to use custom SA
        
        Updated task saved to build-task.yaml
```

## Configuration

### Environment Variables

```bash
# Required for LLM features
export OPENAI_API_KEY="sk-your-api-key-here"

# Optional: Custom OpenAI endpoint (for Azure, local models, etc.)
export OPENAI_BASE="https://api.openai.com/v1"

# Optional: Choose model (default: gpt-4o-mini)
export OPENAI_MODEL="gpt-4o-mini"
# Other options: gpt-4, gpt-3.5-turbo, etc.

# Agent behavior tuning
export AGENT_AUTO_APPLY_THRESHOLD="0.7"    # 0-1, lower = more cautious
export AGENT_MAX_RETRIES="3"               # Retry failed tasks
export AGENT_STATE_DIR=".agent-state"      # Where to store memory
```

### Configuration File (Optional)

Create `.agent-config.json` in your project root:

```json
{
  "maxMemories": 100,
  "maxRetries": 3,
  "autoApplyThreshold": 0.7,
  "stateDir": ".agent-state",
  "enableLLM": true
}
```

### Tuning Auto-Apply Threshold

The threshold determines when the agent will automatically apply changes:

```bash
# Conservative (only auto-apply very safe changes)
export AGENT_AUTO_APPLY_THRESHOLD="0.5"
pnpm agent auto-update ... --threshold 0.5

# Balanced (default - good for most use cases)
export AGENT_AUTO_APPLY_THRESHOLD="0.7"
pnpm agent auto-update ... --threshold 0.7

# Aggressive (auto-apply most changes)
export AGENT_AUTO_APPLY_THRESHOLD="0.9"
pnpm agent auto-update ... --threshold 0.9
```

**Recommendation:**
- **Production**: 0.5-0.6 (conservative)
- **Staging**: 0.7-0.8 (balanced)
- **Development**: 0.8-0.9 (aggressive)

## Examples

### Example 1: Low-Impact Change (Auto-Applied)

**Input Changes** (`changes.json`):
```json
[
  {
    "id": "CHG-001",
    "title": "Add secondary network support",
    "description": "Jumpstarter now supports Multus NAD for secondary networking",
    "impactAreas": ["network"],
    "suggestedParams": {
      "secondaryNetworkNAD": "nad/example"
    }
  }
]
```

**Run Agent**:
```bash
$ pnpm agent auto-update --task task.yaml --changes changes.json --out task.yaml

[Agent] Impact score: 0.20 (network only)
[Agent] Decision: auto-apply
✓ Changes applied successfully
```

**Result**: `secondaryNetworkNAD` param automatically added.

---

### Example 2: High-Impact Change (Requires Review)

**Input Changes** (`security-changes.json`):
```json
[
  {
    "id": "CHG-002",
    "title": "Add privileged security context for hardware access",
    "description": "Requires privileged container and custom service account",
    "impactAreas": ["security", "serviceAccount", "rbac"],
    "suggestedParams": {
      "serviceAccount": "jumpstarter-privileged",
      "securityContext": {
        "privileged": true
      }
    }
  }
]
```

**Run Agent**:
```bash
$ pnpm agent analyze --task task.yaml --changes security-changes.json

Impact Analysis:
  Impact Score: 0.85
  Requires Review: YES
  Recommendation: high-impact-review
  Reasoning: Changes affect serviceAccount (0.30), security context (0.40),
             and RBAC (0.15). High risk modifications detected.

⚠ Manual review required before applying these changes
```

**Result**: Agent prevents auto-apply and requests human review.

---

### Example 3: Batch Update with Mixed Results

**Directory Structure**:
```
tasks/
├── build-task.yaml       (low impact changes)
├── deploy-task.yaml      (high impact changes)
├── test-task.yaml        (low impact changes)
└── secure-task.yaml      (high impact changes)
```

**Run Batch**:
```bash
$ pnpm agent batch --tasks-dir ./tasks --changes changes.json --out-dir ./updated

[Orchestrator] Found 4 task files
Processing:
  ✓ build-task.yaml (impact: 0.25) - auto-applied
  ⚠ deploy-task.yaml (impact: 0.82) - requires review
  ✓ test-task.yaml (impact: 0.30) - auto-applied
  ⚠ secure-task.yaml (impact: 0.78) - requires review

Results:
  Total: 4
  Auto-applied: 2
  Requires Review: 2
```

---

### Example 4: CI/CD Integration

**GitHub Actions Workflow** (`.github/workflows/auto-update-tasks.yml`):

```yaml
name: Auto-Update Tekton Tasks

on:
  push:
    paths:
      - 'jumpstarter-changes/**'
  workflow_dispatch:

jobs:
  update-tasks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install pnpm
        run: npm install -g pnpm
      
      - name: Install dependencies
        run: pnpm install
        working-directory: ./tekton-agent
      
      - name: Auto-update tasks
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          AGENT_AUTO_APPLY_THRESHOLD: "0.6"
        run: |
          pnpm agent batch \
            --tasks-dir ./tekton-tasks \
            --changes ./jumpstarter-changes/latest.json \
            --out-dir ./tekton-tasks-updated
        working-directory: ./tekton-agent
      
      - name: Create PR if changes
        run: |
          if [ -n "$(git status --porcelain)" ]; then
            git config user.name "Tekton Agent"
            git config user.email "agent@example.com"
            git checkout -b auto-update-$(date +%Y%m%d-%H%M%S)
            git add ./tekton-tasks-updated
            git commit -m "Auto-update Tekton tasks"
            git push origin HEAD
            # Create PR using gh CLI or API
          fi
```

---

### Example 5: Using with Custom LLM Endpoint

**For Azure OpenAI**:
```bash
export OPENAI_API_KEY="your-azure-key"
export OPENAI_BASE="https://your-resource.openai.azure.com/openai/deployments/gpt-4"
export OPENAI_MODEL="gpt-4"

pnpm agent propose --task task.yaml --changes changes.json
```

**For Local Models (LM Studio, Ollama)**:
```bash
export OPENAI_BASE="http://localhost:1234/v1"
export OPENAI_MODEL="local-model"
export OPENAI_API_KEY="not-needed"

pnpm agent propose --task task.yaml --changes changes.json
```

## Architecture

### Agent Core Components

```
┌─────────────────────────────────────────┐
│         Agent Orchestrator              │
│  (Planning, Scheduling, Coordination)   │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          Agent Core                     │
│  (Reasoning, Decision Making, Memory)   │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼────────┐  ┌───▼────────────┐
│ State Manager │  │  LLM Provider  │
│   (Memory)    │  │  (OpenAI API)  │
└───────────────┘  └────────────────┘
```

### Decision Making Flow

1. **Observe** - Gather context about current situation
2. **Reason** - Analyze and decide on best action  
3. **Execute** - Perform the decided action
4. **Update** - Store results in memory
5. **Repeat** - Continue until task complete

## Troubleshooting

### Problem: "OPENAI_API_KEY not set"

**Solution**:
```bash
# Set your API key
export OPENAI_API_KEY="sk-your-key-here"

# Or run without LLM (uses deterministic rules only)
unset OPENAI_API_KEY
pnpm agent propose --task task.yaml --changes changes.json
# Note: Limited to pattern-based rules
```

### Problem: "Agent too cautious / too aggressive"

**Solution**: Adjust the threshold
```bash
# More cautious (safer for production)
pnpm agent auto-update ... --threshold 0.5

# More aggressive (good for dev environments)
pnpm agent auto-update ... --threshold 0.9
```

### Problem: "Agent made a wrong decision"

**Solution**: The agent learns from experience
```bash
# Check what it learned
pnpm agent state --verbose

# Clear memory if needed
rm -rf .agent-state

# Provide more context in change descriptions
# The agent uses description text for reasoning
```

### Problem: "Task validation failed"

**Cause**: Generated YAML doesn't match Tekton schema

**Solution**:
```bash
# Check the validation error
pnpm agent propose --task task.yaml --changes changes.json 2>&1 | grep -A5 "validation"

# Simplify your changes or provide more specific descriptions
# The agent validates all outputs against tekton/schemas/task.schema.json
```

### Problem: "MCP server not working in Cursor"

**Solution**:
1. Check server starts manually:
```bash
pnpm agent mcp-server
# Should show: [MCP Server] Agent initialized and ready
```

2. Verify Cursor config (Command Palette → "MCP: Show MCP Settings"):
```json
{
  "mcpServers": {
    "tekton-agent": {
      "command": "pnpm",
      "args": ["agent", "mcp-server"],
      "cwd": "/absolute/path/to/jmp-MCP-server"
    }
  }
}
```

3. Check logs in Cursor: Command Palette → "MCP: Show MCP Logs"

### Problem: "Batch processing is slow"

**Cause**: Each task requires LLM call (if enabled)

**Solutions**:
```bash
# 1. Use deterministic rules only (fast)
unset OPENAI_API_KEY
pnpm agent batch ...

# 2. Process subset first
pnpm agent batch --tasks-dir ./high-priority --changes changes.json --out-dir ./updated

# 3. Adjust LLM timeout (future feature)
```

### Getting Help

- **Documentation**: See `AGENT_GUIDE.md` for architecture details
- **Examples**: Check `examples/` directory
- **Demo**: Run `./examples/agent-demo.sh`
- **State**: Use `pnpm agent state --verbose` to understand decisions

## Quick Reference Card

### Most Common Commands

```bash
# 1. Propose updates (safe, just shows what would change)
pnpm agent propose --task task.yaml --changes changes.json --out updated.yaml

# 2. Check risk level before applying
pnpm agent analyze --task task.yaml --changes changes.json

# 3. Let agent decide and apply if safe
pnpm agent auto-update --task task.yaml --changes changes.json --out task.yaml

# 4. Update multiple tasks at once
pnpm agent batch --tasks-dir ./tasks --changes changes.json --out-dir ./updated

# 5. Check what agent has learned
pnpm agent state --verbose
```

### Decision Guide

| Your Goal | Command | Threshold |
|-----------|---------|-----------|
| Just see proposed changes | `propose` | N/A |
| Check if changes are safe | `analyze` | N/A |
| Auto-apply if very safe | `auto-update` | `0.5` |
| Auto-apply if reasonably safe | `auto-update` | `0.7` |
| Auto-apply most changes | `auto-update` | `0.9` |
| Process many tasks | `batch` | N/A |

### Environment Setup

```bash
# Minimum required
export OPENAI_API_KEY="sk-..."

# Optional customization
export OPENAI_MODEL="gpt-4o-mini"           # or gpt-4, gpt-3.5-turbo
export AGENT_AUTO_APPLY_THRESHOLD="0.7"     # 0.0=cautious, 1.0=aggressive
export AGENT_STATE_DIR=".agent-state"       # where to store memory
```

## How It Works

### Two-Stage Processing

The agent uses a hybrid approach for maximum efficiency and intelligence:

#### Stage 1: Deterministic Rules (Fast)
Applied instantly without LLM:

| Rule | Trigger | Action |
|------|---------|--------|
| **Secondary Network** | Mentions "multus", "NAD", "secondary network" | Add `secondaryNetworkNAD` param |
| **Artifact Export** | Mentions "artifact", "export", "result" | Add `artifactDigest` result |
| **Quay Integration** | Mentions "quay.io" or "quay" | Add `quayUrl` param |

#### Stage 2: LLM Analysis (Intelligent)
For complex changes:

1. **Semantic Understanding**: Interprets natural language descriptions
2. **YAML Generation**: Creates appropriate Tekton structures
3. **Validation**: Ensures compliance with Tekton schemas
4. **Explanation**: Provides reasoning for all changes

### Impact Scoring Algorithm

```
Score = base_risk + complexity_factor

Where:
  base_risk = 
    + 0.40 if security/serviceAccount changes
    + 0.30 if RBAC modifications
    + 0.20 if network/storage changes
    + 0.15 if resource limits affected
  
  complexity_factor =
    + 0.20 if description > 200 chars
    + 0.15 if num_changes > 5
    + 0.10 if multiple impact areas

Threshold:
  score < 0.3  → Auto-apply (low risk)
  score < 0.7  → Analyze + recommend
  score >= 0.7 → Require manual review (high risk)
```

## Advanced Usage

### Extending the Agent

**Add Custom Reasoning Strategy** (`src/agent/core.ts`):

```typescript
private async reasonCustom(observation: any, task: AgentTask): Promise<AgentDecision> {
  // Your logic here
  return {
    action: "custom-action",
    reasoning: "Why this action was chosen",
    confidence: 0.85,
    final: false
  };
}
```

**Add Custom Workflow** (`src/agent/orchestrator.ts`):

```typescript
async customWorkflow(params: any): Promise<any> {
  const task: AgentTask = {
    id: `custom-${Date.now()}`,
    type: "custom-type",
    data: params
  };
  await this.agent.run(task);
  return this.agent.getState();
}
```

**Add MCP Tool** (`src/agent/mcp-server.ts`):

```typescript
{
  name: "custom_tool",
  description: "What it does",
  inputSchema: {
    type: "object",
    properties: {
      param: { type: "string" }
    }
  }
}
```

### Programmatic API

Use the agent from your own code:

```typescript
import { AgentOrchestrator } from 'ai-tekton-jumpstarter-agent';

const agent = new AgentOrchestrator({
  autoApplyThreshold: 0.7,
  stateDir: '.my-agent-state'
});

await agent.initialize();

// Propose updates
const yaml = await agent.proposeUpdateWorkflow(
  'path/to/task.yaml',
  'path/to/changes.json',
  'output.yaml'
);

// Analyze impact
const analysis = await agent.analyzeImpactWorkflow(
  'path/to/task.yaml',
  'path/to/changes.json'
);

console.log(`Impact: ${analysis.impactScore}`);
console.log(`Safe to apply: ${!analysis.requiresReview}`);
```

## Performance & Limitations

### Performance

- **Deterministic rules**: < 100ms per task
- **LLM analysis**: 2-5 seconds per task (depends on API latency)
- **Batch processing**: ~3-5 seconds per task with LLM
- **Memory usage**: ~50MB base + 1KB per memory entry

### Limitations

- **LLM Required**: Complex reasoning needs OpenAI API (or compatible)
- **Schema Validation**: Only validates Tekton v1 Tasks (not Pipelines yet)
- **Sequential Processing**: Batch mode processes tasks one-by-one
- **English Only**: Change descriptions should be in English for best results

### Roadmap

- [ ] Support for Tekton Pipelines (not just Tasks)
- [ ] Concurrent batch processing
- [ ] Learning from user corrections
- [ ] Git repository integration
- [ ] Webhook support for change monitoring
- [ ] Multi-language support
- [ ] Local LLM support (Ollama, etc.)

## FAQ

**Q: Do I need an OpenAI API key?**  
A: For full functionality, yes. But deterministic rules work without it.

**Q: Can I use other LLM providers?**  
A: Yes! Set `OPENAI_BASE` to any OpenAI-compatible endpoint (Azure, local models, etc.)

**Q: Is it safe for production?**  
A: Yes! High-risk changes always require manual review. The agent is conservative by default.

**Q: Does it modify my files automatically?**  
A: Only if you use `auto-update` AND the impact score is below threshold. `propose` and `analyze` never modify files.

**Q: How do I reset the agent's memory?**  
A: Delete the state directory: `rm -rf .agent-state`

**Q: Can I run this in CI/CD?**  
A: Absolutely! See the GitHub Actions example in the Examples section.

**Q: What if the agent makes a mistake?**  
A: All outputs are validated against Tekton schemas. Review high-impact changes manually.

## Contributing

We welcome contributions! Areas to help:

- **New deterministic rules**: Add pattern matching for common changes
- **Testing**: Help test with various Tekton Task structures
- **Documentation**: Improve examples and guides
- **Integrations**: Add support for other CI/CD systems

See `AGENT_GUIDE.md` for architecture details.

## Resources

- **Documentation**
  - [Complete Agent Guide](AGENT_GUIDE.md) - Architecture deep dive
  - [Conversion Summary](CONVERSION_SUMMARY.md) - How we built the agent
  
- **Examples**
  - [Interactive Demo](examples/agent-demo.sh)
  - [Example Tasks](examples/)
  - [High-Impact Changes](examples/high-impact-change.json)

- **Related Projects**
  - [Tekton Documentation](https://tekton.dev/)
  - [Jumpstarter Project](https://github.com/jumpstarter-dev)
  - [MCP Specification](https://modelcontextprotocol.io/)

## License

See [LICENSE](LICENSE) file for details.

---

**Built with ❤️ for the Tekton & Jumpstarter communities**

Have questions? Check the [Troubleshooting](#troubleshooting) section or open an issue!
