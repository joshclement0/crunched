import * as React from "react";
import { Button, MessageBar, Select, Spinner, Textarea } from "@fluentui/react-components";
import { Add20Regular, Send20Regular } from "@fluentui/react-icons";
import { sendAgentMessage } from "../../chat/agentRunner";
import { ChatMessage } from "../../chat/types";
import { useChatHistory } from "../../chat/useChatHistory";
import { useSelectedRanges } from "../../chat/useSelectedRanges";
import SelectedRangesPanel from "./SelectedRangesPanel";
import { useChatStyles } from "./styles";

function createMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

export default function ChatView() {
  const styles = useChatStyles();
  const {
    conversations,
    activeConversationId,
    messages,
    setMessages,
    createNewConversation,
    setActiveConversationId,
  } = useChatHistory();
  const {
    selectedRanges,
    isCapturing,
    selectionError,
    addCurrentSelection,
    removeSelectedRange,
    clearSelectedRanges,
  } = useSelectedRanges();
  const [prompt, setPrompt] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const historyEndRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  const handleSend = React.useCallback(async () => {
    const content = prompt.trim();
    if (!content || isSending) return;

    const userMessage = createMessage("user", content);
    const nextMessages = [...messages, userMessage];
    setPrompt("");
    setError(null);
    setIsSending(true);
    setMessages(nextMessages);

    try {
      const answer = await sendAgentMessage(nextMessages, selectedRanges);
      setMessages([...nextMessages, createMessage("assistant", answer)]);
      clearSelectedRanges();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The agent request failed.");
    } finally {
      setIsSending(false);
    }
  }, [clearSelectedRanges, isSending, messages, prompt, selectedRanges, setMessages]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleNewConversation = () => {
    createNewConversation();
    setPrompt("");
    setError(null);
    clearSelectedRanges();
  };

  return (
    <section className={styles.root} aria-label="Investor chat">
      <div className={styles.toolbar}>
        <Select
          className={styles.conversationSelect}
          aria-label="Current conversation"
          value={activeConversationId}
          disabled={isSending}
          onChange={(_, data) => {
            setActiveConversationId(data.value);
            setError(null);
            clearSelectedRanges();
          }}
        >
          {conversations.map((conversation) => (
            <option key={conversation.id} value={conversation.id}>
              {conversation.title}
            </option>
          ))}
        </Select>
        <Button icon={<Add20Regular />} disabled={isSending} onClick={handleNewConversation}>
          New
        </Button>
      </div>
      <div className={styles.history} aria-live="polite">
        {!messages.length && (
          <div className={styles.empty}>
            <div>
              <h2 className={styles.emptyTitle}>Ask about this workbook</h2>
              <p className={styles.emptyText}>
                Start a conversation about companies, signals, or workbook data. Each conversation is saved separately in this add-in.
              </p>
            </div>
          </div>
        )}
        {messages.map((message) => (
          <div
            className={`${styles.messageRow} ${message.role === "user" ? styles.userRow : styles.assistantRow}`}
            key={message.id}
          >
            <p className={`${styles.message} ${message.role === "user" ? styles.userMessage : styles.assistantMessage}`}>
              {message.content}
            </p>
          </div>
        ))}
        {isSending && (
          <div className={styles.status} role="status">
            <Spinner size="tiny" />
            <span>Working on your request…</span>
          </div>
        )}
        <div ref={historyEndRef} />
      </div>
      <div className={styles.composer}>
        {error && <MessageBar intent="error">{error}</MessageBar>}
        <SelectedRangesPanel
          ranges={selectedRanges}
          isCapturing={isCapturing}
          disabled={isSending}
          error={selectionError}
          onAdd={() => void addCurrentSelection()}
          onRemove={removeSelectedRange}
        />
        <div className={styles.inputRow}>
          <Textarea
            className={styles.textarea}
            resize="vertical"
            rows={3}
            value={prompt}
            disabled={isSending}
            placeholder="Ask about companies, signals, or workbook data…"
            aria-label="Chat prompt"
            onChange={(_, data) => setPrompt(data.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            appearance="primary"
            icon={<Send20Regular />}
            disabled={isSending || isCapturing || !prompt.trim()}
            onClick={() => void handleSend()}
          >
            Send
          </Button>
        </div>
        <p className={styles.hint}>Enter to send · Shift+Enter for a new line</p>
      </div>
    </section>
  );
}
