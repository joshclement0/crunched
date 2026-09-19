import { ExcelToolError, executeExcelTool, inspectWorkbookMetadata } from "../excel/excelTools";
import { ExcelToolRequest } from "../excel/types";
import { requestAgentTurn } from "./chatClient";
import { AgentContinuation, AgentToolResult, ChatMessage, SelectedRangeContext } from "./types";

/* global console */

const MAX_AGENT_TOOL_ROUNDS = 8;

async function executeToolRequest(request: ExcelToolRequest): Promise<AgentToolResult> {
  try {
    const result = await executeExcelTool(request);
    return { id: request.id, output: { ok: true, result } };
  } catch (error) {
    const toolError =
      error instanceof ExcelToolError
        ? { code: error.code, message: error.message, tool: error.tool }
        : {
            code: "tool_execution_failed",
            message: error instanceof Error ? error.message : "The Excel tool failed.",
            tool: request.name,
          };
    return { id: request.id, output: { ok: false, error: toolError } };
  }
}

export async function sendAgentMessage(
  messages: ChatMessage[],
  selectedRanges: SelectedRangeContext[] = []
): Promise<string> {
  const workbookMetadata = await inspectWorkbookMetadata();
  let continuation: AgentContinuation | undefined;
  let toolResults: AgentToolResult[] | undefined;

  // A tool round is a model response followed by execution of its requested tools.
  // The extra iteration gives the model the results from the final allowed round
  // so it can return an answer instead of failing immediately after the tools ran.
  for (let turn = 0; turn <= MAX_AGENT_TOOL_ROUNDS; turn += 1) {
    console.info("[agent] Starting agent turn", {
      turn: turn + 1,
      completedToolRounds: turn,
      maximumToolRounds: MAX_AGENT_TOOL_ROUNDS,
    });
    const response = await requestAgentTurn(
      messages,
      workbookMetadata,
      selectedRanges,
      continuation,
      toolResults
    );
    if (response.type === "final") {
      console.info("[agent] Agent completed", { turns: turn + 1 });
      return response.finalAnswer.trim();
    }

    if (turn === MAX_AGENT_TOOL_ROUNDS) {
      throw new Error(
        `The agent requested more workbook work after ${MAX_AGENT_TOOL_ROUNDS} tool rounds. Try attaching a smaller range or asking a more specific question.`
      );
    }

    continuation = response.continuation;
    toolResults = [];
    console.info("[agent] Executing workbook tools", {
      turn: turn + 1,
      toolCount: response.toolRequests.length,
      tools: response.toolRequests.map((request) => request.name),
    });
    for (const request of response.toolRequests) {
      toolResults.push(await executeToolRequest(request));
    }
  }

  throw new Error("The agent stopped unexpectedly.");
}
