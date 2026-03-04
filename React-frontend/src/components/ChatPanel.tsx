import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import alertIcon from "../assets/Chat/icon.svg";
import sendIcon from "../assets/Chat/sendicon.svg";
import videoIcon from "../assets/Chat/video.svg";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Contact {
    id: number;
    name: string;
    user_role?: string;
    profile_picture?: string | null;
    status?: string;
    isOnline?: boolean;
    lastMessage?: string | null;
    lastMsgTime?: string | null;
}

type MessageAttachment = {
    name: string;
    url?: string;
    type: "image" | "file";
};

type MessageItem = {
    id: string;
    text: string;
    sender: "user" | "contact";
    time: string;
    attachments?: MessageAttachment[];
};

interface ChatPanelProps {
    /** 'employee' for all employee roles, 'client' for client portal */
    userType: "employee" | "client";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(isoOrDate: string | Date): string {
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function formatDate(isoOrDate: string | Date): string {
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/** Show time if today, else show short date */
function formatContactTime(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return formatTime(d);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const IconSearch = () => (
    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const IconPaperclip = () => (
    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
);

const IconReply = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
);

const IconCopy = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const IconForward = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
);

function Avatar({ name, src, className = "w-10 h-10" }: { name: string; src?: string | null; className?: string }) {
    const initial = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    if (src) {
        const url = src.startsWith("http") ? src : `/uploads/${src}`;
        return (
            <img
                src={url}
                alt={name}
                className={`${className} rounded-full object-cover shrink-0`}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = ""; }}
            />
        );
    }
    return (
        <div className={`${className} rounded-full bg-slate-300 flex items-center justify-center text-slate-600 font-semibold text-sm shrink-0`}>
            {initial}
        </div>
    );
}

function AttachmentPreview({ file }: { file: File }) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!file.type.startsWith("image/")) return;
        const u = URL.createObjectURL(file);
        const id = requestAnimationFrame(() => setUrl(u));
        return () => { cancelAnimationFrame(id); URL.revokeObjectURL(u); };
    }, [file]);
    if (!file.type.startsWith("image/"))
        return <span className="w-10 h-10 shrink-0 bg-slate-200 flex items-center justify-center rounded-l-lg"><IconPaperclip /></span>;
    if (!url) return <span className="w-12 h-12 shrink-0 bg-slate-200 animate-pulse" />;
    return (
        <span className="w-12 h-12 shrink-0 bg-slate-200 flex items-center justify-center overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" />
        </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatPanel({ userType }: ChatPanelProps) {
    const { user } = useAuth();
    const [search, setSearch] = useState("");
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [contactsLoading, setContactsLoading] = useState(true);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [inputMessage, setInputMessage] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [sending, setSending] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; messageId: string } | null>(null);
    const [isVideoCallActive, setIsVideoCallActive] = useState(false);
    const [videoCallError, setVideoCallError] = useState<string | null>(null);
    const [isMutedVideo, setIsMutedVideo] = useState(false);
    const [isMutedAudio, setIsMutedAudio] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastMessageIdRef = useRef<number>(0);

    // ── Fetch contacts ──────────────────────────────────────────────────────────
    useEffect(() => {
        setContactsLoading(true);
        api.get<{ contacts: Array<{ id: number; full_name: string; user_role?: string; profile_picture?: string | null; status?: string; last_message?: string | null; last_msg_time?: string | null }> }>("/api/chat/contacts")
            .then(({ data }) => {
                const mapped: Contact[] = (data.contacts || []).map((c) => ({
                    id: c.id,
                    name: c.full_name,
                    user_role: c.user_role,
                    profile_picture: c.profile_picture,
                    status: c.status,
                    isOnline: c.status === "Online",
                    lastMessage: c.last_message,
                    lastMsgTime: c.last_msg_time,
                }));
                setContacts(mapped);
                if (mapped.length > 0 && !selectedContact) {
                    setSelectedContact(mapped[0]);
                }
            })
            .catch(() => { /* fail silently */ })
            .finally(() => setContactsLoading(false));
    }, []);

    // ── Fetch conversation history ──────────────────────────────────────────────
    const loadConversation = useCallback(async (contactId: number) => {
        setMessagesLoading(true);
        try {
            const { data } = await api.get<{ messages: Array<{ id: number; outgoing: number; message: string; date: string }> }>(
                `/api/chat/conversation/${contactId}`
            );
            // Use Number() comparison to avoid type mismatch (DB may return string, auth returns number)
            const myId = Number(user?.id);
            const mapped: MessageItem[] = (data.messages || []).map((m) => ({
                id: String(m.id),
                text: m.message ?? "",
                sender: Number(m.outgoing) === myId ? "user" : "contact",
                time: formatTime(m.date),
            }));
            setMessages(mapped);
            if (mapped.length > 0) {
                lastMessageIdRef.current = parseInt(mapped[mapped.length - 1].id, 10);
            } else {
                lastMessageIdRef.current = 0;
            }
        } catch {
            setMessages([]);
        } finally {
            setMessagesLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (!selectedContact) return;
        loadConversation(selectedContact.id);
    }, [selectedContact, loadConversation]);

    // ── Polling for new messages ────────────────────────────────────────────────
    useEffect(() => {
        if (!selectedContact) return;

        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

        pollIntervalRef.current = setInterval(async () => {
            const lastId = lastMessageIdRef.current;
            try {
                const { data } = await api.get<{ messages: Array<{ id: number; outgoing: number; message: string; date: string }> }>(
                    `/api/chat/conversation/${selectedContact.id}/since/${lastId}`
                );
                const myId = Number(user?.id);
                const newMsgs = (data.messages || []);
                if (newMsgs.length > 0) {
                    const mapped: MessageItem[] = newMsgs.map((m) => ({
                        id: String(m.id),
                        text: m.message ?? "",
                        sender: Number(m.outgoing) === myId ? "user" : "contact",
                        time: formatTime(m.date),
                    }));
                    setMessages((prev) => {
                        const existingIds = new Set(prev.map((x) => x.id));
                        const fresh = mapped.filter((m) => !existingIds.has(m.id));
                        return fresh.length > 0 ? [...prev, ...fresh] : prev;
                    });
                    lastMessageIdRef.current = newMsgs[newMsgs.length - 1].id;
                }
            } catch { /* ignore poll error */ }
        }, 4000);

        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [selectedContact, user?.id]);

    // ── Auto-scroll ─────────────────────────────────────────────────────────────
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    // ── Context menu ────────────────────────────────────────────────────────────
    useEffect(() => {
        const close = () => setContextMenu(null);
        if (contextMenu) { window.addEventListener("click", close); return () => window.removeEventListener("click", close); }
    }, [contextMenu]);

    // ── Cleanup camera on unmount ───────────────────────────────────────────────
    useEffect(() => {
        return () => {
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, []);

    // ── Handlers ────────────────────────────────────────────────────────────────

    const handleCopy = (text: string) => { navigator.clipboard.writeText(text); setContextMenu(null); };

    const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
        e.preventDefault(); e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, messageId });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.currentTarget.files;
        if (!files?.length) return;
        setAttachments((prev) => [...prev, ...Array.from(files)]);
        e.currentTarget.value = "";
    };

    const removeAttachment = (index: number) => setAttachments((prev) => prev.filter((_, i) => i !== index));

    const buildAttachmentsFromFiles = (files: File[]): MessageAttachment[] =>
        files.map((f) => ({
            name: f.name,
            url: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
            type: f.type.startsWith("image/") ? "image" : "file",
        }));

    const sendMessage = async () => {
        const text = inputMessage.trim();
        const hasAttachments = attachments.length > 0;
        if (!text && !hasAttachments) return;
        if (!selectedContact || sending) return;

        setSending(true);
        const messageAttachments = buildAttachmentsFromFiles(attachments);
        const optimisticMsg: MessageItem = {
            id: `optimistic-${Date.now()}`,
            text: text || "(attachment)",
            sender: "user",
            time: formatTime(new Date()),
            attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        setInputMessage("");
        setAttachments([]);

        try {
            const { data } = await api.post<{ success: boolean; id: number }>("/api/chat/send", {
                to_id: selectedContact.id,
                message: text || "(attachment)",
            });
            if (data.success && data.id) {
                // Replace optimistic message with confirmed id
                setMessages((prev) =>
                    prev.map((m) => m.id === optimisticMsg.id ? { ...m, id: String(data.id) } : m)
                );
                lastMessageIdRef.current = data.id;
            }
        } catch {
            // Keep optimistic msg in UI even on failure
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    };

    // ── Video call ──────────────────────────────────────────────────────────────
    const startVideoCall = async () => {
        setVideoCallError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            setIsVideoCallActive(true);
        } catch (err) {
            setVideoCallError(err instanceof Error ? err.message : "Could not access camera or microphone");
        }
    };

    const endVideoCall = () => {
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        setIsVideoCallActive(false);
        setVideoCallError(null);
        setIsMutedVideo(false);
        setIsMutedAudio(false);
    };

    const toggleMuteVideo = () => {
        const stream = localStreamRef.current;
        if (stream) { const m = !isMutedVideo; stream.getVideoTracks().forEach((t) => (t.enabled = !m)); setIsMutedVideo(m); }
    };

    const toggleMuteAudio = () => {
        const stream = localStreamRef.current;
        if (stream) { const m = !isMutedAudio; stream.getAudioTracks().forEach((t) => (t.enabled = !m)); setIsMutedAudio(m); }
    };

    const setLocalVideoRef = (el: HTMLVideoElement | null) => {
        (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
        if (el && localStreamRef.current) el.srcObject = localStreamRef.current;
    };

    // ── Derived ─────────────────────────────────────────────────────────────────
    const filteredContacts = contacts.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase())
    );

    const today = formatDate(new Date());

    // ── Render ───────────────────────────────────────────────────────────────────
    return (
        <div>
            <h2 className="text-2xl text-black mb-4">Chat</h2>
            <div className="flex gap-4 h-[calc(100vh-8rem)] min-h-[500px] p-4 bg-transparent">
                {/* ── Left panel: Contacts ────────────────────────────────────────────── */}
                <div className="w-[300px] shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-white">
                        <h3 className="text-lg text-black mt-3">People</h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            {userType === "client" ? "Your project team" : "Direct Conversations in your workplace"}
                        </p>
                        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2.5">
                            <IconSearch />
                            <input
                                type="text"
                                placeholder="Find a teammate..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {contactsLoading ? (
                            // Loading skeleton
                            Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
                                    <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 bg-slate-200 rounded w-3/4" />
                                        <div className="h-2 bg-slate-200 rounded w-1/2" />
                                    </div>
                                </div>
                            ))
                        ) : filteredContacts.length === 0 ? (
                            <p className="text-center text-sm text-slate-400 py-8">No contacts found.</p>
                        ) : (
                            filteredContacts.map((contact) => (
                                <button
                                    key={contact.id}
                                    type="button"
                                    onClick={() => setSelectedContact(contact)}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border border-[#AEACAC] rounded-lg mt-2 ${selectedContact?.id === contact.id ? "bg-[#F2F2F2]" : "hover:bg-slate-50"}`}
                                >
                                    <div className="relative shrink-0">
                                        <Avatar name={contact.name} src={contact.profile_picture} />
                                        {contact.isOnline && (
                                            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between gap-1">
                                            <p className="font-semibold text-slate-900 truncate text-sm">{contact.name}</p>
                                            {contact.lastMsgTime && (
                                                <span className="text-[10px] text-slate-400 shrink-0">{formatContactTime(contact.lastMsgTime)}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {contact.lastMessage ? contact.lastMessage : (contact.user_role || "")}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* ── Right panel: Conversation ────────────────────────────────────────── */}
                <div className="flex-1 flex flex-col min-w-0 rounded-xl border border-[#AEACAC52] bg-[#FFFFFF] overflow-hidden">
                    {selectedContact ? (
                        <>
                            {/* Conversation header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#AEACAC52] bg-[#FFFFFF]">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative">
                                        <Avatar name={selectedContact.name} src={selectedContact.profile_picture} className="w-11 h-11" />
                                        {selectedContact.isOnline && (
                                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{selectedContact.name}</p>
                                        <p className="text-sm text-slate-500">
                                            {selectedContact.isOnline ? "Online" : selectedContact.user_role || "Offline"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={startVideoCall}
                                        className="p-2 bg-[#F2F2F2] rounded-full hover:bg-slate-100"
                                        aria-label="Video call"
                                    >
                                        <img src={videoIcon} alt="video" className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        className="p-2 bg-[#F2F2F2] rounded-full hover:bg-slate-100"
                                        aria-label="Report"
                                    >
                                        <img src={alertIcon} alt="alert" className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Messages area */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                <div className="flex items-center gap-3 my-4">
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-xs font-medium text-slate-500">{today}</span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                </div>

                                {messagesLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <p className="text-center text-sm text-slate-400 py-8">No messages yet. Say hello! 👋</p>
                                ) : (
                                    messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            {/* Avatar for contact messages */}
                                            {msg.sender === "contact" && (
                                                <Avatar
                                                    name={selectedContact?.name || ""}
                                                    src={selectedContact?.profile_picture}
                                                    className="w-7 h-7 shrink-0 mb-1"
                                                />
                                            )}
                                            <div
                                                className={`relative max-w-[70%] rounded-2xl px-4 py-2.5 select-text cursor-context-menu ${msg.sender === "user"
                                                        ? "bg-[#1D4ED8] text-white rounded-br-sm"
                                                        : "bg-[#F3F4F6] text-slate-900 rounded-bl-sm"
                                                    }`}
                                                onContextMenu={(e) => handleContextMenu(e, msg.id)}
                                            >
                                                {msg.attachments && msg.attachments.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {msg.attachments.map((att, i) =>
                                                            att.type === "image" && att.url ? (
                                                                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                                                    className="block rounded-lg overflow-hidden border border-slate-200 max-w-[200px] max-h-[160px]">
                                                                    <img src={att.url} alt={att.name} className="w-full h-auto object-cover" />
                                                                </a>
                                                            ) : (
                                                                <div key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm ${msg.sender === "user" ? "bg-blue-700/60 text-blue-100" : "bg-slate-300/80 text-slate-800"
                                                                    }`}>
                                                                    <IconPaperclip />
                                                                    <span className="truncate max-w-[140px]" title={att.name}>{att.name}</span>
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                                {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                                                <p className={`text-[10px] mt-1 text-right ${msg.sender === "user" ? "text-blue-200" : "text-slate-400"
                                                    }`}>{msg.time}</p>
                                            </div>
                                            {/* Avatar for user messages */}
                                            {msg.sender === "user" && (
                                                <Avatar
                                                    name={user?.full_name || "You"}
                                                    src={null}
                                                    className="w-7 h-7 shrink-0 mb-1"
                                                />
                                            )}
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Context menu */}
                            {contextMenu &&
                                createPortal(
                                    <div
                                        className="fixed z-[9999] bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 min-w-[160px]"
                                        style={{ left: contextMenu.x, top: contextMenu.y }}
                                    >
                                        <button type="button" onClick={() => setContextMenu(null)}
                                            className="group w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 text-left transition-colors">
                                            <span className="text-slate-500 group-hover:text-red-600"><IconReply /></span>
                                            Reply
                                        </button>
                                        <button type="button"
                                            onClick={() => { const m = messages.find((x) => x.id === contextMenu.messageId); if (m) handleCopy(m.text); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 text-left transition-colors">
                                            <IconCopy /> Copy
                                        </button>
                                        <button type="button" onClick={() => setContextMenu(null)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 text-left transition-colors">
                                            <IconForward /> Forward
                                        </button>
                                    </div>,
                                    document.body
                                )}

                            {/* Message input */}
                            <div className="p-4 border-t border-slate-200 bg-[#FFFFFF]">
                                <input
                                    id="chat-file-attach-input"
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                                    className="sr-only"
                                    onChange={handleFileChange}
                                    aria-label="Attach files"
                                />
                                {attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2" role="list" aria-label="Attached files">
                                        {attachments.map((file, index) => (
                                            <span key={`${file.name}-${index}`}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm overflow-hidden border border-slate-200">
                                                <AttachmentPreview file={file} />
                                                <span className="truncate max-w-[120px] py-1.5 pr-1" title={file.name}>{file.name}</span>
                                                <button type="button" onClick={() => removeAttachment(index)}
                                                    className="shrink-0 p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700 m-0.5"
                                                    aria-label={`Remove ${file.name}`}>
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-center gap-2 rounded-xl bg-[#FFFFFF] px-4 py-2.5 border border-[#AEACAC52]">
                                    <input
                                        type="text"
                                        placeholder="Type your message..."
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                                        disabled={sending}
                                    />
                                    <label htmlFor="chat-file-attach-input"
                                        className="p-1.5 rounded-full bg-[#F2F2F2] hover:bg-slate-200/80 cursor-pointer inline-flex items-center justify-center"
                                        aria-label="Attach files">
                                        <IconPaperclip />
                                    </label>
                                    <button type="button" onClick={sendMessage} disabled={sending}
                                        className="flex items-center justify-center w-20 h-10 rounded-lg bg-[#F2F2F2] cursor-pointer transition-colors gap-1 disabled:opacity-50"
                                        aria-label="Send">
                                        <span className="text-xs text-black">Send</span>
                                        <img src={sendIcon} alt="send" className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                            {contactsLoading ? "Loading contacts..." : "Select a contact to start chatting"}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Video call modal ─────────────────────────────────────────────────── */}
            {(isVideoCallActive || videoCallError) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl w-full max-w-4xl aspect-video max-h-[85vh] flex flex-col">
                        {videoCallError ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-white">
                                <p className="text-red-300 text-center">{videoCallError}</p>
                                <p className="text-sm text-slate-400 text-center">
                                    Allow camera and microphone in your browser settings, then try again.
                                </p>
                                <button type="button" onClick={() => setVideoCallError(null)}
                                    className="px-4 py-2 rounded-xl bg-slate-600 hover:bg-slate-500 text-white">
                                    OK
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80">
                                    <span className="text-white font-medium">
                                        Video call with {selectedContact?.name}
                                    </span>
                                    <button type="button" onClick={endVideoCall}
                                        className="text-slate-400 hover:text-white text-sm" aria-label="Close">
                                        ✕
                                    </button>
                                </div>
                                <div className="flex-1 relative flex gap-2 p-2 min-h-0">
                                    {/* Remote placeholder */}
                                    <div className="flex-1 rounded-xl bg-slate-800 flex items-center justify-center min-w-0">
                                        <div className="text-center text-slate-500">
                                            <Avatar
                                                name={selectedContact?.name || ""}
                                                src={selectedContact?.profile_picture}
                                                className="w-20 h-20 mx-auto mb-2 opacity-80"
                                            />
                                            <p className="font-medium text-slate-400">{selectedContact?.name}</p>
                                            <p className="text-sm">Waiting for them to join…</p>
                                        </div>
                                    </div>
                                    {/* Local camera */}
                                    <div className="w-64 shrink-0 min-h-[180px] rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-600 relative">
                                        <video
                                            ref={setLocalVideoRef}
                                            autoPlay playsInline muted
                                            className="w-full h-full min-h-[180px] object-cover"
                                            style={{ transform: "scaleX(-1)" }}
                                        />
                                        <div className="absolute bottom-2 right-2 text-xs text-white/80 bg-black/50 px-2 py-1 rounded">You</div>
                                    </div>
                                </div>
                                {/* Call controls */}
                                <div className="flex items-center justify-center gap-4 py-3 bg-slate-800/80">
                                    {/* Mute mic */}
                                    <button type="button" onClick={toggleMuteAudio}
                                        className={`p-3 rounded-full ${isMutedAudio ? "bg-red-600" : "bg-slate-600"} hover:opacity-90 text-white`}
                                        aria-label={isMutedAudio ? "Unmute microphone" : "Mute microphone"}>
                                        {isMutedAudio ? (
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                                <path d="M3 3l18 18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                            </svg>
                                        )}
                                    </button>
                                    {/* End call */}
                                    <button type="button" onClick={endVideoCall}
                                        className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white"
                                        aria-label="End call">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                        </svg>
                                    </button>
                                    {/* Mute video */}
                                    <button type="button" onClick={toggleMuteVideo}
                                        className={`p-3 rounded-full ${isMutedVideo ? "bg-red-600" : "bg-slate-600"} hover:opacity-90 text-white`}
                                        aria-label={isMutedVideo ? "Turn on camera" : "Turn off camera"}>
                                        {isMutedVideo ? (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                                            </svg>
                                        ) : (
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
