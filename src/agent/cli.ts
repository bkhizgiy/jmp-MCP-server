#!/usr/bin/env node
// Agent CLI: Command-line interface for the agent
import { AgentOrchestrator } from "./orchestrator.js";
import { startMCPServer } from "./mcp-server.js";
import path from "node:path";

function showHelp() {
  console.log(`
Tekton Jumpstarter Agent CLI

USAGE:
  agent <command> [options]

COMMANDS:
  propose       Propose updates to a Tekton Task
  analyze       Analyze impact of changes
  batch         Process multiple tasks in batch
  auto-update   Automatically apply low-impact changes
  mcp-server    Start MCP server for AI assistant integration
  state         Show agent state and statistics
  help          Show this help message

PROPOSE OPTIONS:
  --task <path>       Path to Tekton Task YAML file
  --changes <path>    Path to Jumpstarter changes JSON file
  --out <path>        Output path for updated YAML (optional)

ANALYZE OPTIONS:
  --task <path>       Path to Tekton Task YAML file
  --changes <path>    Path to Jumpstarter changes JSON file

BATCH OPTIONS:
  --tasks-dir <path>  Directory containing Tekton Task YAML files
  --changes <path>    Path to Jumpstarter changes JSON file
  --out-dir <path>    Output directory for updated YAML files

AUTO-UPDATE OPTIONS:
  --task <path>       Path to Tekton Task YAML file
  --changes <path>    Path to Jumpstarter changes JSON file
  --out <path>        Output path for updated YAML
  --threshold <n>     Auto-apply threshold (0-1, default: 0.7)

MCP-SERVER OPTIONS:
  --state-dir <path>  Directory for agent state (default: .agent-state)

STATE OPTIONS:
  --state-dir <path>  Directory for agent state (default: .agent-state)
  --verbose           Show detailed state information

EXAMPLES:
  # Propose updates with LLM
  agent propose --task task.yaml --changes changes.json --out updated.yaml

  # Analyze impact before applying
  agent analyze --task task.yaml --changes changes.json

  # Batch process multiple tasks
  agent batch --tasks-dir ./tasks --changes changes.json --out-dir ./updated

  # Auto-apply low-impact changes
  agent auto-update --task task.yaml --changes changes.json --out task.yaml

  # Start MCP server for Cursor/Claude integration
  agent mcp-server

  # Check agent state
  agent state --verbose

ENVIRONMENT:
  OPENAI_API_KEY     Required for LLM-based proposals
  OPENAI_BASE        OpenAI API base URL (default: https://api.openai.com/v1)
  OPENAI_MODEL       Model to use (default: gpt-4o-mini)
`);
}

function parseArgs(argv: string[]): { command: string; options: Record<string, any> } {
  const [, , command, ...args] = argv;
  const options: Record<string, any> = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      const key = args[i].slice(2);
      const value = args[i + 1];
      
      if (value && !value.startsWith("--")) {
        // Convert numeric strings to numbers
        options[key] = isNaN(Number(value)) ? value : Number(value);
        i++; // Skip next arg
      } else {
        options[key] = true; // Flag without value
      }
    }
  }

  return { command, options };
}

async function main() {
  const { command, options } = parseArgs(process.argv);

  if (!command || command === "help") {
    showHelp();
    process.exit(0);
  }

  const orchestrator = new AgentOrchestrator({
    stateDir: options["state-dir"],
    autoApplyThreshold: options.threshold
  });

  await orchestrator.initialize();

  try {
    switch (command) {
      case "propose": {
        const { task, changes, out } = options;
        if (!task || !changes) {
          console.error("Error: --task and --changes are required");
          process.exit(1);
        }

        console.log("Proposing updates...");
        const result = await orchestrator.proposeUpdateWorkflow(task, changes, out);
        
        if (!out) {
          process.stdout.write(result);
        }
        console.error("\nProposal completed successfully");
        break;
      }

      case "analyze": {
        const { task, changes } = options;
        if (!task || !changes) {
          console.error("Error: --task and --changes are required");
          process.exit(1);
        }

        console.log("Analyzing impact...");
        const result = await orchestrator.analyzeImpactWorkflow(task, changes);
        
        console.log("\nImpact Analysis:");
        console.log(`  Impact Score: ${result.impactScore.toFixed(2)}`);
        console.log(`  Requires Review: ${result.requiresReview ? "YES" : "NO"}`);
        console.log(`  Recommendation: ${result.recommendation}`);
        console.log(`  Reasoning: ${result.reasoning}`);
        break;
      }

      case "batch": {
        const { tasksDir, changes, outDir } = options;
        if (!tasksDir || !changes || !outDir) {
          console.error("Error: --tasks-dir, --changes, and --out-dir are required");
          process.exit(1);
        }

        console.log("Processing batch update...");
        const result = await orchestrator.batchUpdateWorkflow(tasksDir, changes, outDir);
        
        console.log("\nBatch Update Results:");
        console.log(`  Total: ${result.total}`);
        console.log(`  Successful: ${result.successful}`);
        console.log(`  Failed: ${result.failed}`);
        
        if (options.verbose) {
          console.log("\nDetails:");
          result.results.forEach((r: any) => {
            console.log(`  ${r.file}: ${r.success ? "✓" : "✗"} ${r.error || ""}`);
          });
        }
        break;
      }

      case "auto-update": {
        const { task, changes, out } = options;
        if (!task || !changes || !out) {
          console.error("Error: --task, --changes, and --out are required");
          process.exit(1);
        }

        console.log("Running auto-update workflow...");
        const result = await orchestrator.autoUpdateWorkflow(task, changes, out);
        
        if (result.autoApplied) {
          console.log("\n✓ Changes auto-applied successfully");
          console.log(`  Output: ${result.outputPath}`);
          console.log(`  Impact Score: ${result.impact.impactScore.toFixed(2)}`);
        } else {
          console.log("\n⚠ Changes require manual review");
          console.log(`  Reason: ${result.reason}`);
          console.log(`  Impact Score: ${result.impact.impactScore.toFixed(2)}`);
        }
        break;
      }

      case "mcp-server": {
        console.log("Starting MCP server...");
        await startMCPServer(options["state-dir"]);
        break;
      }

      case "state": {
        const state = orchestrator.getAgentState();
        
        console.log("\nAgent State:");
        console.log(`  Total Tasks: ${state.stats.totalTasks}`);
        console.log(`  Successful: ${state.stats.successfulTasks}`);
        console.log(`  Failed: ${state.stats.failedTasks}`);
        console.log(`  Total Memories: ${state.memories.length}`);
        console.log(`  Last Run: ${state.stats.lastRunTime || "Never"}`);

        if (options.verbose) {
          console.log("\nRecent Memories:");
          state.memories.slice(-5).forEach((m, i) => {
            console.log(`  ${i + 1}. ${m.decision.action} - ${m.success ? "✓" : "✗"}`);
            console.log(`     ${m.decision.reasoning}`);
          });
        }
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        console.error("Run 'agent help' for usage information");
        process.exit(1);
    }
  } catch (error: any) {
    console.error("\nError:", error.message);
    process.exit(1);
  }

  orchestrator.stop();
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});

