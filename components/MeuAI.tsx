import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const STORAGE_KEY = 'meuai_chat_history';

export default function MeuAI() {
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load messages from local storage on component mount
    if (typeof window !== 'undefined') {
      const savedMessages = localStorage.getItem(STORAGE_KEY);
      return savedMessages ? JSON.parse(savedMessages) : [];
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save messages to local storage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPENROUTER_API_KEY}`,
          "HTTP-Referer": window.location.origin,
          "X-Title": "MeuChat",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "meta-llama/llama-3.3-8b-instruct:free",
          "messages": [
            ...messages.map(msg => ({
              role: msg.role,
              content: msg.content
            })),
            {
              role: "user",
              content: input.trim()
            }
          ]
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]?.message) {
        const aiMessage: Message = {
          role: 'assistant',
          content: data.choices[0].message.content
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message to AI:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add clear chat function
  const clearChat = () => {
    setMessages([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col justify-end overflow-hidden w-full">
        {/* Messages */}
        <div className="overflow-y-auto px-3 sm:px-4 space-y-4 scrollbar-hide pb-4 md:pb-4 pb-20 h-[calc(100vh-8rem)] w-full">
          {messages.length > 0 && (
            <div className="flex justify-end mb-4">
              <button
                onClick={clearChat}
                className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200 bg-white/5 rounded-lg transition-colors duration-200"
              >
                Clear Chat
              </button>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} mb-1.5 group w-full`}
            >
              <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'} max-w-[90%] sm:max-w-[80%] md:max-w-[70%]`}>
                <div
                  className={`rounded-lg p-2 sm:p-3 text-sm ${
                    message.role === 'user'
                      ? 'bg-violet-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  } min-w-[80px] min-h-[32px] flex items-center flex-col items-start w-full break-words`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start mb-1.5 group w-full">
              <div className="flex flex-col items-start max-w-[90%] sm:max-w-[80%] md:max-w-[70%]">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-2 sm:p-3 text-sm text-gray-900 dark:text-white min-w-[80px] min-h-[32px] flex items-center">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSendMessage} className="px-3 sm:px-4 py-3 border-t border-white/10 bg-white/5 backdrop-blur-lg sticky bottom-0 w-full">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 