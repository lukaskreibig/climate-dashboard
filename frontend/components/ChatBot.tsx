"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Modal,
  ScrollArea,
  TextInput,
  Group,
  Text,
  Avatar,
  ActionIcon,
  Paper,
  Box,
  Tooltip,
  rem,
  Transition,
  useMantineTheme,
} from "@mantine/core";
import { IconSend, IconUser } from "@tabler/icons-react";

interface ChatMessage {
  fromUser: boolean;
  text: string;
}

interface ChatBotProps {
  API_URL: string;
}

const TYPING_SPEED_MS = 25;

/**
 * Custom hook that returns blinking dots.
 * Cycles through "", ".", "..", "..." repeatedly.
 */
function useBlinkingDots(interval = 400, maxDots = 3) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const timer = setInterval(() => {
      setDots((prev) => (prev.length < maxDots ? prev + "." : ""));
    }, interval);
    return () => clearInterval(timer);
  }, [interval, maxDots]);
  return dots;
}

export default function ChatBot({ API_URL }: ChatBotProps) {
  const theme = useMantineTheme();
  const [opened, setOpened] = useState(false);

  // The conversation: first message is the intro (from Knud)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      fromUser: false,
      text:
        "Greetings! I'm Knud Rasmussen, the Danish-Greenlandic explorer. I've traveled far and wide, gathering stories from Inuit friends across Greenland. What tales or mysteries intrigue you today?",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Reference for the assistant message that is receiving the streamed text
  const currentAssistantIndex = useRef<number | null>(null);

  // For the typing effect: accumulated full text and interval ref
  const [accumulatedText, setAccumulatedText] = useState("");
  const typingIntervalRef = useRef<NodeJS.Timer | null>(null);

  // Blinking dots for the "Thinking..." indicator
  const blinkingDots = useBlinkingDots();

  // Reference for auto-scrolling the chat area
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    requestAnimationFrame(() => {
      scrollViewportRef.current?.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages]);

  const openChat = () => setOpened(true);
  const closeChat = () => setOpened(false);

  function stopTypingInterval() {
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
  }

  // Typing effect: reveal one character at a time in the assistant's message
  useEffect(() => {
    if (currentAssistantIndex.current == null || !accumulatedText) return;
    stopTypingInterval();
    typingIntervalRef.current = setInterval(() => {
      setMessages((prev) => {
        if (currentAssistantIndex.current == null) return prev;
        const updated = [...prev];
        const idx = currentAssistantIndex.current;
        const msg = updated[idx];
        if (msg.text.length >= accumulatedText.length) {
          stopTypingInterval();
          return prev;
        }
        const nextCharIndex = msg.text.length;
        const nextChar = accumulatedText[nextCharIndex];
        updated[idx] = { ...msg, text: msg.text + nextChar };
        return updated;
      });
    }, TYPING_SPEED_MS);
    return () => stopTypingInterval();
  }, [accumulatedText]);

  /**
   * Streams a GPT response via SSE.
   * The assistant's message is created only upon receiving the first chunk.
   */
  async function streamAssistantReply(query: string) {
    setIsLoading(true);
    // We'll use a flag to check if we've created the assistant bubble yet
    let firstChunkReceived = false;
    let fullText = "";
    stopTypingInterval();
    setAccumulatedText("");
    try {
      const response = await fetch(`${API_URL}/chat_stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No readable stream found.");
      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        if (readerDone) {
          done = true;
          break;
        }
        const chunkText = new TextDecoder().decode(value);
        const lines = chunkText.split("\n");
        for (let line of lines) {
          line = line.trim();
          if (!line || !line.startsWith("data:")) continue;
          const dataStr = line.replace("data:", "").trim();
          if (dataStr === "[DONE]") {
            done = true;
            break;
          }
          if (dataStr.startsWith("[ERROR]")) {
            throw new Error(dataStr);
          }
          let payload: { content?: string } = {};
          try {
            payload = JSON.parse(dataStr);
          } catch (err) {
            console.warn("Could not parse SSE chunk:", line);
            continue;
          }
          const chunk = payload.content ?? "";
          if (chunk) {
            fullText += chunk;
            // On the first received chunk, create the assistant bubble
            if (!firstChunkReceived) {
              firstChunkReceived = true;
              setMessages((prev) => {
                currentAssistantIndex.current = prev.length;
                return [...prev, { fromUser: false, text: chunk }];
              });
              setAccumulatedText(chunk);
            } else {
              setAccumulatedText(fullText);
            }
          }
        }
      }
    } catch (error) {
      console.error("Streaming error:", error);
      setMessages((prev) => [
        ...prev,
        {
          fromUser: false,
          text:
            "An error occurred. The spirits have gone silent. Please try again later.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage: ChatMessage = { fromUser: true, text: input };
    setMessages((prev) => [...prev, userMessage]);
    const userQuery = input;
    setInput("");
    await streamAssistantReply(userQuery);
  };

  return (
    <>
      {/* Floating Avatar Trigger with Tooltip */}
      <Tooltip label="Chat with Knud Rasmussen" withArrow>
        <Avatar
          src="/knud.jpg"
          size="lg"
          radius="xl"
          onClick={openChat}
          style={{
            cursor: "pointer",
            position: "fixed",
            bottom: rem(24),
            right: rem(24),
            boxShadow: theme.shadows.md,
            transition: "transform 150ms ease",
            animation: "pulse 2s infinite",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          alt="Chat with Knud"
        />
      </Tooltip>

      <Modal
        size="lg"
        opened={opened}
        onClose={closeChat}
        centered
        radius="md"
        withCloseButton
        title={
          <Group gap="xs">
            <Avatar src="/knud.jpg" radius="xl" size="sm" />
            <Text fw={500}>Chat with Knud Rasmussen</Text>
          </Group>
        }
      >
        <Paper
          p="md"
          radius="md"
          withBorder
          style={{
            minHeight: rem(300),
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Scrollable chat area */}
          <ScrollArea
            style={{ height: rem(300), marginBottom: "1rem" }}
            viewportRef={scrollViewportRef}
          >
            {messages.map((msg, index) => {
              const isUser = msg.fromUser;
              return (
                <Transition
                  key={index}
                  mounted
                  transition="fade"
                  duration={300}
                  timingFunction="ease"
                >
                  {(transitionStyles) => (
                    <Box
                      style={{
                        ...transitionStyles,
                        display: "flex",
                        marginTop: "1rem",
                        justifyContent: isUser ? "flex-end" : "flex-start",
                      }}
                    >
                      {isUser ? (
                        <Avatar
                          radius="xl"
                          mr="sm"
                          style={{ backgroundColor: "#007bff" }}
                        >
                          <IconUser size={18} color="white" />
                        </Avatar>
                      ) : (
                        <Avatar src="/knud.jpg" radius="xl" mr="sm" alt="Knud Rasmussen" />
                      )}
                      <Box
                        style={{
                          backgroundColor: isUser ? "#007bff" : "#f1f1f1",
                          color: isUser ? "#fff" : "#000",
                          borderRadius: "8px",
                          padding: "0.5rem 1rem",
                          boxShadow: "0 0 4px rgba(0,0,0,0.1)",
                          maxWidth: "70%",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        <Text size="sm" m={0}>
                          {msg.text}
                        </Text>
                      </Box>
                    </Box>
                  )}
                </Transition>
              );
            })}

            {/* If loading and no assistant bubble is created yet, show blinking dots */}
            {isLoading && !accumulatedText && (
              <Box
                mt="1rem"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-start",
                }}
              >
                <Avatar src="/knud.jpg" radius="xl" size="sm" mr="sm" alt="Knud Rasmussen" />
                <Box
                  style={{
                    backgroundColor: "#f1f1f1",
                    color: "#000",
                    borderRadius: "8px",
                    padding: "0.5rem 1rem",
                    boxShadow: "0 0 4px rgba(0,0,0,0.1)",
                  }}
                >
                  <Text size="sm">{blinkingDots}</Text>
                </Box>
              </Box>
            )}
          </ScrollArea>

          {/* Input and Send */}
          <Group spacing="xs">
            <TextInput
              placeholder="Ask about Greenlandic Stories..."
              autoComplete="off"
              style={{ flex: 1 }}
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <ActionIcon
              variant="filled"
              color="blue"
              onClick={sendMessage}
              disabled={isLoading}
              aria-label="Send message"
            >
              <IconSend size={18} />
            </ActionIcon>
          </Group>
        </Paper>
      </Modal>
    </>
  );
}
