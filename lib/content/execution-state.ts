import {
  parseStoredCreatorTask,
  type CreatorTaskEnvelope,
} from "./task-envelope";

export const CREATOR_EXECUTION_STORAGE_KEY = "creatorflow-execution";

export type CreatorExecutionState = {
  schemaVersion: "1";
  topic: string;
  status: "generating" | "completed" | "failed";
  provider?: string;
  model?: string;
  title?: string;
  safetyScore?: number;
  hasCoverPrompt?: boolean;
  updatedAt: string;
};

export function parseCreatorExecutionState(value: string): CreatorExecutionState {
  const input: unknown = JSON.parse(value);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Stored execution state must be an object.");
  }
  const state = input as Record<string, unknown>;
  if (
    state.schemaVersion !== "1"
    || typeof state.topic !== "string"
    || !["generating", "completed", "failed"].includes(String(state.status))
    || typeof state.updatedAt !== "string"
  ) {
    throw new Error("Stored execution state is invalid.");
  }
  return state as CreatorExecutionState;
}

export function readCurrentCreatorState(storage: Pick<Storage, "getItem">) {
  const taskValue = storage.getItem("creatorflow-task");
  if (!taskValue) return { task: null, execution: null };

  let task: CreatorTaskEnvelope | null = null;
  try {
    task = parseStoredCreatorTask(taskValue);
  } catch {
    return { task: null, execution: null };
  }

  const executionValue = storage.getItem(CREATOR_EXECUTION_STORAGE_KEY);
  if (!executionValue) return { task, execution: null };
  try {
    const execution = parseCreatorExecutionState(executionValue);
    return {
      task,
      execution: execution.topic === task.brief.topic ? execution : null,
    };
  } catch {
    return { task, execution: null };
  }
}
