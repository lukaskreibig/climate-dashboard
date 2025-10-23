/* ------------------------------------------------------------------
   OutroCredits.tsx – Final Credits with integrated ChatBot and Methodology
   Links meine Credentials + Methodologie-Buttons | Rechts Knud Chatbot
------------------------------------------------------------------ */
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CaptionWithLearnMore } from "@/components/CaptionsWithLearnMore";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Image from "next/image";
import { Send, User } from "lucide-react";
import clsx from "clsx";

/* ─── ChatBot Integration Types ─── */
interface ChatMessage {
  fromUser: boolean;
  text: string;
}

const TYPING_SPEED_MS = 25;

/* ─── Blinking Dots Hook ─── */
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

/* ─── Main Component ─── */
export default function OutroCredits() {
  const { t } = useTranslation();
  const outroRef = useRef<HTMLDivElement>(null);

  /* ─── ChatBot State ─── */
  const [chatOpened, setChatOpened] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { fromUser: false, text: t("chatbot.aiNote") },
  ]);

  /* ─── Typing Animation ─── */
  const currentAssistantIdx = useRef<number | null>(null);
  const [accumulatedText, setAcc] = useState("");
  const typingIntervalRef = useRef<NodeJS.Timer | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  /* ─── Update greeting on language change ─── */
  useEffect(() => {
    setMessages([{ fromUser: false, text: t("chatbot.aiNote") }]);
  }, [t]);

  /* ─── Typing Effect ─── */
  useEffect(() => {
    if (currentAssistantIdx.current == null || !accumulatedText) return;
    clearInterval(typingIntervalRef.current as any);
    typingIntervalRef.current = setInterval(() => {
      setMessages(prev => {
        const idx = currentAssistantIdx.current!;
        if (idx >= prev.length) return prev;
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

  /* ─── Auto-Scroll Chat ─── */
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  /* ─── Stream Assistant Reply ─── */
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

  /* ─── Send Message ─── */
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { fromUser: true, text: input };
    setMessages(p => [...p, userMsg]);
    setInput("");
    await streamAssistantReply(input);
  };

  /* ─── Blinking Dots ─── */
  const blinkingDots = useBlinkingDots(isLoading && chatOpened);

  /* ─── GSAP Setup ─── */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    
    if (!outroRef.current) return;

    const ctx = gsap.context(() => {
      // Scroll back to story trigger
      ScrollTrigger.create({
        trigger: outroRef.current,
        start: "top center",
        onEnter: () => {
          // Enable scrolling back to story
          if (typeof document !== "undefined") {
            gsap.set(document.body, { overflow: "auto" });
          }
        }
      });
    }, outroRef);

    return () => ctx.revert();
  }, []);

  /* ─── Methodology Buttons Data ─── */
  const methodologyButtons = [
    {
      key: 'voices',
    //   buttonText: t('outro.voicesButton'),
      learnMore: {
        title: t('scenes.voices.learnMoreTitle'),
        content: t('scenes.voices.learnMoreContent'),
        linkTitle: t('scenes.voices.learnMoreLink'),
        linkUrl: t('scenes.voices.learnMoreLinkUrl'),
      }
    },
    {
      key: 'measurement',
    //   buttonText: t('outro.measurementButton'),
      learnMore: {
        title: t('scenes.measurement.learnMoreTitle'),
        content: t('scenes.measurement.learnMoreContent'),
        linkTitle: t('scenes.measurement.learnMoreLink'),
        linkUrl: t('scenes.measurement.learnMoreLinkUrl'),
        image: "/images/pipeline.png",
      }
    },
    {
      key: 'toArctic',
    //   buttonText: t('outro.arcticButton'),
      learnMore: {
        title: t('scenes.toArctic.learnMoreTitle'),
        content: t('scenes.toArctic.learnMoreContent'),
        linkTitle: t('scenes.toArctic.learnMoreLink'),
      }
    }
  ];

  return (
    <section
      ref={outroRef}
      id="outro"
      className="fixed inset-0 bg-neutral-950 text-white flex flex-col lg:flex-row
             items-stretch justify-between z-50 opacity-0 pointer-events-none
             invisible transition-opacity duration-700"
    >
      {/* ═══ LEFT COLUMN - Credits & Methodology ═══ */}
      <div className="flex-1 flex flex-col justify-center px-8 py-10 max-w-lg">
        {/* Personal Credits */}
        <div className="space-y-6 mb-8">
          <h3 className="text-3xl font-bold">Lukas Kreibig</h3>
          <p className="text-sm leading-relaxed text-gray-300">
            Data journalism, coding & visual design.<br/>
            © 2025 – All rights reserved
          </p>
          
          {/* Contact Information */}
          <div className="space-y-2 text-sm text-gray-400">
            <h5 className="text-gray-300 font-medium">{t("outro.contact")}</h5>
            <div className="space-y-1">
              <p>{t("outro.phone")}: +49 (0) 176 444 69 498</p>
              <p>{t("outro.email")}: lukas.kreibig@posteo.de</p>
            </div>
          </div>
        </div>

        {/* Methodology Section */}
        <div className="space-y-4">
          <h4 className="text-xl font-semibold text-blue-300">
            {t("outro.sourcesMethodology")}
          </h4>
          
          {methodologyButtons.map((item) => (
            <div key={item.key} className="pointer-events-auto">
              <CaptionWithLearnMore learnMore={item.learnMore}>
                <></>
              </CaptionWithLearnMore>
            </div>
          ))}
        </div>

        {/* Back to Story */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <Button
            variant="outline"
            onClick={() => {
              // Scroll back to story
              window.scrollTo({ top: 0, behavior: 'smooth' });
              // Hide outro after scroll
              setTimeout(() => {
                if (outroRef.current) {
                  outroRef.current.classList.add("opacity-0", "pointer-events-none", "invisible");
                }
              }, 100);
            }}
            className="text-gray-300 border-gray-600 hover:bg-gray-800 hover:text-white"
          >
            {t("outro.backToStory")}
          </Button>
        </div>
      </div>

      {/* ═══ RIGHT COLUMN - Knud Chatbot ═══ */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 border-l border-gray-700">
        {!chatOpened ? (
          <>
            {/* Avatar - nur anzeigen wenn Chat geschlossen */}
            <div className="mb-6 text-center">
              <Image 
                src="/images/knud.jpg" 
                alt="Knud Rasmussen" 
                width={192}
                height={192}
                className="w-48 h-48 rounded-full object-cover mx-auto mb-4 ring-4 ring-blue-500/20"
              />
              <h4 className="text-xl font-semibold text-blue-300">
                {t("chatbot.chatWithFull")}
              </h4>
            </div>

            {/* Beschreibung des Chatbots */}
            <div className="mb-6 max-w-md text-center space-y-3">
              <p className="text-sm text-gray-300 leading-relaxed">
                {t("chatbot.description")}
              </p>
              <p className="text-sm text-gray-400 leading-relaxed">
                {t("chatbot.aboutKnud")}
              </p>
              <p className="text-sm text-gray-400 leading-relaxed">
                {t("chatbot.folkTales")}
              </p>
            
            </div>

            {/* Start Chat Button */}
            <Button
              onClick={() => setChatOpened(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3"
            >
              {t("outro.startConversation")}
            </Button>
          </>
        ) : (
          /* Chat Interface - nimmt fast die ganze Höhe ein */
          <div className="w-full max-w-lg bg-gray-900 rounded-lg border border-gray-700 flex flex-col h-[80vh] min-h-[600px]">
            {/* Chat Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-700">
              <Image 
                src="/images/knud.jpg" 
                alt="Knud" 
                width={32} 
                height={32} 
                className="rounded-full" 
              />
              <h5 className="font-semibold flex-1">{t("chatbot.chatWithFull")}</h5>
              <button
                onClick={() => setChatOpened(false)}
                className="text-gray-400 hover:text-white text-xl"
                aria-label={t("chatbot.closeChat")}
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={clsx("flex", msg.fromUser ? "justify-end" : "justify-start")}>
                  {!msg.fromUser && (
                    <Image 
                      src="/images/knud.jpg" 
                      alt="Knud avatar" 
                      width={24} 
                      height={24} 
                      className="rounded-full mr-2 self-start" 
                    />
                  )}
                  {msg.fromUser && (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center mr-2">
                      <User size={16} />
                    </div>
                  )}
                  <div
                    className={clsx(
                      "px-3 py-2 rounded-lg whitespace-pre-wrap text-sm shadow max-w-xs",
                      msg.fromUser
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-gray-800 text-gray-100 rounded-bl-none"
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isLoading && !accumulatedText && blinkingDots && (
                <div className="flex items-center gap-2">
                  <Image 
                    src="/images/knud.jpg" 
                    alt="Knud avatar" 
                    width={24} 
                    height={24} 
                    className="rounded-full" 
                  />
                  <div className="px-3 py-2 bg-gray-800 rounded-lg text-sm shadow">
                    {blinkingDots}
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-700 flex gap-2">
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
                className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                placeholder={t("chatbot.placeholder")}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={isLoading}
                className="p-2 bg-blue-600 rounded-lg text-white disabled:opacity-50 hover:bg-blue-700"
                aria-label={t("chatbot.send")}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
