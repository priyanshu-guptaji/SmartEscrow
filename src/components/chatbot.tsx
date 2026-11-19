
"use client";

import { useState, useRef, useEffect } from "react";
import {
    MessageCircle,
    X,
    Send,
    Bot,
    User,
    Loader2,
    RotateCcw,
} from "lucide-react";

interface Message {
    role: "user" | "assistant";
    content: string;
}

/** An error reported by the chatbot API that is safe to show to the user. */
class ChatbotApiError extends Error {}

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [failedQuestion, setFailedQuestion] = useState<string | null>(null);

    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content:
                "Hello! Welcome to SmartEscrow. I'm here to help you understand the platform. What would you like to know?",
        },
    ]);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages, loading]);

    async function sendMessage(
        question: string = input.trim(),
        isRetry = false
    ) {
        if (!question || loading) return;

        if (!isRetry) {
            setMessages((prev) => [
                ...prev,
                { role: "user", content: question },
            ]);

            setInput("");
        }

        setLoading(true);
        setFailedQuestion(null);

        try {
            const response = await fetch("/api/chatbot", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ question }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new ChatbotApiError(
                    data.error || "Unable to get an answer."
                );
            }

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content: data.answer,
                },
            ]);
        } catch (error) {
            setFailedQuestion(question);

            console.error("Chatbot error:", error);

            setMessages((prev) => [
                ...prev,
                {
                    role: "assistant",
                    content:
                        error instanceof ChatbotApiError && error.message
                            ? error.message
                            : "Sorry, I couldn't process your question. Please try again.",
                },
            ]);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-3">
            {isOpen && (
                <div className="flex h-[420px] w-[300px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between bg-blue-600 px-3 py-2 text-white">
                        <div className="flex items-center gap-2">
                            <Bot size={16} />

                            <h3 className="text-sm font-semibold">
                                Ask SmartEscrow
                            </h3>
                        </div>

                        <button
                            onClick={() => setIsOpen(false)}
                            className="rounded-full p-1 hover:bg-white/20"
                            aria-label="Close chatbot"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 space-y-2.5 overflow-y-auto bg-gray-50 p-3">
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex gap-2 ${message.role === "user"
                                        ? "justify-end"
                                        : "justify-start"
                                    }`}
                            >
                                {message.role === "assistant" && (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                                        <Bot size={17} />
                                    </div>
                                )}

                                <div                                        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-xs leading-relaxed ${message.role === "user"
                                            ? "rounded-br-sm bg-blue-600 text-white"
                                            : "rounded-bl-sm bg-white text-gray-800 shadow-sm"
                                        }`}
                                >
                                    {message.content}
                                </div>

                                {message.role === "user" && (
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                                        <User size={17} />
                                    </div>
                                )}
                            </div>
                        ))}

                        {failedQuestion && !loading && (
                            <div className="flex justify-start pl-10">
                                <button
                                    type="button"
                                    onClick={() => sendMessage(failedQuestion, true)}
                                    className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-blue-600 shadow-sm transition hover:bg-blue-50"
                                    aria-label="Retry request"
                                >
                                    <RotateCcw size={12} />
                                    Retry
                                </button>
                            </div>
                        )}

                        {loading && (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2
                                    size={18}
                                    className="animate-spin text-blue-600"
                                />
                                SmartEscrow is thinking...
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            sendMessage();
                        }}
                        className="flex items-center gap-1.5 border-t border-gray-200 bg-white p-2"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type your message..."
                            disabled={loading}
                            className="min-w-0 flex-1 rounded-full border border-gray-300 px-3 py-1.5 text-xs text-gray-800 outline-none focus:border-blue-500"
                        />

                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="rounded-full bg-blue-600 p-2 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Send message"
                        >
                            <Send size={14} />
                        </button>
                    </form>
                </div>
            )}

            {/* Compact floating button (panel has its own close button) */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition hover:bg-blue-700"
                    aria-label="Open SmartEscrow chat"
                >
                    <MessageCircle size={20} />
                </button>
            )}
        </div>
    );
}
