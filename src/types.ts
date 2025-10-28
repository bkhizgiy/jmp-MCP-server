export type JumpstarterChange = {
  id: string;
  title: string;
  description?: string;
  capability?: string;
  impactAreas?: string[]; // e.g., ["network", "params", "serviceAccount"]
  suggestedParams?: Record<string, unknown>;
};

export type Proposal = {
  notes: string[];
  updatedTaskYAML: string; // full YAML content
};

export type DeterministicRuleResult = {
  name: string;
  changed: boolean;
  notes: string[];
  yaml?: string;
};
