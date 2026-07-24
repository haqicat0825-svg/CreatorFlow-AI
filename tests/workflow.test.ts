import { expect, it } from "vitest";
import { advanceWorkflow } from "@/lib/workflow";
it("completes the running step and starts the next waiting step",()=>{
 const next=advanceWorkflow([{id:"a",name:"A",subtitle:"",status:"running"},{id:"b",name:"B",subtitle:"",status:"waiting"}]);
 expect(next.map(s=>s.status)).toEqual(["completed","running"]);
});
