import { Plus, Trash2 } from 'lucide-react';

const Sidebar = ({ history, loadSession, handleNewChat, currentSessionId, deleteSession }) => {
    return (
        <div className="w-72 h-full bg-slate-50 dark:bg-black border-r border-gray-200 dark:border-gray-900 flex flex-col transition-colors duration-300">
            <div className="p-4 pt-6">
                <button
                    onClick={handleNewChat}
                    className="flex items-center justify-start gap-3 bg-gray-200/50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium py-3 px-5 rounded-full transition-all duration-300 border-none w-max"
                >
                    <Plus size={20} />
                    <span className="text-sm">New chat</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-300 mb-2 px-6">
                    Chats
                </div>

                <div className="space-y-0.5 px-3">
                    {history.length === 0 ? (
                        <div className="text-sm text-gray-500 px-3 italic py-4">No chat history yet</div>
                    ) : (
                        history.map((chat) => (
                            <div
                                key={chat.sessionId}
                                onClick={() => loadSession(chat.sessionId)}
                                className={`w-full text-left px-4 py-2.5 rounded-full transition-all duration-300 cursor-pointer group flex items-center justify-between gap-3 ${currentSessionId === chat.sessionId ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
                            >
                                <div className="flex-1 overflow-hidden">
                                    <div className="truncate text-sm">
                                        {chat.message}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm("Are you sure you want to delete this chat permanently?")) {
                                            deleteSession(chat.sessionId);
                                        }
                                    }}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded-full hover:bg-white dark:hover:bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex-shrink-0 focus:outline-none"
                                    title="Delete chat"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
