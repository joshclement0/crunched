import { ExcelCellValue, ExcelToolRequest } from "../excel/types";

export type { ExcelToolName, ExcelToolRequest } from "../excel/types";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface SelectedRangeContext {
  id: string;
  worksheet: string;
  address: string;
  rowCount: number;
  columnCount: number;
  values: ExcelCellValue[][];
}

export interface AgentContinuation {
  items: unknown[];
}

export interface AgentToolResult {
  id: string;
  output: unknown;
}

export type AgentChatResponse =
  | { type: "final"; responseId: string | null; finalAnswer: string }
  | {
      type: "tool_requests";
      responseId: string | null;
      toolRequests: ExcelToolRequest[];
      continuation: AgentContinuation;
    };
