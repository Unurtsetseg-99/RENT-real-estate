"use client";
import { createContext, useContext, useState } from "react";

export type Message = {
  id: number;
  from: string;
  listing: string;
  text: string;
  time: string;
  read: boolean;
};

const MOCK_MESSAGES: Message[] = [
 ];

type MessagesContextValue = {
  messages: Message[];
  markRead: (id: number) => void;
  unreadCount: number;
};

const MessagesContext = createContext<MessagesContextValue | null>(null);

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);

  const markRead = (id: number) =>
    setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, read: true } : msg)));

  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <MessagesContext.Provider value={{ messages, markRead, unreadCount }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const value = useContext(MessagesContext);
  if (!value) throw new Error("useMessages must be used inside MessagesProvider");
  return value;
}
