import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { sendChatMessage } from "@/utils/api";

const TypewriterEffect = ({ text }) => {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prevIndex) => prevIndex + 1);
      }, 15);

      return () => clearTimeout(timeout);
    } else {
      setIsComplete(true);
    }
  }, [currentIndex, text]);

  return (
    <>
      {displayText}
      {!isComplete && <span className="animate-pulse">|</span>}
    </>
  );
};

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content:
        "Hello! I'm your social data analysis assistant. Ask me questions about the analyzed data or request insights.",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    // Add the user's message to the chat
    const userMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const data = await sendChatMessage(inputMessage);
      console.log(data);

      const botResponse = {
        role: "bot",
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error("Error:", error);

      const errorMessage = {
        role: "bot",
        content: "Sorry, I couldn't process your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    return new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(date);
  };

  const formatMessageContent = (content) => {
    const formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n/g, "<br />");

    return formattedContent;
  };

  return (
    <div className="flex flex-col h-[500px] bg-slate-50 dark:bg-slate-800/30 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-medium text-slate-900 dark:text-white">
              Data Insights Bot
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Powered by AI
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs text-green-500 dark:text-green-400">
            Online
          </span>
        </div>
      </div>

      {/* Chat messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex gap-3 max-w-[80%] ${
                    message.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500"
                        : "bg-gradient-to-r from-rose-400 to-pink-500"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="h-4 w-4 text-white" />
                    ) : (
                      <Bot className="h-4 w-4 text-white" />
                    )}
                  </div>

                  <div>
                    <div
                      className={`p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-indigo-100 dark:bg-indigo-900/40 text-slate-800 dark:text-slate-100"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm"
                      }`}
                    >
                      {message.role === "bot" &&
                      index === messages.length - 1 &&
                      !isTyping ? (
                        <TypewriterEffect text={message.content} />
                      ) : (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: formatMessageContent(message.content),
                          }}
                        />
                      )}
                    </div>
                    <div
                      className={`mt-1 text-xs text-slate-500 ${
                        message.role === "user" ? "text-right" : ""
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="flex gap-3 max-w-[80%]">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>

                  <div>
                    <div className="p-3 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-sm">
                      <div className="flex space-x-1">
                        <div
                          className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-slate-500">Typing...</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your social data analysis..."
            className="flex-1"
            disabled={isTyping}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isTyping}
            className="bg-rose-500 hover:bg-rose-600 text-white"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
          Ask questions like "What trends do you see in this data?" or
          "Summarize the key insights"
        </div>
      </div>
    </div>
  );
}
