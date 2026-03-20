import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import { Send, User, BrainCircuit, Menu, Smile, Mic, Sun, Moon, Settings, Shield, LogOut } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import ZylronLogo from '../logo.png';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import EmojiPicker from 'emoji-picker-react';

const TypewriterMarkdown = ({ text, animate }) => {
    const [displayedText, setDisplayedText] = useState(animate ? '' : text);

    useEffect(() => {
        if (!animate) {
            setDisplayedText(text);
            return;
        }

        setDisplayedText('');
        let i = 0;
        const interval = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 20); // Authentic retro typewriter speed

        return () => clearInterval(interval);
    }, [text, animate]);

    return (
        <ReactMarkdown
            components={{
                code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                        <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-md !my-2"
                            {...props}
                        >
                            {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                    ) : (
                        <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-cyan-300 font-mono text-sm" {...props}>
                            {children}
                        </code>
                    )
                }
            }}
        >
            {displayedText}
        </ReactMarkdown>
    );
};

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false); // Collapsed by default Google Gemini layout
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [theme, setTheme] = useState(localStorage.theme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

    const messagesEndRef = useRef(null);
    const emojiPickerRef = useRef(null);
    const dropdownRef = useRef(null);

    // Sync theme to root HTML
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.theme = 'dark';
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.theme = 'light';
        }
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Your browser does not support the Web Speech API.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;

        recognition.onstart = () => setIsListening(true);

        recognition.onresult = (event) => {
            let currentTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                currentTranscript += event.results[i][0].transcript;
            }
            setInput(currentTranscript);
        };

        recognition.onerror = (event) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => setIsListening(false);

        recognition.start();
    };

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const onEmojiClick = (emojiObject) => {
        setInput(prev => prev + emojiObject.emoji);
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const fetchHistory = async () => {
        try {
            const response = await api.get('/chat/history');
            setHistory(response.data);
            // DO NOT auto-load session per Gemini requirements. Stay on empty state.
        } catch (error) {
            console.error("Failed to fetch history", error);
        }
    };

    const loadSession = async (sessionId) => {
        try {
            setCurrentSessionId(sessionId);
            setIsLoading(true);
            const response = await api.get(`/chat/session/${sessionId}`);
            const formatted = response.data.map(h => [
                { type: 'user', content: h.message, animate: false },
                { type: 'ai', content: h.response, animate: false }
            ]).flat();
            setMessages(formatted);
            if (window.innerWidth < 1024) setSidebarOpen(false);
        } catch (error) {
            console.error("Failed to load session context", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]); 
        
        if (window.innerWidth < 1024) setSidebarOpen(false);
    };

    const handleSignOut = () => {
        localStorage.clear();
        logout();
        window.location.href = '/login';
    };

    const deleteSession = async (sessionId) => {
        setHistory(prevHistory => prevHistory.filter(session => session.sessionId !== sessionId));
        if (currentSessionId === sessionId) {
            startNewChat();
        }
        try {
            await api.delete(`/chat/session/${sessionId}`);
        } catch (error) {
            console.error("Failed to delete session", error);
            fetchHistory();
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { type: 'user', content: userMsg, animate: false }]);
        setIsLoading(true);

        let activeSessionId = currentSessionId;
        if (!activeSessionId) {
            activeSessionId = crypto.randomUUID();
            setCurrentSessionId(activeSessionId);
            // DYNAMIC TITLE GENERATION: Allow CSS truncate to handle visual clipping cleanly
            const shortTitle = userMsg.substring(0, 50);
            setHistory(prev => [{ sessionId: activeSessionId, message: shortTitle, createdAt: new Date().toISOString() }, ...prev]);
        }

        try {
            const response = await api.post('/chat', { message: userMsg, sessionId: activeSessionId });
            setMessages(prev => [...prev, { type: 'ai', content: response.data.response, animate: true }]);
            
            // Re-sync with actual backend titles silently for immediate state updates
            fetchHistory();

            // Background AI Smart Title Sync:
            // If this was the first message in a new session, Llama 3 generates an abstract title asynchronously in the background.
            // We gently re-fetch the history after 4 seconds to smoothly hot-swap the sidebar title without blocking the UI.
            if (messages.length === 0) {
                setTimeout(() => fetchHistory(), 4000);
            }
        } catch (error) {
            const apiErrorMsg = error.response?.data?.message || 'An error occurred while connecting to the AI. Please try again later.';
            setMessages(prev => [...prev, { type: 'error', content: apiErrorMsg }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-white dark:bg-black text-black dark:text-white font-sans selection:bg-emerald-200 dark:selection:bg-cyan-500/30 transition-colors duration-300">
            
            {/* Fixed Overlay Sidebar */}
            <div className={`fixed z-40 inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition duration-300 ease-in-out shadow-2xl`}>
                <Sidebar history={history} loadSession={loadSession} handleNewChat={handleNewChat} currentSessionId={currentSessionId} deleteSession={deleteSession} />
            </div>

            {/* Click outside to close sidebar overlay on smaller screens or just let user click hamburger */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-30 transition-opacity backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Main view container */}
            <div className={`flex-1 flex flex-col h-full relative transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : 'ml-0'}`}>
                
                {/* Top Nav Header - Gemini Style */}
                <div className="sticky top-0 z-20 h-16 w-full bg-white/80 dark:bg-black/50 backdrop-blur-xl border-b border-gray-200 dark:border-gray-900 flex items-center justify-between px-4 sm:px-6 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSidebarOpen(!sidebarOpen)} 
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 transition-all focus:outline-none"
                        >
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-2 lg:gap-3 text-emerald-600 dark:text-cyan-400 font-bold text-xl drop-shadow-sm dark:drop-shadow-[0_0_5px_rgba(0,255,255,0.5)]">
                            <img src={ZylronLogo} alt="Zylron AI Logo" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full shadow-md object-cover mr-1" />
                            Zylron AI
                        </div>
                    </div>

                    <div className="flex items-center gap-3 relative" ref={dropdownRef}>
                        <button 
                            onClick={toggleTheme} 
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500 dark:text-gray-400 transition-all focus:outline-none"
                            title="Toggle Theme"
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        
                        <button 
                            onClick={() => setDropdownOpen(!dropdownOpen)} 
                            className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-black border border-emerald-300 dark:border-cyan-500/50 flex items-center justify-center font-bold text-emerald-700 dark:text-cyan-400 shadow-sm dark:shadow-[0_0_8px_rgba(0,255,255,0.3)] transition-all hover:scale-105 focus:outline-none"
                        >
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                        </button>
                        
                        {/* Profile Dropdown */}
                        {dropdownOpen && (
                            <div className="absolute top-12 right-0 w-56 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden py-2 focus:outline-none transition-all z-50">
                                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 mb-1">
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</div>
                                </div>
                                <button onClick={() => alert("This feature is currently under development!")} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"><User size={16} /> Profile</button>
                                <button onClick={() => alert("This feature is currently under development!")} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"><Settings size={16} /> Settings</button>
                                <button onClick={() => alert("This feature is currently under development!")} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"><Shield size={16} /> Privacy Policy</button>
                                <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
                                <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"><LogOut size={16} /> Sign Out</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
                    {messages.length === 0 ? (
                        /* Empty Welcoming State (Gemini Style) */
                        <div className="h-full flex flex-col items-center justify-center p-8 -mt-10 animate-fade-in">
                            <div className="w-16 h-16 rounded-3xl bg-white dark:bg-black border border-emerald-200 dark:border-cyan-500/30 flex items-center justify-center mb-6 shadow-lg dark:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all duration-300 hover:scale-105 overflow-hidden">
                                <img src={ZylronLogo} alt="Zylron AI Logo" className="w-full h-full object-cover" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-800 dark:from-cyan-400 dark:to-blue-500 mb-3 text-center transition-all duration-300">
                                Hello, {user?.name?.split(' ')[0] || 'there'}
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md text-lg">
                                How can I help you today? Ask me any question, write code, or just chat.
                            </p>
                        </div>
                    ) : (
                        /* Active Chat Log */
                        <div className="space-y-6 pb-20">
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] md:max-w-3xl flex gap-4 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                        
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 overflow-hidden ${msg.type === 'user' ? 'bg-emerald-100 dark:bg-black border border-emerald-300 dark:border-cyan-500/80 shadow-sm dark:shadow-[0_0_15px_rgba(0,255,255,0.4)]' : msg.type === 'error' ? 'bg-red-100 dark:bg-red-600' : 'bg-gray-100 dark:bg-black border border-gray-300 dark:border-cyan-500/30 shadow-sm dark:shadow-[0_0_10px_rgba(0,255,255,0.2)]'}`}>
                                            {msg.type === 'user' ? <User size={20} className="text-emerald-700 dark:text-cyan-400 dark:drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" /> : <img src={ZylronLogo} alt="Zylron AI" className="h-8 w-8 rounded-full object-cover" />}
                                        </div>

                                        <div className={`px-5 py-4 rounded-3xl overflow-hidden transition-all duration-300 ${msg.type === 'user'
                                            ? 'bg-emerald-50 dark:bg-black border border-gray-200 dark:border-cyan-500/60 text-black dark:text-white rounded-tr-sm shadow-sm dark:shadow-[0_0_15px_rgba(0,255,255,0.2)]'
                                            : msg.type === 'error'
                                                ? 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 text-red-600 dark:text-red-400 shadow-sm dark:shadow-[0_0_15px_rgba(239,68,68,0.2)] rounded-tl-sm'
                                                : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-black dark:text-white rounded-tl-sm shadow-sm dark:shadow-lg'
                                            }`}>
                                            {msg.type === 'user' ? (
                                                <p className="whitespace-pre-wrap leading-relaxed">
                                                    {msg.content}
                                                </p>
                                            ) : (
                                                <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed prose-p:leading-relaxed prose-a:text-emerald-600 dark:prose-a:text-cyan-400 drop-shadow-none dark:drop-shadow-sm">
                                                    <TypewriterMarkdown text={msg.content} animate={msg.animate} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="max-w-[85%] md:max-w-3xl flex gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-black border border-gray-200 dark:border-cyan-500/30 flex items-center justify-center shrink-0 shadow-sm dark:shadow-[0_0_10px_rgba(0,255,255,0.2)] transition-all duration-300 overflow-hidden">
                                            <img src={ZylronLogo} alt="Zylron AI" className="h-8 w-8 rounded-full object-cover animate-pulse" />
                                        </div>
                                        <div className="px-5 py-4 rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm flex items-center gap-2 shadow-sm dark:shadow-lg">
                                            <div className="typing-dot w-2 h-2 rounded-full bg-gray-400 dark:bg-cyan-500 dark:shadow-[0_0_8px_rgba(0,255,255,0.8)]"></div>
                                            <div className="typing-dot w-2 h-2 rounded-full bg-gray-400 dark:bg-cyan-500 dark:shadow-[0_0_8px_rgba(0,255,255,0.8)]"></div>
                                            <div className="typing-dot w-2 h-2 rounded-full bg-gray-400 dark:bg-cyan-500 dark:shadow-[0_0_8px_rgba(0,255,255,0.8)]"></div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Glassmorphism Input Area */}
                <div className="p-4 bg-transparent relative z-10 w-full">
                    <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative group flex items-end sm:items-center gap-2 sm:gap-3 flex-col sm:flex-row">
                        <div className="relative flex-1 flex items-center w-full bg-white/80 dark:bg-gray-900/50 backdrop-blur-xl border border-gray-200 dark:border-gray-800/50 rounded-2xl shadow-sm dark:shadow-[0_0_10px_rgba(0,255,255,0.1)] focus-within:shadow-md dark:focus-within:shadow-[0_0_20px_rgba(0,255,255,0.3)] focus-within:border-emerald-300 dark:focus-within:border-cyan-500/50 transition-all duration-300">
                            {showEmojiPicker && (
                                <div className="absolute bottom-full left-0 mb-3 z-50 shadow-xl dark:shadow-[0_0_30px_rgba(0,0,0,0.8)] rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                                    <EmojiPicker theme={theme === 'dark' ? 'dark' : 'light'} onEmojiClick={onEmojiClick} />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="pl-4 pr-2 text-gray-400 hover:text-emerald-500 dark:hover:text-cyan-400 transition-all duration-300 z-10 drop-shadow-none dark:hover:drop-shadow-[0_0_8px_rgba(0,255,255,0.5)] focus:outline-none"
                            >
                                <Smile size={24} />
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Message Zylron..."
                                className="w-full bg-transparent text-gray-800 dark:text-gray-100 py-4 px-3 focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 text-base"
                                disabled={isLoading}
                            />
                            
                            <button
                                type="button"
                                onClick={startListening}
                                className={`p-2 mr-2 rounded-full transition-all duration-300 focus:outline-none ${isListening ? 'text-red-500 dark:text-cyan-400 bg-red-50 dark:bg-cyan-400/10 animate-pulse shadow-sm dark:shadow-[0_0_20px_rgba(0,255,255,0.6)]' : 'text-gray-400 hover:text-emerald-500 dark:hover:text-cyan-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:shadow-sm dark:hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]'}`}
                                title="Use Microphone"
                            >
                                <Mic size={24} className={isListening ? "drop-shadow-none dark:drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" : ""} />
                            </button>
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="p-4 rounded-2xl bg-emerald-600 dark:bg-black border border-emerald-500 dark:border-cyan-500/50 hover:bg-emerald-500 dark:hover:bg-cyan-950 text-white dark:text-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-md dark:shadow-[0_0_10px_rgba(0,255,255,0.2)] hover:shadow-lg dark:hover:shadow-[0_0_20px_rgba(0,255,255,0.5)] flex-shrink-0 focus:outline-none w-full sm:w-auto flex justify-center"
                        >
                            <Send size={24} className="drop-shadow-none dark:drop-shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
                        </button>
                    </form>
                    <p className="text-center text-xs text-gray-500 dark:text-gray-600 mt-3 font-medium tracking-wide">Zylron AI may display inaccurate info, so double-check its responses.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
