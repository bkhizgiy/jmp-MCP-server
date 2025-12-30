#!/bin/bash
# Agent Demo Script - Shows off autonomous agent capabilities

set -e

echo "🤖 Tekton Jumpstarter Agent Demo"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if OPENAI_API_KEY is set
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY not set. LLM features will be limited.${NC}"
    echo "   Deterministic rules will still work!"
    echo ""
fi

# Demo 1: Basic Proposal
echo -e "${BLUE}Demo 1: Basic Update Proposal${NC}"
echo "-------------------------------"
echo "The agent will analyze changes and propose updates..."
echo ""
pnpm agent propose \
  --task examples/task.yaml \
  --changes examples/input-change.json \
  --out /tmp/agent-demo-proposal.yaml
echo ""
echo -e "${GREEN}✓ Proposal saved to /tmp/agent-demo-proposal.yaml${NC}"
echo ""

# Demo 2: Impact Analysis
echo -e "${BLUE}Demo 2: Impact Analysis${NC}"
echo "------------------------"
echo "The agent will analyze the risk level of changes..."
echo ""
pnpm agent analyze \
  --task examples/task.yaml \
  --changes examples/input-change.json
echo ""

# Demo 3: Auto-Update Decision
echo -e "${BLUE}Demo 3: Autonomous Auto-Update${NC}"
echo "--------------------------------"
echo "The agent will decide whether to auto-apply or request review..."
echo ""
pnpm agent auto-update \
  --task examples/task.yaml \
  --changes examples/input-change.json \
  --out /tmp/agent-demo-auto.yaml \
  --threshold 0.7
echo ""

# Demo 4: Check Agent State
echo -e "${BLUE}Demo 4: Agent Memory & Learning${NC}"
echo "--------------------------------"
echo "Let's see what the agent has learned..."
echo ""
pnpm agent state --verbose
echo ""

# Demo 5: Create batch scenario
echo -e "${BLUE}Demo 5: Batch Processing${NC}"
echo "------------------------"
echo "Creating multiple tasks for batch processing..."
echo ""
mkdir -p /tmp/agent-demo-tasks /tmp/agent-demo-output
cp examples/task.yaml /tmp/agent-demo-tasks/task1.yaml
cp examples/task.yaml /tmp/agent-demo-tasks/task2.yaml
cp examples/task.yaml /tmp/agent-demo-tasks/task3.yaml
echo "Processing 3 tasks in batch..."
pnpm agent batch \
  --tasks-dir /tmp/agent-demo-tasks \
  --changes examples/input-change.json \
  --out-dir /tmp/agent-demo-output
echo ""
echo -e "${GREEN}✓ Batch processing complete${NC}"
echo "   Check /tmp/agent-demo-output/ for results"
echo ""

# Final summary
echo "=================================="
echo -e "${GREEN}🎉 Demo Complete!${NC}"
echo ""
echo "Files created:"
echo "  - /tmp/agent-demo-proposal.yaml (single task proposal)"
echo "  - /tmp/agent-demo-auto.yaml (auto-update result)"
echo "  - /tmp/agent-demo-output/ (batch results)"
echo ""
echo "Agent state saved to: .agent-state/"
echo ""
echo "Next steps:"
echo "  1. Review the generated YAML files"
echo "  2. Check agent state: pnpm agent state --verbose"
echo "  3. Try with your own tasks and changes!"
echo "  4. Start MCP server: pnpm agent mcp-server"
echo ""

