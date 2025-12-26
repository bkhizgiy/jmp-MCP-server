// Enhanced MCP Server with multiple tools for agent interaction
import { AgentCore } from "./core.js";
import { AgentTask } from "./types.js";
import { loadChangesFromFile } from "../jumpstarter/client.js";
import fs from "node:fs";

type MCPRequest = { 
  id: number | string; 
  method: string; 
  params?: any 
};

type MCPResponse = { 
  id: number | string; 
  result?: any; 
  error?: { code: number; message: string } 
};

export class AgentMCPServer {
  private agent: AgentCore;

  constructor(stateDir?: string) {
    this.agent = new AgentCore(stateDir);
  }

  async initialize() {
    await this.agent.initialize();
    console.log("[MCP Server] Agent initialized and ready");
  }

  async handle(req: MCPRequest): Promise<MCPResponse> {
    try {
      console.log(`[MCP Server] Handling method: ${req.method}`);

      switch (req.method) {
        case "initialize":
          return await this.handleInitialize(req);
        
        case "tools/list":
          return this.handleListTools(req);
        
        case "tools/call":
          return await this.handleToolCall(req);
        
        case "agent/propose_update":
          return await this.handleProposeUpdate(req);
        
        case "agent/analyze_impact":
          return await this.handleAnalyzeImpact(req);
        
        case "agent/monitor_changes":
          return await this.handleMonitorChanges(req);
        
        case "agent/get_state":
          return this.handleGetState(req);
        
        case "agent/batch_update":
          return await this.handleBatchUpdate(req);
        
        default:
          return { 
            id: req.id, 
            error: { code: -32601, message: `Method not found: ${req.method}` } 
          };
      }
    } catch (e: any) {
      console.error("[MCP Server] Error:", e);
      return { 
        id: req.id, 
        error: { code: -32000, message: e.message } 
      };
    }
  }

  private async handleInitialize(req: MCPRequest): Promise<MCPResponse> {
    return {
      id: req.id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: {},
          prompts: {},
          resources: {}
        },
        serverInfo: {
          name: "tekton-jumpstarter-agent",
          version: "1.0.0"
        }
      }
    };
  }

  private handleListTools(req: MCPRequest): MCPResponse {
    return {
      id: req.id,
      result: {
        tools: [
          {
            name: "propose_tekton_update",
            description: "Propose updates to a Tekton Task based on Jumpstarter changes. Returns updated YAML with reasoning.",
            inputSchema: {
              type: "object",
              properties: {
                taskYaml: { 
                  type: "string", 
                  description: "Current Tekton Task YAML content" 
                },
                changes: { 
                  type: "array", 
                  description: "Array of Jumpstarter change objects" 
                },
                changePath: { 
                  type: "string", 
                  description: "Path to JSON file containing changes (alternative to changes array)" 
                }
              },
              required: ["taskYaml"]
            }
          },
          {
            name: "analyze_change_impact",
            description: "Analyze the impact of proposed changes on a Tekton Task. Returns impact score and recommendations.",
            inputSchema: {
              type: "object",
              properties: {
                taskYaml: { type: "string" },
                changes: { type: "array" }
              },
              required: ["taskYaml", "changes"]
            }
          },
          {
            name: "monitor_jumpstarter_changes",
            description: "Monitor for new Jumpstarter changes and decide if updates are needed.",
            inputSchema: {
              type: "object",
              properties: {
                changeSource: { 
                  type: "string", 
                  description: "Source to monitor (file path, git repo, or API endpoint)" 
                },
                interval: { 
                  type: "number", 
                  description: "Polling interval in seconds" 
                }
              },
              required: ["changeSource"]
            }
          },
          {
            name: "get_agent_state",
            description: "Get current agent state including memory, task history, and statistics.",
            inputSchema: {
              type: "object",
              properties: {
                includeMemories: { 
                  type: "boolean", 
                  description: "Include recent memories in response" 
                }
              }
            }
          },
          {
            name: "batch_update_tasks",
            description: "Process multiple Tekton Tasks with changes in batch mode.",
            inputSchema: {
              type: "object",
              properties: {
                tasks: {
                  type: "array",
                  description: "Array of {taskYaml, changes} objects"
                }
              },
              required: ["tasks"]
            }
          }
        ]
      }
    };
  }

  private async handleToolCall(req: MCPRequest): Promise<MCPResponse> {
    const { name, arguments: args } = req.params;

    switch (name) {
      case "propose_tekton_update":
        return await this.handleProposeUpdate({ ...req, params: args });
      case "analyze_change_impact":
        return await this.handleAnalyzeImpact({ ...req, params: args });
      case "monitor_jumpstarter_changes":
        return await this.handleMonitorChanges({ ...req, params: args });
      case "get_agent_state":
        return this.handleGetState({ ...req, params: args });
      case "batch_update_tasks":
        return await this.handleBatchUpdate({ ...req, params: args });
      default:
        return {
          id: req.id,
          error: { code: -32602, message: `Unknown tool: ${name}` }
        };
    }
  }

  private async handleProposeUpdate(req: MCPRequest): Promise<MCPResponse> {
    const { taskYaml, changes, changePath } = req.params;
    
    // Load changes from file if path provided
    const changeList = changePath 
      ? await loadChangesFromFile(changePath)
      : changes;

    if (!changeList || changeList.length === 0) {
      return {
        id: req.id,
        error: { code: -32602, message: "No changes provided" }
      };
    }

    const task: AgentTask = {
      id: `task-${Date.now()}`,
      type: "update-task",
      data: { taskYaml, changes: changeList }
    };

    await this.agent.run(task);
    const state = this.agent.getState();
    const lastMemory = state.memories[state.memories.length - 1];

    return {
      id: req.id,
      result: {
        updatedYaml: lastMemory?.result?.updatedYaml || taskYaml,
        notes: lastMemory?.result?.notes || [],
        reasoning: lastMemory?.decision?.reasoning,
        confidence: lastMemory?.decision?.confidence,
        success: lastMemory?.success || false
      }
    };
  }

  private async handleAnalyzeImpact(req: MCPRequest): Promise<MCPResponse> {
    const { taskYaml, changes } = req.params;

    const task: AgentTask = {
      id: `analyze-${Date.now()}`,
      type: "analyze-impact",
      data: { taskYaml, changes }
    };

    await this.agent.run(task);
    const state = this.agent.getState();
    const lastMemory = state.memories[state.memories.length - 1];

    return {
      id: req.id,
      result: {
        impactScore: lastMemory?.decision?.metadata?.impactScore || 0,
        requiresReview: lastMemory?.result?.requiresReview || false,
        reasoning: lastMemory?.decision?.reasoning,
        recommendation: lastMemory?.decision?.action,
        success: lastMemory?.success || false
      }
    };
  }

  private async handleMonitorChanges(req: MCPRequest): Promise<MCPResponse> {
    const { changeSource, interval } = req.params;

    const task: AgentTask = {
      id: `monitor-${Date.now()}`,
      type: "monitor-changes",
      data: { changeSource, interval }
    };

    await this.agent.run(task);
    const state = this.agent.getState();
    const lastMemory = state.memories[state.memories.length - 1];

    return {
      id: req.id,
      result: {
        changesFound: lastMemory?.result?.changesFound || [],
        message: lastMemory?.result?.message || "Monitoring complete",
        success: lastMemory?.success || false
      }
    };
  }

  private handleGetState(req: MCPRequest): MCPResponse {
    const { includeMemories } = req.params || {};
    const state = this.agent.getState();

    return {
      id: req.id,
      result: {
        stats: state.stats,
        memories: includeMemories ? state.memories.slice(-10) : undefined,
        taskCount: state.taskHistory.size,
        summary: `${state.memories.length} memories, ${state.stats.totalTasks} tasks processed`
      }
    };
  }

  private async handleBatchUpdate(req: MCPRequest): Promise<MCPResponse> {
    const { tasks } = req.params;

    if (!Array.isArray(tasks)) {
      return {
        id: req.id,
        error: { code: -32602, message: "tasks must be an array" }
      };
    }

    const results = [];
    for (const taskData of tasks) {
      const task: AgentTask = {
        id: `batch-${Date.now()}-${results.length}`,
        type: "update-task",
        data: taskData
      };

      try {
        await this.agent.run(task);
        const state = this.agent.getState();
        const lastMemory = state.memories[state.memories.length - 1];
        results.push({
          success: lastMemory?.success || false,
          updatedYaml: lastMemory?.result?.updatedYaml,
          notes: lastMemory?.result?.notes || []
        });
      } catch (error: any) {
        results.push({
          success: false,
          error: error.message
        });
      }
    }

    return {
      id: req.id,
      result: {
        results,
        totalProcessed: tasks.length,
        successCount: results.filter(r => r.success).length
      }
    };
  }

  stop() {
    this.agent.stop();
  }
}

// Main entry point for MCP server
export async function startMCPServer(stateDir?: string) {
  const server = new AgentMCPServer(stateDir);
  await server.initialize();

let buffer = "";
process.stdin.setEncoding("utf8");

process.stdin.on("data", async (chunk: string) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      
      try {
        const req = JSON.parse(line) as MCPRequest;
        const res = await server.handle(req);
        process.stdout.write(JSON.stringify(res) + "\n");
      } catch (error: any) {
        const errorRes: MCPResponse = {
          id: "unknown",
          error: { code: -32700, message: "Parse error: " + error.message }
        };
        process.stdout.write(JSON.stringify(errorRes) + "\n");
      }
    }
  });

  process.on("SIGINT", () => {
    server.stop();
    process.exit(0);
  });

  console.log("[MCP Server] Listening on stdin/stdout");
}

