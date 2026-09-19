import * as React from "react";
import { ChatConversation, ChatMessage } from "./types";

/* global localStorage */

const CHAT_STORAGE_KEY = "investor-chat-conversations.v1";
const LEGACY_CHAT_STORAGE_KEY = "investor-chat.v1";
const DEFAULT_TITLE = "New conversation";

interface StoredChatHistory {
  activeConversationId: string;
  conversations: ChatConversation[];
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function titleFromMessages(messages: ChatMessage[]) {
  const firstPrompt = messages.find((message) => message.role === "user")?.content.trim();
  if (!firstPrompt) return DEFAULT_TITLE;
  return firstPrompt.length > 42 ? `${firstPrompt.slice(0, 39)}…` : firstPrompt;
}

function createConversation(messages: ChatMessage[] = []): ChatConversation {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: titleFromMessages(messages),
    createdAt: now,
    updatedAt: now,
    messages,
  };
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Partial<ChatMessage>;
  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    typeof message.createdAt === "string"
  );
}

function isConversation(value: unknown): value is ChatConversation {
  if (!value || typeof value !== "object") return false;
  const conversation = value as Partial<ChatConversation>;
  return (
    typeof conversation.id === "string" &&
    typeof conversation.title === "string" &&
    typeof conversation.createdAt === "string" &&
    typeof conversation.updatedAt === "string" &&
    Array.isArray(conversation.messages) &&
    conversation.messages.every(isChatMessage)
  );
}

function loadHistory(): StoredChatHistory {
  try {
    const stored = localStorage.getItem(CHAT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<StoredChatHistory>;
      const conversations = Array.isArray(parsed.conversations)
        ? parsed.conversations.filter(isConversation)
        : [];

      if (conversations.length) {
        const activeConversationId = conversations.some(
          (conversation) => conversation.id === parsed.activeConversationId
        )
          ? (parsed.activeConversationId as string)
          : conversations[0].id;
        return { activeConversationId, conversations };
      }
    }

    const legacyStored = localStorage.getItem(LEGACY_CHAT_STORAGE_KEY);
    const legacyParsed = legacyStored ? (JSON.parse(legacyStored) as unknown) : [];
    const legacyMessages = Array.isArray(legacyParsed) ? legacyParsed.filter(isChatMessage) : [];
    const conversation = createConversation(legacyMessages);
    return { activeConversationId: conversation.id, conversations: [conversation] };
  } catch {
    const conversation = createConversation();
    return { activeConversationId: conversation.id, conversations: [conversation] };
  }
}

export function useChatHistory() {
  const [history, setHistory] = React.useState<StoredChatHistory>(loadHistory);

  const persistHistory = React.useCallback((nextHistory: StoredChatHistory) => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(nextHistory));
    } catch {
      // Keep the active conversation usable when browser storage is unavailable.
    }
  }, []);

  const updateHistory = React.useCallback(
    (updater: (current: StoredChatHistory) => StoredChatHistory) => {
      setHistory((current) => {
        const next = updater(current);
        persistHistory(next);
        return next;
      });
    },
    [persistHistory]
  );

  const setMessages = React.useCallback(
    (nextMessages: ChatMessage[]) => {
      updateHistory((current) => ({
        ...current,
        conversations: current.conversations.map((conversation) =>
          conversation.id === current.activeConversationId
            ? {
                ...conversation,
                title: titleFromMessages(nextMessages),
                updatedAt: new Date().toISOString(),
                messages: nextMessages,
              }
            : conversation
        ),
      }));
    },
    [updateHistory]
  );

  const createNewConversation = React.useCallback(() => {
    const conversation = createConversation();
    updateHistory((current) => ({
      activeConversationId: conversation.id,
      conversations: [conversation, ...current.conversations],
    }));
  }, [updateHistory]);

  const setActiveConversationId = React.useCallback(
    (conversationId: string) => {
      updateHistory((current) =>
        current.conversations.some((conversation) => conversation.id === conversationId)
          ? { ...current, activeConversationId: conversationId }
          : current
      );
    },
    [updateHistory]
  );

  const activeConversation =
    history.conversations.find(
      (conversation) => conversation.id === history.activeConversationId
    ) ?? history.conversations[0];

  return {
    conversations: history.conversations,
    activeConversationId: activeConversation.id,
    messages: activeConversation.messages,
    setMessages,
    createNewConversation,
    setActiveConversationId,
  };
}
