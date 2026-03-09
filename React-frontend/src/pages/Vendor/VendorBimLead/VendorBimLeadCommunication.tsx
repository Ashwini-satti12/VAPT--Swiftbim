import { useState, useEffect } from 'react';
import api from '../../../lib/api';

interface FileUpload {
    id: number;
    file_name: string;
    file_path: string;
    uploaded_by: number;
    uploaded_by_name: string;
    uploaded_at: string;
}

interface Message {
    id: number;
    sender_id: number;
    sender_name: string;
    message_text: string;
    created_at: string;
    ProjectChatFiles?: FileUpload[];
}

interface User {
    id: number;
    full_name: string;
    user_role: string;
    panel_type: number;
}

export default function VendorBimLeadCommunication() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const fetchMessages = () => {
        // Fetching communication data. Assuming a generic chat endpoint for the demonstration.
        // Needs adjustment based on the actual API structure for vendor communication.
        api.get('/api/vendors/communication')
            .then(res => setMessages(res.data.messages || []))
            .catch(() => console.error("Failed to fetch messages"))
            .finally(() => setLoading(false));
    };

    const fetchCurrentUser = () => {
        api.get('/api/users/me')
            .then(res => setCurrentUser(res.data.user))
            .catch(() => console.error("Failed to fetch user info"));
    };


    useEffect(() => {
        fetchCurrentUser();
        fetchMessages();
        // Optional: Set up polling or WebSocket for real-time updates here
    }, []);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!newMessage.trim() && !selectedFile) || sending) return;

        setSending(true);
        try {
            const formData = new FormData();
            formData.append('message_text', newMessage);
            if (selectedFile) {
                formData.append('file', selectedFile);
            }

            // Using a generic post endpoint. 
            await api.post('/api/vendors/communication', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setNewMessage("");
            setSelectedFile(null);
            fetchMessages();
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setSending(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full min-h-[400px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#DD4342]" />
            </div>
        );
    }

    return (
        <div className="bg-white min-h-full font-gantari p-6 flex flex-col h-[calc(100vh-100px)]">
            <div className="mb-6">
                <h2 className="text-[24px] font-semibold text-[#1A1A1A]">Communication</h2>
                <p className="text-sm text-gray-500">Coordinate and chat with your team and partners.</p>
            </div>

            <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col overflow-hidden shadow-inner">

                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar flex flex-col-reverse">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-400 py-10 font-medium my-auto">
                            No messages yet. Start the conversation!
                        </div>
                    ) : (
                        [...messages].reverse().map((msg) => {
                            const isMe = currentUser && msg.sender_id === currentUser.id;
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <span className="text-xs text-gray-400 font-semibold mb-1 px-1">
                                        {msg.sender_name} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${isMe ? 'bg-[#DD4342] text-white rounded-tr-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-sm'}`}>
                                        <p className="text-sm font-medium whitespace-pre-wrap">{msg.message_text}</p>

                                        {msg.ProjectChatFiles && msg.ProjectChatFiles.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-black/10">
                                                {msg.ProjectChatFiles.map(file => (
                                                    <a key={file.id} href={`http://localhost:5000/${file.file_path}`} target="_blank" rel="noopener noreferrer"
                                                        className={`flex items-center gap-2 text-xs font-bold p-2 mb-1 rounded-lg transition-colors ${isMe ? 'bg-black/10 hover:bg-black/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-[#DD4342]'}`}>
                                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                        <span className="truncate">{file.file_name}</span>
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Message Input Area */}
                <div className="bg-white border-t border-gray-200 p-4">
                    {selectedFile && (
                        <div className="mb-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2 max-w-sm">
                            <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <span className="text-xs font-semibold text-gray-700 truncate flex-1">{selectedFile.name}</span>
                            <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-slate-200 rounded text-gray-500 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    )}
                    <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                        <label className="cursor-pointer p-3 text-gray-400 hover:text-[#DD4342] hover:bg-slate-50 rounded-xl transition-all shrink-0 border border-transparent hover:border-slate-200">
                            <input type="file" className="hidden" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </label>

                        <div className="flex-1 relative">
                            <textarea
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSendMessage(e);
                                    }
                                }}
                                placeholder="Type a message... (Press Enter to send)"
                                className="w-full bg-[#F8FAFC] border-none rounded-xl py-3 px-4 focus:ring-2 focus:ring-[#DD4342]/20 outline-none text-[#1E293B] font-medium resize-none text-sm placeholder:text-gray-400"
                                rows={1}
                                style={{ minHeight: '48px', maxHeight: '120px' }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sending || (!newMessage.trim() && !selectedFile)}
                            className="p-3 bg-[#DD4342] text-white rounded-xl hover:bg-[#DD4342]/90 disabled:opacity-50 disabled:hover:bg-[#DD4342] transition-colors shadow-sm shrink-0 flex items-center justify-center min-w-[48px] min-h-[48px]">
                            {sending ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
