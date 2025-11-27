import { useState } from "react";
import { PageLayout } from "@/components/PageLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { WorkflowIcon, ChevronDown, ChevronUp } from "lucide-react";
import { useWorkflow } from "@/agents/debug";

export default function WorkflowsView() {
  const workflows = useWorkflow();
  const [expandedWorkflows, setExpandedWorkflows] = useState<Set<number>>(
    new Set(),
  );

  const toggleWorkflow = (index: number) => {
    setExpandedWorkflows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  return (
    <PageLayout>
      <PageHeader
        title="Workflows"
        subtitle={`${workflows.length} workflow${workflows.length !== 1 ? "s" : ""} logged`}
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-32">
        <div className="max-w-4xl mx-auto space-y-4">
          {workflows.length === 0 ? (
            <EmptyState
              icon={WorkflowIcon}
              title="No workflows yet"
              description="Workflows will appear here as they are logged"
            />
          ) : (
            <div className="space-y-3">
              {workflows.map((workflow, index) => (
                <div
                  key={index}
                  className="border border-primary/20 rounded-xl bg-card/50 backdrop-blur-sm hover:shadow-md hover:border-primary/30 transition-all overflow-hidden"
                >
                  {/* Workflow Header */}
                  <button
                    onClick={() => toggleWorkflow(index)}
                    className="w-full p-4 flex items-center justify-between hover:bg-primary/5 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <WorkflowIcon className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="font-semibold text-base mb-1">
                          {workflow.name}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {workflow.tools.length} tool
                          {workflow.tools.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    {expandedWorkflows.has(index) ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>

                  {/* Expanded Content */}
                  {expandedWorkflows.has(index) && (
                    <div className="p-4 pt-0 space-y-4 border-t border-primary/10">
                      {/* System Prompt */}
                      <div>
                        <h5 className="text-sm font-semibold mb-2 text-primary">
                          System Prompt
                        </h5>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap font-mono">
                            {workflow.system}
                          </p>
                        </div>
                      </div>

                      {/* Input */}
                      <div>
                        <h5 className="text-sm font-semibold mb-2 text-primary">
                          Input
                        </h5>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap">
                            {workflow.input}
                          </p>
                        </div>
                      </div>

                      {/* Output */}
                      <div>
                        <h5 className="text-sm font-semibold mb-2 text-primary">
                          Output
                        </h5>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-sm whitespace-pre-wrap">
                            {workflow.output}
                          </p>
                        </div>
                      </div>

                      {/* Tools */}
                      {workflow.tools.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold mb-2 text-primary">
                            Tools ({workflow.tools.length})
                          </h5>
                          <div className="space-y-2">
                            {workflow.tools.map((tool, toolIndex) => (
                              <div
                                key={toolIndex}
                                className="bg-muted/30 rounded-lg p-3 space-y-2"
                              >
                                <h6 className="text-sm font-semibold">
                                  {tool.name}
                                </h6>
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    Input:
                                  </p>
                                  <p className="text-xs whitespace-pre-wrap font-mono bg-background/50 rounded p-2">
                                    {tool.input}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">
                                    Output:
                                  </p>
                                  <p className="text-xs whitespace-pre-wrap font-mono bg-background/50 rounded p-2">
                                    {tool.output}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
