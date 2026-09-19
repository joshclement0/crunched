import {
  AgentChatResponse,
  AgentContinuation,
  AgentToolResult,
  ChatMessage,
  SelectedRangeContext,
} from "./types";
import { WorkbookMetadata } from "../excel/types";

/* global Blob, console, fetch, Response */

const AGENT_ENDPOINT = "/api/agent";

function createRequestId(): string {
  return `agent-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function requestAgentTurn(
  messages: ChatMessage[],
  workbookMetadata: WorkbookMetadata,
  selectedRanges: SelectedRangeContext[],
  continuation?: AgentContinuation,
  toolResults?: AgentToolResult[]
): Promise<AgentChatResponse> {
  const requestId = createRequestId();
  const requestBody = JSON.stringify({
    messages: messages.map(({ role, content }) => ({ role, content })),
    workbookMetadata,
    selectedRanges,
    ...(continuation ? { continuation, toolResults } : {}),
  });
  const startedAt = Date.now();

  console.info("[agent] Request started", {
    requestId,
    payloadBytes: new Blob([requestBody]).size,
    messageCount: messages.length,
    selectedRangeCount: selectedRanges.length,
    selectedCellCount: selectedRanges.reduce(
      (total, range) => total + range.rowCount * range.columnCount,
      0
    ),
    continuationItemCount: continuation?.items.length ?? 0,
    toolResultCount: toolResults?.length ?? 0,
  });

  let response: Response;
  try {
    response = await fetch(AGENT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Request-ID": requestId },
      body: requestBody,
    });
  } catch (error) {
    console.error("[agent] Request could not reach the server", {
      requestId,
      elapsedMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    throw new Error(
      "The AI server could not be reached. Check that the add-in server is running, then try again."
    );
  }

  console.info("[agent] Response received", {
    requestId,
    status: response.status,
    elapsedMs: Date.now() - startedAt,
  });

  let payload: AgentChatResponse | { error?: string } | null = null;
  try {
    payload = (await response.json()) as AgentChatResponse | { error?: string };
  } catch {
    // The status-based error below is more useful than a JSON parsing failure.
  }

  if (!response.ok) {
    const errorMessage = payload && "error" in payload ? payload.error : undefined;
    throw new Error(errorMessage || `The agent request failed (HTTP ${response.status}).`);
  }

  if (!payload || !("type" in payload)) throw new Error("The agent returned an invalid response.");
  if (payload.type === "final" && !payload.finalAnswer.trim()) {
    throw new Error("The agent returned an empty response.");
  }
  if (
    payload.type === "tool_requests" &&
    (!payload.toolRequests.length || !Array.isArray(payload.continuation?.items))
  ) {
    throw new Error("The agent returned invalid tool requests.");
  }
  return payload;
}
