// Agent-specific type definitions
import { JumpstarterChange } from "../types.js";

export type AgentTaskType = 
  | "update-task"
  | "monitor-changes"
  | "analyze-impact"
  | "batch-update";

export interface AgentTask {
  id: string;
  type: AgentTaskType;
  data: {
    changes?: JumpstarterChange[];
    taskYaml?: string;
    changeSource?: string;
    [key: string]: any;
  };
  priority?: number;
  createdAt?: string;
}

export interface AgentDecision {
  action: string;
  reasoning: string;
  confidence: number;
  final: boolean;
  metadata?: Record<string, any>;
}

export interface AgentMemory {
  timestamp: string;
  decision: AgentDecision;
  result: any;
  success: boolean;
}

export interface AgentState {
  memories: AgentMemory[];
  taskHistory: Map<string, AgentMemory[]>;
  currentTask?: AgentTask;
  stats: {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
    lastRunTime?: string;
  };
}

export interface AgentConfig {
  maxMemories?: number;
  maxRetries?: number;
  autoApplyThreshold?: number;
  stateDir?: string;
  enableLLM?: boolean;
}

