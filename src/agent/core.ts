// Agent Core: Reasoning, planning, and execution engine
import { AgentState, AgentTask, AgentDecision, AgentMemory } from "./types.js";
import { StateManager } from "./state.js";
import { proposeWithLLM } from "../llm/propose.js";
import { applyDeterministicRules, validateTaskYaml, mergeYAMLs } from "../tekton/updater.js";
import { JumpstarterChange } from "../types.js";

export class AgentCore {
  private state: StateManager;
  private running: boolean = false;

  constructor(stateDir?: string) {
    this.state = new StateManager(stateDir);
  }

  async initialize() {
    await this.state.load();
    console.log("[Agent] Initialized with memory:", this.state.getSummary());
  }

  // Main agent reasoning loop
  async run(task: AgentTask): Promise<void> {
    this.running = true;
    console.log(`[Agent] Starting task: ${task.type}`);
    
    try {
      while (this.running && !this.isTaskComplete(task)) {
        // 1. Observe current situation
        const observation = await this.observe(task);
        
        // 2. Reason about what to do next
        const decision = await this.reason(observation, task);
        
        // 3. Execute the decision
        const result = await this.execute(decision, task);
        
        // 4. Update memory/state
        await this.updateState(decision, result);
        
        // 5. Check if we should continue
        if (decision.final || result.error) {
          this.running = false;
        }
      }
      
      console.log("[Agent] Task completed successfully");
    } catch (error) {
      console.error("[Agent] Error during execution:", error);
      throw error;
    }
  }

  private async observe(task: AgentTask): Promise<any> {
    // Gather information about current state
    return {
      task,
      memory: this.state.getRecentMemories(5),
      timestamp: new Date().toISOString(),
      previousAttempts: this.state.getTaskHistory(task.id)
    };
  }

  private async reason(observation: any, task: AgentTask): Promise<AgentDecision> {
    // Use LLM to decide next action based on observation
    console.log("[Agent] Reasoning about next action...");
    
    if (task.type === "update-task") {
      return this.reasonUpdateTask(observation, task);
    } else if (task.type === "monitor-changes") {
      return this.reasonMonitorChanges(observation, task);
    } else if (task.type === "analyze-impact") {
      return this.reasonAnalyzeImpact(observation, task);
    }
    
    return {
      action: "skip",
      reasoning: "Unknown task type",
      confidence: 0,
      final: true
    };
  }

  private async reasonUpdateTask(observation: any, task: AgentTask): Promise<AgentDecision> {
    const { changes, taskYaml } = task.data;
    
    if (!taskYaml || !changes) {
      return {
        action: "skip",
        reasoning: "Missing required data (taskYaml or changes)",
        confidence: 1.0,
        final: true
      };
    }
    
    // First, apply deterministic rules
    const rules = applyDeterministicRules(taskYaml, changes);
    const hasRuleChanges = rules.some(r => r.changed);
    
    // Check if we've tried this before
    const previousAttempts = observation.previousAttempts || [];
    if (previousAttempts.length > 3) {
      return {
        action: "skip",
        reasoning: "Too many failed attempts, human intervention needed",
        confidence: 1.0,
        final: true,
        metadata: { attempts: previousAttempts.length }
      };
    }
    
    // Determine if LLM is needed
    const needsLLM = !hasRuleChanges || changes.some(c => 
      c.description && c.description.length > 100
    );
    
    return {
      action: needsLLM ? "propose-with-llm" : "apply-rules-only",
      reasoning: needsLLM 
        ? "Changes are complex, using LLM for sophisticated analysis"
        : "Simple changes detected, applying deterministic rules",
      confidence: hasRuleChanges ? 0.8 : 0.5,
      final: false,
      metadata: { rules, needsLLM }
    };
  }

  private async reasonMonitorChanges(observation: any, task: AgentTask): Promise<AgentDecision> {
    // Check for new changes and decide if action is needed
    const { changeSource } = task.data;
    
    return {
      action: "check-changes",
      reasoning: "Monitoring for new Jumpstarter changes",
      confidence: 1.0,
      final: false,
      metadata: { source: changeSource }
    };
  }

  private async reasonAnalyzeImpact(observation: any, task: AgentTask): Promise<AgentDecision> {
    const { changes, taskYaml } = task.data;
    
    // Analyze impact of changes on existing task
    const impactScore = this.calculateImpactScore(changes, taskYaml || "");
    
    return {
      action: impactScore > 0.7 ? "high-impact-review" : "auto-apply",
      reasoning: `Impact score: ${impactScore.toFixed(2)}. ${
        impactScore > 0.7 
          ? "High impact detected, requesting review" 
          : "Low impact, safe to auto-apply"
      }`,
      confidence: 0.9,
      final: false,
      metadata: { impactScore }
    };
  }

  private calculateImpactScore(changes: JumpstarterChange[] | undefined, taskYaml: string): number {
    // Simple heuristic for impact analysis
    let score = 0;
    
    if (!changes) return 0;
    
    changes.forEach(change => {
      // High impact areas
      if (change.impactAreas?.includes("serviceAccount")) score += 0.3;
      if (change.impactAreas?.includes("security")) score += 0.4;
      if (change.impactAreas?.includes("network")) score += 0.2;
      
      // Complex descriptions
      if (change.description && change.description.length > 200) score += 0.2;
    });
    
    return Math.min(score, 1.0);
  }

  private async execute(decision: AgentDecision, task: AgentTask): Promise<any> {
    console.log(`[Agent] Executing: ${decision.action}`);
    console.log(`[Agent] Reasoning: ${decision.reasoning}`);
    
    try {
      switch (decision.action) {
        case "propose-with-llm":
          return await this.executeProposeWithLLM(task, decision);
        case "apply-rules-only":
          return await this.executeApplyRules(task, decision);
        case "check-changes":
          return await this.executeCheckChanges(task, decision);
        case "high-impact-review":
          return await this.executeHighImpactReview(task, decision);
        case "auto-apply":
          return await this.executeAutoApply(task, decision);
        case "skip":
          return { skipped: true, reason: decision.reasoning };
        default:
          return { error: `Unknown action: ${decision.action}` };
      }
    } catch (error: any) {
      return { error: error.message };
    }
  }

  private async executeProposeWithLLM(task: AgentTask, decision: AgentDecision): Promise<any> {
    const { changes, taskYaml } = task.data;
    
    if (!taskYaml || !changes) {
      return { error: "Missing taskYaml or changes" };
    }
    
    // Apply deterministic rules first
    const rules = applyDeterministicRules(taskYaml, changes);
    const latest = rules.reverse().find(r => r.yaml)?.yaml || taskYaml;
    
    // Get LLM proposal
    const proposal = await proposeWithLLM(latest, changes);
    const merged = mergeYAMLs(proposal.updatedTaskYAML, latest);
    
    // Validate result
    validateTaskYaml(merged);
    
    return {
      success: true,
      updatedYaml: merged,
      notes: [...rules.flatMap(r => r.notes), ...proposal.notes]
    };
  }

  private async executeApplyRules(task: AgentTask, decision: AgentDecision): Promise<any> {
    const { changes, taskYaml } = task.data;
    
    if (!taskYaml || !changes) {
      return { error: "Missing taskYaml or changes" };
    }
    
    const rules = applyDeterministicRules(taskYaml, changes);
    const updated = rules.reverse().find(r => r.yaml)?.yaml || taskYaml;
    
    validateTaskYaml(updated);
    
    return {
      success: true,
      updatedYaml: updated,
      notes: rules.flatMap(r => r.notes)
    };
  }

  private async executeCheckChanges(task: AgentTask, decision: AgentDecision): Promise<any> {
    // Placeholder for change monitoring
    return {
      success: true,
      changesFound: [],
      message: "No new changes detected"
    };
  }

  private async executeHighImpactReview(task: AgentTask, decision: AgentDecision): Promise<any> {
    const { changes, taskYaml } = task.data;
    
    return {
      success: true,
      requiresReview: true,
      impactScore: decision.metadata?.impactScore,
      message: "High impact changes require human review",
      changes
    };
  }

  private async executeAutoApply(task: AgentTask, decision: AgentDecision): Promise<any> {
    // Same as propose-with-llm but with auto-apply flag
    return this.executeProposeWithLLM(task, decision);
  }

  private async updateState(decision: AgentDecision, result: any): Promise<void> {
    const memory: AgentMemory = {
      timestamp: new Date().toISOString(),
      decision,
      result,
      success: !result.error
    };
    
    this.state.addMemory(memory);
    await this.state.save();
  }

  private isTaskComplete(task: AgentTask): boolean {
    // Check if task has been completed
    const history = this.state.getTaskHistory(task.id);
    return history.some(h => h.result?.success);
  }

  stop() {
    this.running = false;
    console.log("[Agent] Stopping...");
  }

  getState(): AgentState {
    return this.state.getState();
  }
}

