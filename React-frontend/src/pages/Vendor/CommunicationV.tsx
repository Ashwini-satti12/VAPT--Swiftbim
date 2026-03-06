import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';

type ContextType = 'opportunity' | 'proposal' | 'contract' | 'general';

type Thread = {
    id: number;
    context_type: ContextType;
    context_id: number | null;
    subject: string;
    updated_at: string;
    last_message: { message: string; sent_at: string; sender_type: string } | null;
};

type Message = {
    id: number;
    sender_type: 'vendor' | 'staff';
    sender_name?: string;
    sender_role?: string;
    message: string;
    attachment_url: string | null;
    sent_at: string;
};

const CTX_COLORS: Record<ContextType, { bg: string; text: string; label: string }> = {
    opportunity: { bg: '#EFF6FF', text: '#1565C0', label: 'Opportunity' },
    proposal: { bg: '#FFF3E0', text: '#E65100', label: 'Proposal' },
    contract: { bg: '#F0FDF4', text: '#15803D', label: 'Contract' },
    general: { bg: '#F2F2F2', text: '#717171', label: 'General' },
};

function timeAgo(s: string) {
    const d = (Date.now() - new Date(s).getTime()) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return new Date(s).toLocaleDateString();
}

export default function CommunicationV() {
    const [threadsLoading, setThreadsLoading] = useState(true);
    const [threads, setThreads] = useState<Thread[]>([]);
    const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [msgLoading, setMsgLoading] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [sending, setSending] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [newSubject, setNewSubject] = useState('');
    const [newContextType, setNewContextType] = useState<ContextType>('general');
    const [newContextId, setNewContextId] = useState('');
    const [creating, setCreating] = useState(false);
    const [filterCtx, setFilterCtx] = useState<ContextType | 'all'>('all');
    const bottomRef = useRef<HTMLDivElement>(null);
    const attachRef = useRef<HTMLInputElement>(null);

    const fetchThreads = () =>
        api.get<{ threads: Thread[] }>('/api/vendors/threads')
            .then(({ data }) => setThreads(data.threads ?? []))
            .catch(() => { })
            .finally(() => setThreadsLoading(false));

    useEffect(() => { fetchThreads(); }, []);

    const loadMessages = async (thread: Thread) => {
        setSelectedThread(thread);
        setMsgLoading(true);
        try {
            const { data } = await api.get<{ messages: Message[] }>(`/api/vendors/threads/${thread.id}/messages`);
            setMessages(data.messages ?? []);
        } catch { } finally { setMsgLoading(false); }
    };

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // 5-second polling
    useEffect(() => {
        if (!selectedThread) return;
        const id = setInterval(async () => {
            try {
                const { data } = await api.get<{ messages: Message[] }>(`/api/vendors/threads/${selectedThread.id}/messages`);
                setMessages(data.messages ?? []);
            } catch { }
        }, 5000);
        return () => clearInterval(id);
    }, [selectedThread?.id]);

    const handleSend = async () => {
        if (!selectedThread || (!messageText.trim() && !attachRef.current?.files?.[0])) return;
        setSending(true);
        try {
            const file = attachRef.current?.files?.[0];
            if (file) {
                const fd = new FormData();
                fd.append('message', messageText);
                fd.append('attachment', file);
                await api.post(`/api/vendors/threads/${selectedThread.id}/messages`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                if (attachRef.current) attachRef.current.value = '';
            } else {
                await api.post(`/api/vendors/threads/${selectedThread.id}/messages`, { message: messageText });
            }
            setMessageText('');
            const { data } = await api.get<{ messages: Message[] }>(`/api/vendors/threads/${selectedThread.id}/messages`);
            setMessages(data.messages ?? []);
            fetchThreads();
        } catch { } finally { setSending(false); }
    };

    const handleCreate = async () => {
        if (!newSubject.trim()) return;
        setCreating(true);
        try {
            await api.post('/api/vendors/threads', { subject: newSubject, context_type: newContextType, context_id: newContextId ? Number(newContextId) : null });
            setShowNew(false); setNewSubject(''); setNewContextType('general'); setNewContextId('');
            fetchThreads();
        } catch { } finally { setCreating(false); }
    };

    const filtered = threads.filter(t => filterCtx === 'all' || t.context_type === filterCtx);

    const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-gantari text-[#353535] focus:outline-none focus:ring-2 focus:ring-[#DE3D3A]/20";

    return (
        <div className="h-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 shrink-0">
                <div>
                    <h1 className="text-xl font-medium font-gantari text-slate-800">Communication Center</h1>
                    <p className="text-xs text-[#717171] font-gantari mt-0.5">Restricted to TD, Coordinator & PM only</p>
                </div>
                <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-[#DE3D3A] text-white text-sm font-semibold font-gantari rounded-lg hover:bg-[#c93d3d]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    New Thread
                </button>
            </div>

            {showNew && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-bold font-gantari text-[#353535]">New Thread</h3>
                            <button onClick={() => setShowNew(false)} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
                        </div>
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-semibold font-gantari text-[#717171] mb-1">Context Type</label>
                                <select value={newContextType} onChange={e => setNewContextType(e.target.value as ContextType)} className={inputCls}>
                                    {(['general', 'opportunity', 'proposal', 'contract'] as ContextType[]).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                                </select>
                            </div>
                            {newContextType !== 'general' && (
                                <div>
                                    <label className="block text-xs font-semibold font-gantari text-[#717171] mb-1">{newContextType} ID</label>
                                    <input type="number" value={newContextId} onChange={e => setNewContextId(e.target.value)} placeholder="Enter ID" className={inputCls} />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold font-gantari text-[#717171] mb-1">Subject <span className="text-[#DE3D3A]">*</span></label>
                                <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="What is this thread about?" className={inputCls} />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setShowNew(false)} className="flex-1 py-2.5 bg-[#F2F2F2] text-[#353535] rounded-lg font-semibold font-gantari text-sm hover:bg-slate-200">Cancel</button>
                            <button onClick={handleCreate} disabled={creating || !newSubject.trim()} className="flex-1 py-2.5 bg-[#DE3D3A] text-white rounded-lg font-semibold font-gantari text-sm hover:bg-[#c93d3d] disabled:opacity-60">
                                {creating ? 'Creating…' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 overflow-hidden">
                {/* Thread list */}
                <div className="lg:col-span-1 flex flex-col bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
                    <div className="flex gap-1 p-3 border-b border-[#F0F0F0] shrink-0 flex-wrap">
                        {(['all', 'opportunity', 'proposal', 'contract', 'general'] as const).map(c => (
                            <button key={c} onClick={() => setFilterCtx(c)}
                                className={`px-2.5 py-1 text-[11px] font-semibold font-gantari rounded-full transition-colors ${filterCtx === c ? 'bg-[#353535] text-white' : 'bg-[#F2F2F2] text-[#717171] hover:bg-slate-200'}`}>
                                {c.charAt(0).toUpperCase() + c.slice(1)}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {threadsLoading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#DE3D3A]" /></div>
                            : filtered.length === 0 ? <p className="text-sm text-[#AEACAC] font-gantari text-center py-12">No threads yet</p>
                                : filtered.map(t => {
                                    const ctx = CTX_COLORS[t.context_type];
                                    return (
                                        <button key={t.id} onClick={() => loadMessages(t)}
                                            className={`w-full text-left px-4 py-3.5 border-b border-[#F8F8F8] transition-colors ${selectedThread?.id === t.id ? 'bg-[#FFF5F5]' : 'hover:bg-[#FAFAFA]'}`}>
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <p className="text-sm font-bold font-gantari text-[#353535] truncate flex-1">{t.subject}</p>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: ctx.bg, color: ctx.text }}>{ctx.label}</span>
                                            </div>
                                            <p className="text-xs text-[#717171] font-gantari truncate">{t.last_message?.message || 'No messages yet'}</p>
                                            <p className="text-[11px] text-[#AEACAC] font-gantari mt-1">{timeAgo(t.updated_at)}</p>
                                        </button>
                                    );
                                })}
                    </div>
                </div>

                {/* Message pane */}
                <div className="lg:col-span-2 flex flex-col bg-white border border-[#EBEBEB] rounded-xl overflow-hidden">
                    {!selectedThread ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-[#F8F8F8] flex items-center justify-center mb-4">
                                <svg className="w-8 h-8 text-[#AEACAC]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            </div>
                            <p className="text-base font-semibold font-gantari text-[#353535] mb-1">Select a thread</p>
                            <p className="text-sm text-[#717171] font-gantari">Choose from the left to view messages</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 px-5 py-3 border-b border-[#F0F0F0] shrink-0">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold font-gantari text-[#353535] truncate">{selectedThread.subject}</p>
                                    <p className="text-xs text-[#717171] font-gantari">{CTX_COLORS[selectedThread.context_type].label}{selectedThread.context_id ? ` #${selectedThread.context_id}` : ''}</p>
                                </div>
                                <span className="text-[10px] font-semibold font-gantari text-[#E65100] bg-[#FFF3E0] px-2.5 py-1 rounded-full">🔒 Restricted</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-5 space-y-3">
                                {msgLoading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#DE3D3A]" /></div>
                                    : messages.length === 0 ? <p className="text-center text-sm text-[#AEACAC] font-gantari py-12">No messages yet.</p>
                                        : messages.map(msg => {
                                            const isV = msg.sender_type === 'vendor';
                                            return (
                                                <div key={msg.id} className={`flex ${isV ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-[72%] rounded-2xl px-4 py-3 ${isV ? 'bg-[#DE3D3A] text-white rounded-br-md' : 'bg-[#F2F2F2] text-[#353535] rounded-bl-md'}`}>
                                                        {!isV && <p className="text-[10px] font-bold mb-1 text-[#E47E00]">{msg.sender_name} · {msg.sender_role}</p>}
                                                        {msg.message && <p className="text-sm font-gantari leading-relaxed">{msg.message}</p>}
                                                        {msg.attachment_url && <a href={msg.attachment_url} target="_blank" rel="noreferrer" className={`flex items-center gap-1 mt-1.5 text-[11px] font-semibold underline ${isV ? 'text-white/80' : 'text-[#3B82F6]'}`}>📎 Attachment ↗</a>}
                                                        <p className={`text-[10px] mt-1.5 ${isV ? 'text-white/60' : 'text-[#AEACAC]'}`}>{new Date(msg.sent_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                <div ref={bottomRef} />
                            </div>
                            <div className="border-t border-[#F0F0F0] p-4 shrink-0">
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-[#DE3D3A]/20 overflow-hidden">
                                        <textarea value={messageText} onChange={e => setMessageText(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                                            placeholder="Type your message…" rows={2}
                                            className="w-full px-4 py-3 text-sm font-gantari text-[#353535] focus:outline-none resize-none" />
                                        <div className="flex items-center gap-2 px-3 pb-2">
                                            <label className="cursor-pointer text-[#AEACAC] hover:text-[#717171]" title="Attach file">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                                <input ref={attachRef} type="file" className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                    <button onClick={handleSend} disabled={sending || !messageText.trim()} className="p-3 bg-[#DE3D3A] text-white rounded-xl hover:bg-[#c93d3d] disabled:opacity-50 shrink-0">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
