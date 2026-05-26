"use client";

import { useEffect, useState, useRef } from "react";

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
}

interface ChatDrawerProps {
  receiverId: string;
  receiverName: string;
  onClose: () => void;
}

export default function ChatDrawer({ receiverId, receiverName, onClose }: ChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<any>(null);

  const currentUser = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "{}") : {};
  const currentUserId = currentUser.id;

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/messages/${receiverId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load chat history");
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  useEffect(() => {
    fetchMessages();
    // Poll every 2.5 seconds
    pollInterval.current = setInterval(fetchMessages, 2500);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [receiverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setLoading(true);
    setError("");
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("http://localhost:5000/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId,
          content: inputText
        })
      });

      if (res.ok) {
        setInputText("");
        fetchMessages();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send message");
      }
    } catch (err) {
      console.error(err);
      setError("Network error sending message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
            {receiverName}
          </h3>
          <p className="text-xs text-slate-400">Direct Chat</p>
        </div>
        <button 
          onClick={onClose} 
          className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-900/50">
        {error && (
          <div className="bg-red-950/50 border border-red-900 text-red-400 p-3 rounded-xl text-sm">
            ⚠️ {error}
          </div>
        )}

        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
            <span className="text-4xl mb-2">💬</span>
            <p className="font-semibold text-slate-400">No messages yet</p>
            <p className="text-xs text-slate-500 mt-1">Start the conversation by sending a message below.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div 
                key={msg.id} 
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div 
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-md ${
                    isMe 
                      ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-tr-none" 
                      : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  <span className={`block text-[10px] mt-1 text-right ${isMe ? "text-orange-100" : "text-slate-400"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={loading}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white px-5 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
