import { useEffect, useState } from "react";

export type Workflow = {
  name: string;
  system: string;
  input: string;
  output: string;
  tools: { name: string; input: string; output: string }[];
};

const workflows: Workflow[] = [];

export function getWorkflows() {
  return [...workflows];
}

export function logWorkflow(workflow: Workflow) {
  workflows.push(workflow);
  console.log("Workflow: ", workflow.name);
  listeners.forEach((listener) => {
    listener(getWorkflows());
  });
}

let id = 0;
type WorkflowListener = (workflows: Workflow[]) => void;
const listeners = new Map<number, WorkflowListener>();

export function listenWorkflow(listener: WorkflowListener) {
  listeners.set(id, listener);
  id++;
  id = id % Number.MAX_SAFE_INTEGER;
  return () => {
    listeners.delete(id);
  };
}

export function useWorkflow() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  useEffect(() => {
    const dispose = listenWorkflow((workflows) => {
      setWorkflows(workflows);
    });
    return dispose;
  }, []);
  return workflows;
}
