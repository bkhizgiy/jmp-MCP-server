// State Manager: Persistent memory and state management
import fs from "node:fs";
import path from "node:path";
import { AgentState, AgentMemory, AgentConfig } from "./types.js";

export class StateManager {
  private state: AgentState;
  private stateFile: string;
  private config: AgentConfig;

  constructor(stateDir?: string, config?: AgentConfig) {
    const dir = stateDir || path.join(process.cwd(), ".agent-state");
    this.stateFile = path.join(dir, "state.json");
    this.config = config || {};
    
    this.state = {
      memories: [],
      taskHistory: new Map(),
      stats: {
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0
      }
    };
  }

  async load(): Promise<void> {
    try {
      if (fs.existsSync(this.stateFile)) {
        const raw = fs.readFileSync(this.stateFile, "utf8");
        const parsed = JSON.parse(raw);
        
        // Reconstruct Map from serialized object
        this.state = {
          ...parsed,
          taskHistory: new Map(Object.entries(parsed.taskHistory || {}))
        };
        
        console.log(`[StateManager] Loaded state: ${this.state.memories.length} memories`);
      } else {
        console.log("[StateManager] No existing state found, starting fresh");
      }
    } catch (error) {
      console.error("[StateManager] Error loading state:", error);
    }
  }

  async save(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.stateFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Convert Map to object for serialization
      const serializable = {
        ...this.state,
        taskHistory: Object.fromEntries(this.state.taskHistory)
      };

      fs.writeFileSync(this.stateFile, JSON.stringify(serializable, null, 2), "utf8");
      console.log("[StateManager] State saved");
    } catch (error) {
      console.error("[StateManager] Error saving state:", error);
    }
  }

  addMemory(memory: AgentMemory): void {
    this.state.memories.push(memory);
    
    // Limit memory size
    const maxMemories = this.config.maxMemories || 100;
    if (this.state.memories.length > maxMemories) {
      this.state.memories = this.state.memories.slice(-maxMemories);
    }
  }

  getRecentMemories(count: number = 10): AgentMemory[] {
    return this.state.memories.slice(-count);
  }

  getTaskHistory(taskId: string): AgentMemory[] {
    return this.state.taskHistory.get(taskId) || [];
  }

  addTaskHistory(taskId: string, memory: AgentMemory): void {
    if (!this.state.taskHistory.has(taskId)) {
      this.state.taskHistory.set(taskId, []);
    }
    this.state.taskHistory.get(taskId)!.push(memory);
    
    // Update stats
    this.state.stats.totalTasks = this.state.taskHistory.size;
    if (memory.success) {
      this.state.stats.successfulTasks++;
    } else {
      this.state.stats.failedTasks++;
    }
    this.state.stats.lastRunTime = memory.timestamp;
  }

  getState(): AgentState {
    return this.state;
  }

  getSummary(): string {
    return `${this.state.memories.length} memories, ${this.state.stats.totalTasks} tasks (${this.state.stats.successfulTasks} successful)`;
  }

  clear(): void {
    this.state = {
      memories: [],
      taskHistory: new Map(),
      stats: {
        totalTasks: 0,
        successfulTasks: 0,
        failedTasks: 0
      }
    };
  }
}

