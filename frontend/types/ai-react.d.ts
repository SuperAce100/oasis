declare module "ai/react" {
  import type { UIMessage } from "ai";
  import * as React from "react";

  export interface UseChatConfig {
    api: string;
    initialMessages?: UIMessage[];
  }

  export interface UseChatReturn {
    messages: UIMessage[];
    input: string;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    isLoading: boolean;
    append: (message: UIMessage) => Promise<void> | void;
    stop: () => void;
    setInput: (value: string) => void;
  }

  export function useChat(config: UseChatConfig): UseChatReturn;
}
