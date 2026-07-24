import { workflowSteps } from "@/data/mock";
import type { WorkflowStep } from "@/lib/types";
export function advanceWorkflow(steps: WorkflowStep[]): WorkflowStep[] {
  const current=steps.findIndex(s=>s.status==="running");
  if(current<0) return steps;
  return steps.map((s,i)=>i===current?{...s,status:"completed"}:i===current+1?{...s,status:"running"}:s);
}
export const resetWorkflow=()=>workflowSteps.map(s=>({...s}));
