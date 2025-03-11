import { useState } from "react";
import { sendChatMessage } from "../utils/api";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SendIcon, RefreshCw } from "lucide-react";

const Chatbot = () => {
  const [message, setMessage] = useState("");
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async (e) => {
    e?.preventDefault();

    if (!message.trim()) return;

    try {
      setLoading(true);

      const userMessage = { sender: "user", text: message };
      setConversations((prev) => [...prev, userMessage]);
      setMessage("");

      // Send to API
      const { response: botResponse } = await sendChatMessage(message);

      // Add bot response to conversation
      const botMessage = { sender: "bot", text: botResponse };
      setConversations((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        sender: "bot",
        text: "Sorry, I encountered an error. Please try again later.",
        isError: true,
      };
      setConversations((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-gray-50 rounded-lg">
        {conversations.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-400">
            Ask a question about the data analysis...
          </div>
        ) : (
          <div className="space-y-4">
            {conversations.map((msg, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg max-w-3/4 ${
                  msg.sender === "user"
                    ? "ml-auto bg-blue-500 text-white"
                    : msg.isError
                    ? "bg-red-100 text-red-700"
                    : "bg-white border border-gray-200 shadow-sm"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="relative">
        <Input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about the analysis results..."
          className="pr-24 py-6 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          disabled={loading}
        />
        <Button
          type="submit"
          className="absolute right-1 top-1 bottom-1 bg-blue-600 hover:bg-blue-700"
          disabled={loading || !message.trim()}
        >
          {loading ? (
            <RefreshCw className="h-5 w-5 animate-spin" />
          ) : (
            <>
              Send <SendIcon className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </div>
  );
};

export default Chatbot;
