// Agent Orchestrator: Handles planning, task scheduling, and coordination
import { AgentCore } from "./core.js";
import { AgentTask, AgentTaskType, AgentConfig } from "./types.js";
import { loadChangesFromFile } from "../jumpstarter/client.js";
import fs from "node:fs";
import path from "node:path";

export class AgentOrchestrator {
  private agent: AgentCore;
  private config: AgentConfig;
  private taskQueue: AgentTask[] = [];
  private running: boolean = false;

  constructor(config?: AgentConfig) {
    this.config = {
      maxRetries: 3,
      autoApplyThreshold: 0.7,
      maxMemories: 100,
      enableLLM: !!process.env.OPENAI_API_KEY,
      ...config
    };
    this.agent = new AgentCore(this.config.stateDir);
  }

  async initialize() {
    await this.agent.initialize();
    console.log("[Orchestrator] Initialized with config:", this.config);
  }

  // Main orchestration loop
  async start() {
    this.running = true;
    console.log("[Orchestrator] Starting agent orchestration loop");

    while (this.running) {
      if (this.taskQueue.length > 0) {
        const task = this.taskQueue.shift()!;
        await this.executeTask(task);
      } else {
        // No tasks, wait a bit
        await this.sleep(1000);
      }
    }
  }

  async executeTask(task: AgentTask): Promise<void> {
    console.log(`[Orchestrator] Executing task ${task.id} (${task.type})`);
    
    try {
      await this.agent.run(task);
      console.log(`[Orchestrator] Task ${task.id} completed successfully`);
    } catch (error) {
      console.error(`[Orchestrator] Task ${task.id} failed:`, error);
      
      // Retry logic
      const retries = (task.data._retries || 0) + 1;
      if (retries < (this.config.maxRetries || 3)) {
        console.log(`[Orchestrator] Retrying task ${task.id} (attempt ${retries})`);
        task.data._retries = retries;
        this.taskQueue.push(task);
      }
    }
  }

  // High-level workflows

  async proposeUpdateWorkflow(taskYamlPath: string, changesPath: string, outputPath?: string): Promise<string> {
    console.log("[Orchestrator] Starting propose-update workflow");
    
    // Load inputs
    const taskYaml = fs.readFileSync(path.resolve(taskYamlPath), "utf8");
    const changes = await loadChangesFromFile(changesPath);

    // Create task
    const task: AgentTask = {
      id: `workflow-propose-${Date.now()}`,
      type: "update-task",
      data: { taskYaml, changes, outputPath }
    };

    // Execute
    await this.agent.run(task);
    const state = this.agent.getState();
    const lastMemory = state.memories[state.memories.length - 1];

    if (!lastMemory?.success) {
      throw new Error("Failed to propose update: " + lastMemory?.result?.error);
    }

    const updatedYaml = lastMemory.result.updatedYaml;

    // Write output if path provided
    if (outputPath) {
      const fullPath = path.resolve(outputPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, updatedYaml, "utf8");
      console.log(`[Orchestrator] Wrote updated YAML to ${outputPath}`);
    }

    return updatedYaml;
  }

  async analyzeImpactWorkflow(taskYamlPath: string, changesPath: string): Promise<any> {
    console.log("[Orchestrator] Starting analyze-impact workflow");
    
    const taskYaml = fs.readFileSync(path.resolve(taskYamlPath), "utf8");
    const changes = await loadChangesFromFile(changesPath);

    const task: AgentTask = {
      id: `workflow-analyze-${Date.now()}`,
      type: "analyze-impact",
      data: { taskYaml, changes }
    };

    await this.agent.run(task);
    const state = this.agent.getState();
    const lastMemory = state.memories[state.memories.length - 1];

    return {
      impactScore: lastMemory?.decision?.metadata?.impactScore || 0,
      requiresReview: lastMemory?.result?.requiresReview || false,
      reasoning: lastMemory?.decision?.reasoning,
      recommendation: lastMemory?.decision?.action
    };
  }

  async batchUpdateWorkflow(tasksDir: string, changesPath: string, outputDir: string): Promise<any> {
    console.log("[Orchestrator] Starting batch-update workflow");
    
    // Find all YAML files in tasks directory
    const taskFiles = fs.readdirSync(tasksDir)
      .filter((f: string) => f.endsWith('.yaml') || f.endsWith('.yml'))
      .map((f: string) => path.join(tasksDir, f));

    if (taskFiles.length === 0) {
      throw new Error(`No YAML files found in ${tasksDir}`);
    }

    console.log(`[Orchestrator] Found ${taskFiles.length} task files`);

    const changes = await loadChangesFromFile(changesPath);
    const results = [];

    // Process each task
    for (const taskFile of taskFiles) {
      const taskYaml = fs.readFileSync(taskFile, "utf8");
      const task: AgentTask = {
        id: `batch-${Date.now()}-${path.basename(taskFile)}`,
        type: "update-task",
        data: { taskYaml, changes }
      };

      try {
        await this.agent.run(task);
        const state = this.agent.getState();
        const lastMemory = state.memories[state.memories.length - 1];

        if (lastMemory?.success && lastMemory?.result?.updatedYaml) {
          // Write output
          const outputFile = path.join(outputDir, path.basename(taskFile));
          fs.mkdirSync(outputDir, { recursive: true });
          fs.writeFileSync(outputFile, lastMemory.result.updatedYaml, "utf8");
          
          results.push({
            file: path.basename(taskFile),
            success: true,
            outputFile,
            notes: lastMemory.result.notes
          });
        } else {
          results.push({
            file: path.basename(taskFile),
            success: false,
            error: lastMemory?.result?.error || "Unknown error"
          });
        }
      } catch (error: any) {
        results.push({
          file: path.basename(taskFile),
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`[Orchestrator] Batch update complete: ${successCount}/${taskFiles.length} successful`);

    return {
      total: taskFiles.length,
      successful: successCount,
      failed: taskFiles.length - successCount,
      results
    };
  }

  async autoUpdateWorkflow(taskYamlPath: string, changesPath: string, outputPath: string): Promise<any> {
    console.log("[Orchestrator] Starting auto-update workflow");
    
    // First analyze impact
    const impact = await this.analyzeImpactWorkflow(taskYamlPath, changesPath);
    
    console.log(`[Orchestrator] Impact analysis: score=${impact.impactScore}, requires_review=${impact.requiresReview}`);

    // Decide whether to auto-apply
    if (impact.requiresReview || impact.impactScore > (this.config.autoApplyThreshold || 0.7)) {
      return {
        autoApplied: false,
        reason: "Changes require manual review",
        impact
      };
    }

    // Auto-apply
    const updatedYaml = await this.proposeUpdateWorkflow(taskYamlPath, changesPath, outputPath);

    return {
      autoApplied: true,
      outputPath,
      impact,
      yaml: updatedYaml
    };
  }

  // Task queue management
  addTask(task: AgentTask): void {
    // Sort by priority (higher first)
    const priority = task.priority || 0;
    const insertIndex = this.taskQueue.findIndex(t => (t.priority || 0) < priority);
    
    if (insertIndex === -1) {
      this.taskQueue.push(task);
    } else {
      this.taskQueue.splice(insertIndex, 0, task);
    }
    
    console.log(`[Orchestrator] Added task ${task.id} to queue (priority: ${priority})`);
  }

  getQueueStatus(): any {
    return {
      queueLength: this.taskQueue.length,
      tasks: this.taskQueue.map(t => ({
        id: t.id,
        type: t.type,
        priority: t.priority || 0
      }))
    };
  }

  stop() {
    this.running = false;
    this.agent.stop();
    console.log("[Orchestrator] Stopped");
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getAgentState() {
    return this.agent.getState();
  }
}

