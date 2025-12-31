# Agent Architecture Guide

## Overview

This project has been transformed from a simple CLI tool into a **fully autonomous AI agent** with reasoning, memory, planning, and decision-making capabilities.

## Architecture Components

### 1. Agent Core (`src/agent/core.ts`)

The brain of the agent. Implements the main reasoning loop:

```
┌─────────────┐
│   Observe   │  ← Gather current state, memory, task context
└──────┬──────┘
       │
┌──────▼──────┐
│   Reason    │  ← Analyze and decide next action using LLM/heuristics
└──────┬──────┘
       │
┌──────▼──────┐
│   Execute   │  ← Perform the decided action
└──────┬──────┘
       │
┌──────▼──────┐
│   Update    │  ← Store results in memory
└──────┬──────┘
       │
       └─────────► Repeat until task complete
```

**Key Methods:**
- `run(task)` - Main agent loop
- `observe()` - Gather context
- `reason()` - Decision making
- `execute()` - Action execution
- `updateState()` - Memory management

### 2. State Manager (`src/agent/state.ts`)

Persistent memory system for the agent:

```typescript
interface AgentState {
  memories: AgentMemory[];           // Recent decisions and outcomes
  taskHistory: Map<string, Memory[]>; // Per-task execution history
  stats: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    lastRunTime?: string;
  };
}
```

**Features:**
- Persistent JSON storage
- Automatic memory pruning (configurable limit)
- Task history tracking
- Statistical aggregation

### 3. Orchestrator (`src/agent/orchestrator.ts`)

High-level workflow coordinator:

**Workflows:**
- `proposeUpdateWorkflow()` - Single task update
- `analyzeImpactWorkflow()` - Risk assessment
- `batchUpdateWorkflow()` - Multiple tasks
- `autoUpdateWorkflow()` - Autonomous decision + execution

**Task Queue:**
- Priority-based scheduling
- Retry logic with exponential backoff
- Concurrent execution (future enhancement)

### 4. MCP Server (`src/agent/mcp-server.ts`)

Full-featured MCP server with multiple tools:

**Tools:**
1. `propose_tekton_update` - Update task with reasoning
2. `analyze_change_impact` - Impact scoring and recommendations
3. `monitor_jumpstarter_changes` - Change detection
4. `get_agent_state` - Query agent memory
5. `batch_update_tasks` - Bulk processing

**Protocol:**
- JSON-RPC over stdio
- Compatible with MCP 2024-11-05 specification
- Full error handling and validation

## Decision Making Process

### Impact Scoring Algorithm

```typescript
function calculateImpactScore(changes, taskYaml): number {
  let score = 0;
  
  // High-risk areas
  if (affects serviceAccount) score += 0.3;
  if (affects security) score += 0.4;
  if (affects RBAC) score += 0.3;
  
  // Medium-risk areas
  if (affects network) score += 0.2;
  if (affects storage) score += 0.2;
  if (affects resources) score += 0.15;
  
  // Complexity factors
  if (description.length > 200) score += 0.2;
  if (changes.length > 5) score += 0.15;
  
  return Math.min(score, 1.0);
}
```

### Decision Matrix

| Impact Score | Requires Review | Action         |
|-------------|----------------|----------------|
| 0.0 - 0.3   | No             | Auto-apply     |
| 0.3 - 0.7   | Depends*       | Analyze + Apply|
| 0.7 - 1.0   | Yes            | Request Review |

*Depends on `autoApplyThreshold` configuration

### Reasoning Strategies

**Rule-Based Reasoning:**
- Fast deterministic rules for common patterns
- No LLM required
- Examples: network params, artifact results, registry configs

**LLM-Based Reasoning:**
- Complex semantic understanding
- Natural language change descriptions
- Sophisticated YAML generation
- Validation against schemas

**Hybrid Approach:**
1. Apply deterministic rules first
2. Use LLM for remaining complexity
3. Validate all outputs
4. Store decision rationale in memory

## Memory System

### Memory Structure

```typescript
interface AgentMemory {
  timestamp: string;
  decision: {
    action: string;
    reasoning: string;
    confidence: number;
    metadata?: any;
  };
  result: any;
  success: boolean;
}
```

### Memory Usage Patterns

**Short-term Memory:**
- Last 5-10 memories for current context
- Used in `observe()` phase
- Helps avoid repeating mistakes

**Long-term Memory:**
- All memories stored to disk
- Queryable via `agent state` command
- Used for statistics and learning

**Task History:**
- Per-task execution tracking
- Retry decision support
- Pattern recognition for similar tasks

## Configuration

### Agent Config

```typescript
interface AgentConfig {
  maxMemories?: number;        // Default: 100
  maxRetries?: number;         // Default: 3
  autoApplyThreshold?: number; // Default: 0.7
  stateDir?: string;          // Default: .agent-state
  enableLLM?: boolean;        // Default: !!OPENAI_API_KEY
}
```

### Environment Variables

```bash
# LLM Configuration
OPENAI_API_KEY=sk-...
OPENAI_BASE=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Agent Behavior
AGENT_AUTO_APPLY_THRESHOLD=0.7
AGENT_MAX_RETRIES=3
AGENT_STATE_DIR=.agent-state
```

## Extending the Agent

### Adding New Decision Strategies

In `src/agent/core.ts`:

```typescript
private async reasonCustom(observation: any, task: AgentTask): Promise<AgentDecision> {
  // Your custom reasoning logic
  return {
    action: "custom-action",
    reasoning: "Why this action was chosen",
    confidence: 0.85,
    final: false,
    metadata: { /* custom data */ }
  };
}
```

### Adding New Workflows

In `src/agent/orchestrator.ts`:

```typescript
async customWorkflow(params: any): Promise<any> {
  console.log("[Orchestrator] Starting custom workflow");
  
  const task: AgentTask = {
    id: `custom-${Date.now()}`,
    type: "custom-type",
    data: params
  };
  
  await this.agent.run(task);
  return this.agent.getState();
}
```

### Adding New MCP Tools

In `src/agent/mcp-server.ts`:

```typescript
// 1. Add to tools list
{
  name: "custom_tool",
  description: "What the tool does",
  inputSchema: {
    type: "object",
    properties: {
      param1: { type: "string" }
    }
  }
}

// 2. Add handler
private async handleCustomTool(req: MCPRequest): Promise<MCPResponse> {
  const { param1 } = req.params;
  // Implementation
  return { id: req.id, result: { /* response */ } };
}
```

## Performance Considerations

### Memory Usage

- Agent state is kept in memory during execution
- State is persisted to disk after each task
- Memory is automatically pruned to configured limit
- Large task histories may slow down startup (optimize via indexing)

### LLM Calls

- Deterministic rules run first (fast, no API cost)
- LLM only invoked when necessary
- Consider caching for identical inputs
- Monitor API costs for batch operations

### Batch Processing

- Tasks are processed sequentially (safe, predictable)
- Future: Implement concurrent execution with semaphore
- Consider rate limiting for external API calls

## Testing the Agent

### Manual Testing

```bash
# Test basic functionality
pnpm agent propose --task examples/task.yaml --changes examples/input-change.json

# Test impact analysis
pnpm agent analyze --task examples/task.yaml --changes examples/input-change.json

# Test auto-apply decision making
pnpm agent auto-update --task examples/task.yaml --changes examples/input-change.json --out /tmp/test.yaml

# Verify state persistence
pnpm agent state --verbose
```

### Integration Testing

```bash
# Test MCP server
echo '{"id":1,"method":"tools/list"}' | pnpm agent mcp-server

# Test batch processing
mkdir -p /tmp/tasks /tmp/updated
cp examples/task.yaml /tmp/tasks/task1.yaml
cp examples/task.yaml /tmp/tasks/task2.yaml
pnpm agent batch --tasks-dir /tmp/tasks --changes examples/input-change.json --out-dir /tmp/updated
```

## Troubleshooting

### Agent Not Making Expected Decisions

Check the reasoning:
```bash
pnpm agent analyze --task task.yaml --changes changes.json
```

Adjust threshold:
```bash
pnpm agent auto-update --task task.yaml --changes changes.json --out output.yaml --threshold 0.5
```

### Memory Issues

Clear state:
```bash
rm -rf .agent-state
```

Reduce memory limit in config:
```json
{
  "maxMemories": 50
}
```

### LLM Errors

Verify API key:
```bash
echo $OPENAI_API_KEY
```

Try different model:
```bash
export OPENAI_MODEL=gpt-3.5-turbo
```

Test without LLM:
```bash
unset OPENAI_API_KEY
pnpm agent propose --task task.yaml --changes changes.json
# Should use deterministic rules only
```

## Future Enhancements

1. **Learning from Feedback**
   - Track user corrections
   - Adjust confidence scores
   - Improve decision patterns

2. **Concurrent Processing**
   - Parallel batch execution
   - Rate limiting
   - Resource management

3. **Advanced Monitoring**
   - Real-time change detection
   - Git repository integration
   - Webhook support

4. **Collaborative Decision Making**
   - Multi-agent coordination
   - Human-in-the-loop workflows
   - Approval gates

5. **Predictive Analysis**
   - Anticipate needed changes
   - Proactive suggestions
   - Trend analysis

## Architecture Principles

1. **Observability**: All decisions are logged with reasoning
2. **Reversibility**: State can be rolled back
3. **Transparency**: Agent explains its actions
4. **Safety**: High-impact changes require review
5. **Learning**: Agent improves from experience
6. **Extensibility**: Easy to add new capabilities

## Comparison: CLI vs Agent

| Feature | Legacy CLI | Agent |
|---------|-----------|-------|
| Decision Making | Manual | Autonomous |
| Memory | None | Persistent |
| Risk Assessment | Manual | Automatic |
| Batch Processing | Sequential | Intelligent |
| Learning | No | Yes |
| Integration | Basic | Full MCP |
| Reasoning | N/A | Transparent |

---

For questions or contributions, see the main README.md.

