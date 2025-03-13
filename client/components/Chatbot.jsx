import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, ChevronDown } from "lucide-react";
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

const predefinedPrompts = [
  "Which subreddit has the highest percentage of negative/positive posts?",
  "What is the opinion on Donald Trump and give the response in one sentence?",
  "Which topics saw a sudden spike in discussion?",
  "What are the trending keywords across multiple subreddits?",
  "What topics are frequently mentioned with 'AI' in tech-related subreddits?",
];

export default function Chatbot() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      content:
        "Hello! I'm your social data analysis assistant. Ask me questions about the social media data or use one of the quick prompts below.",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollAreaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (message = inputMessage) => {
    if (!message.trim()) return;

    const userMessage = {
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const data = await sendChatMessage(message);

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

  const handlePredefinedPrompt = (prompt) => {
    setInputMessage(prompt);
    handleSendMessage(prompt);
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
    <div className="flex flex-col h-[1000px] bg-slate-50 dark:bg-slate-800/30 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-lg">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Data Insights Assistant</h3>
            <p className="text-xs text-indigo-100">Powered by Llama3-8b</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          <span className="text-xs text-white font-medium">Online</span>
        </div>
      </div>

      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-indigo-500" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Quick Prompts:
          </p>
        </div>
        <div className="grid grid-cols-5 max-sm:grid-cols-5 gap-2">
          {predefinedPrompts.map((prompt, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs bg-white dark:bg-slate-700 border-indigo-200 dark:border-slate-600 hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 text-slate-700 dark:text-slate-200 justify-start h-auto py-2 text-left"
              onClick={() => handlePredefinedPrompt(prompt)}
              disabled={isTyping}
            >
              <span className="line-clamp-2">{prompt}</span>

              <ChevronDown className="-rotate-90" />
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 overflow-y-scroll" ref={scrollAreaRef}>
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
                        : "bg-gradient-to-r from-red-400 to-red-500"
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
                      className={`p-3 rounded-lg shadow-sm ${
                        message.role === "user"
                          ? "bg-indigo-100 dark:bg-indigo-900/40 text-slate-800 dark:text-slate-100"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
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
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-red-400 to-red-500 flex items-center justify-center flex-shrink-0">
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

      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your social data analysis..."
            className="h-12 flex-1 border-indigo-200 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
            disabled={isTyping}
          />
          <Button
            onClick={() => handleSendMessage()}
            disabled={!inputMessage.trim() || isTyping}
            className="h-12 w-12 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all"
          >
            {isTyping ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
          Use prompts above or ask custom questions about social media data
          analysis
        </div>
      </div>
    </div>
  );
}
