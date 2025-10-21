"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Send, User } from "lucide-react";
import clsx from "clsx";
import { useTranslation } from "react-i18next";

/* ─────────────────────────────────── Types & Consts ─────────────────────────────────── */
interface ChatMessage {
  fromUser: boolean;
  text: string;
}

const TYPING_SPEED_MS = 25;

/* ────────────────────────────── Blinking-Dots-Hook (fix) ───────────────────────────── */
function useBlinkingDots(active: boolean, interval = 400, maxDots = 3) {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setDots(p => (p.length < maxDots ? p + "." : "."));
    }, interval);
    return () => clearInterval(id);
  }, [active, interval, maxDots]);
  return active ? dots : null;
}

/* ───────────────────────────────────── Component ───────────────────────────────────── */
export default function ChatBot() {
  const { t, i18n } = useTranslation();

  /* ---------- UI state ---------- */
  const [opened, setOpened]     = useState(false);
  const [input, setInput]       = useState("");
  const [isLoading, setLoading] = useState(false);

  /* ---------- Messages ---------- */
  const [messages, setMessages] = useState<ChatMessage[]>([
    { fromUser: false, text: t("chatbot.greeting") },
  ]);

  /* Greeting nach Sprachwechsel aktualisieren */
  useEffect(() => {
    setMessages([{ fromUser: false, text: t("chatbot.greeting") }]);
  }, [i18n.language, t]);

  /* ---------- Typing-Animation ---------- */
  const currentAssistantIdx         = useRef<number | null>(null);
  const [accumulatedText, setAcc]   = useState("");
  const typingIntervalRef           = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    if (currentAssistantIdx.current == null || !accumulatedText) return;
    clearInterval(typingIntervalRef.current as any);
    typingIntervalRef.current = setInterval(() => {
      setMessages(prev => {
        const idx = currentAssistantIdx.current!;
        const msg = prev[idx];
        if (!msg || msg.text.length >= accumulatedText.length) {
          clearInterval(typingIntervalRef.current as any);
          return prev;
        }
        const updated = [...prev];
        updated[idx] = { ...msg, text: accumulatedText.slice(0, msg.text.length + 1) };
        return updated;
      });
    }, TYPING_SPEED_MS);
    return () => clearInterval(typingIntervalRef.current as any);
  }, [accumulatedText]);

  /* ---------- Auto-Scroll ---------- */
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  /* ---------- Streaming SSE ---------- */
  async function streamAssistantReply(query: string) {
    setLoading(true);
    let firstChunk = true;
    let full = "";
    setAcc("");

    try {
      const res = await fetch("/api/chat_stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      let done = false;
      while (!done) {
        const { value, done: rDone } = await reader.read();
        if (rDone) break;

        const chunk = new TextDecoder().decode(value);
        chunk.split("\n").forEach(line => {
          line = line.trim();
          if (!line.startsWith("data:")) return;
          const payload = line.replace("data:", "").trim();
          if (payload === "[DONE]") { done = true; return; }
          if (payload.startsWith("[ERROR]")) throw new Error(payload);

          let data: { content?: string } = {};
          try { data = JSON.parse(payload); } catch { return; }

          const text = data.content ?? "";
          if (!text) return;
          full += text;

          if (firstChunk) {
            firstChunk = false;
            setMessages(prev => {
              currentAssistantIdx.current = prev.length;
              return [...prev, { fromUser: false, text }];
            });
            setAcc(text);
          } else {
            setAcc(full);
          }
        });
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { fromUser: false, text: t("chatbot.error") }]);
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Send handler ---------- */
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { fromUser: true, text: input };
    setMessages(p => [...p, userMsg]);
    setInput("");
    await streamAssistantReply(input);
  };

  /* ---------- Blinking dots ---------- */
  const blinkingDots = useBlinkingDots(isLoading && opened);

  /* ───────────────────────────────────── Render ───────────────────────────────────── */
  return (
    <>
      {/* Floating avatar button */}
      <button
        type="button"
        onClick={() => setOpened(true)}
        className="fixed bottom-30 right-5.5 z-40 rounded-full shadow-lg ring-1  ring-slate-900/10 transition-transform hover:scale-105 animate-pulse"
      >
        <Image src="/knud.jpg" alt={t("chatbot.chatWith")} width={50} height={56} className="rounded-full" />
      </button>

      {/* Modal overlay */}
      {opened && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpened(false)}
          />

          {/* dialog */}
          <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col bg-white text-gray-900 rounded-lg shadow-xl p-4 h-[80vh]">
            {/* header */}
            <div className="flex items-center gap-2 mb-4">
              <Image src="/images/knud.jpg" alt="Knud" width={32} height={32} className="rounded-full" />
              <h2 className="font-semibold">{t("chatbot.chatWithFull")}</h2>
              <button
                onClick={() => setOpened(false)}
                className="ml-auto text-gray-500 hover:text-gray-700"
                aria-label={t("chatbot.closeChat")}
              >
                ×
              </button>
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2">
              {messages.map((msg, idx) => (
                <div key={idx} className={clsx("flex", msg.fromUser ? "justify-end" : "justify-start")}>
                  {!msg.fromUser && (
                    <Image src="/images/knud.jpg" alt="Knud avatar" width={24} height={24} className="rounded-full mr-2 self-start" />
                  )}
                  {msg.fromUser && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2">
                      <User size={16} />
                    </div>
                  )}
                  <div
                    className={clsx(
                      "px-3 py-2 rounded-lg whitespace-pre-wrap text-sm shadow",
                      msg.fromUser
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-900 rounded-bl-none"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isLoading && !accumulatedText && blinkingDots && (
                <div className="flex items-center gap-2">
                  <Image src="/knud.jpg" alt="Knud avatar" width={24} height={24} className="rounded-full" />
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm shadow">{blinkingDots}</div>
                </div>
              )}
            </div>

            {/* input */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={t("chatbot.placeholder")}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={isLoading}
                className="p-2 bg-blue-600 rounded-lg text-white disabled:opacity-50"
                aria-label={t("chatbot.send")}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
