import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import sendIcon from "../assets/Chat/sendicon.svg";
import videoIcon from "../assets/Chat/video.svg";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { getGlobalProfileUrl } from "../lib/profileHelpers";

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

type ReplyPreview = {
    id: string;
    text: string;
    sender: "user" | "contact";
};

type MessageItem = {
    id: string;
    text: string;
    sender: "user" | "contact";
    time: string;
    rawDate: string;
    attachments?: MessageAttachment[];
    replyTo?: ReplyPreview;
};

interface ChatPanelProps {
    /** 'employee' for all employee roles, 'client' for client portal */
    userType: "employee" | "client";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateSafe(isoOrDate: string | Date): Date {
    if (isoOrDate instanceof Date) return isoOrDate;
    // MySQL uses "YYYY-MM-DD HH:MM:SS", browsers prefer "T" separator
    const normalized = typeof isoOrDate === "string" ? isoOrDate.replace(" ", "T") : isoOrDate;
    return new Date(normalized);
}

function formatTime(isoOrDate: string | Date): string {
    const d = parseDateSafe(isoOrDate);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function formatDate(isoOrDate: string | Date): string {
    const d = parseDateSafe(isoOrDate);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/** Returns "Today", "Yesterday", or formatted date */
function getHeaderDate(isoOrDate: string | Date): string {
    const d = parseDateSafe(isoOrDate);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return "Today";

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (isYesterday) return "Yesterday";

    return formatDate(d);
}

/** Show time if today, else show short date or "Yesterday" */
function formatContactTime(iso: string | null | undefined): string {
    if (!iso) return "";
    const d = parseDateSafe(iso);
    if (isNaN(d.getTime())) return "";
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return formatTime(d);

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    if (isYesterday) return "Yesterday";

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
    // Create the object URL once and clean it up on unmount.
    // Using a lazy useState initializer avoids the RAF race condition
    // that breaks preview in React StrictMode dev builds.
    const isImage = file.type.startsWith("image/");
    const [url] = useState<string | null>(() =>
        isImage ? URL.createObjectURL(file) : null
    );
    useEffect(() => {
        // Revoke the blob URL when the component unmounts to free memory.
        return () => { if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!isImage)
        return <span className="w-10 h-10 shrink-0 bg-slate-200 flex items-center justify-center rounded-l-lg"><IconPaperclip /></span>;
    if (!url)
        return <span className="w-12 h-12 shrink-0 bg-slate-200 animate-pulse" />;
    return (
        <span className="w-12 h-12 shrink-0 bg-slate-200 flex items-center justify-center overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" />
        </span>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChatPanel({ userType }: ChatPanelProps) {
    const { user } = useAuth();
    const [searchParams] = useSearchParams();
    const location = useLocation();
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
    const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState<string | null>(null);
    // ── Reply state ─────────────────────────────────────────────────────────────
    const [replyingTo, setReplyingTo] = useState<MessageItem | null>(null);
    // ── Forward state ────────────────────────────────────────────────────────────
    const [forwardMessage, setForwardMessage] = useState<MessageItem | null>(null);
    const [forwardSearch, setForwardSearch] = useState("");
    const [forwardSending, setForwardSending] = useState(false);
    // ── Three-dots menu state ─────────────────────────────────────────────────
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);
    const [showInChatSearch, setShowInChatSearch] = useState(false);
    const [inChatSearch, setInChatSearch] = useState("");
    const headerMenuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
                const passedUserId = location.state?.selectedUserId;
                if (passedUserId && !selectedContact) {
                    const found = mapped.find((c) => c.id === passedUserId);
                    if (found) {
                        setSelectedContact(found);
                    } else if (mapped.length > 0) {
                        setSelectedContact(mapped[0]);
                    }
                } else if (mapped.length > 0 && !selectedContact) {
                    setSelectedContact(mapped[0]);
                }
            })
            .catch(() => { /* fail silently */ })
            .finally(() => setContactsLoading(false));
    }, []);

    // Fetch current user profile picture for "user" message avatars
    useEffect(() => {
        if (userType !== "employee") return;
        api.get<{ id?: number; profile_picture?: string | null }>("/api/profile")
            .then(({ data }) => {
                if (data?.id != null && data?.profile_picture) {
                    setCurrentUserAvatarUrl(getGlobalProfileUrl(data.id, data.profile_picture));
                }
            })
            .catch(() => {});
    }, [userType]);

    // ── Fetch conversation history ──────────────────────────────────────────────
    const loadConversation = useCallback(async (contactId: number) => {
        setMessagesLoading(true);
        try {
            const { data } = await api.get<{ messages: Array<{ id: number; outgoing: number; message: string; date: string; attachments?: MessageAttachment[] | null }> }>(
                `/api/chat/conversation/${contactId}`
            );
            // Use Number() comparison to avoid type mismatch (DB may return string, auth returns number)
            const myId = Number(user?.id);
            const mapped: MessageItem[] = (data.messages || []).map((m) => {
                let msgText = m.message ?? "";
                let replyTo: ReplyPreview | undefined = undefined;
                // Re-hydrate reply bubbles from the embedded ↩ prefix stored in the DB
                if (msgText.startsWith("\u21A9 ")) {
                    const nlIdx = msgText.indexOf("\n");
                    if (nlIdx !== -1) {
                        replyTo = { id: "quoted", text: msgText.slice(2, nlIdx), sender: "contact" };
                        msgText = msgText.slice(nlIdx + 1);
                    }
                }
                return {
                    id: String(m.id),
                    text: msgText,
                    sender: Number(m.outgoing) === myId ? "user" : "contact",
                    time: formatTime(m.date),
                    rawDate: m.date,
                    attachments: Array.isArray(m.attachments) && m.attachments.length > 0 ? m.attachments : undefined,
                    replyTo,
                };
            });
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
                const { data } = await api.get<{ messages: Array<{ id: number; outgoing: number; message: string; date: string; attachments?: MessageAttachment[] | null }> }>(
                    `/api/chat/conversation/${selectedContact.id}/since/${lastId}`
                );
                const myId = Number(user?.id);
                const newMsgs = (data.messages || []);
                if (newMsgs.length > 0) {
                    const mapped: MessageItem[] = newMsgs.map((m) => {
                        let msgText = m.message ?? "";
                        let replyTo: ReplyPreview | undefined = undefined;
                        if (msgText.startsWith("\u21A9 ")) {
                            const nlIdx = msgText.indexOf("\n");
                            if (nlIdx !== -1) {
                                replyTo = { id: "quoted", text: msgText.slice(2, nlIdx), sender: "contact" };
                                msgText = msgText.slice(nlIdx + 1);
                            }
                        }
                        return {
                            id: String(m.id),
                            text: msgText,
                            sender: Number(m.outgoing) === myId ? "user" : "contact",
                            time: formatTime(m.date),
                            rawDate: m.date,
                            attachments: Array.isArray(m.attachments) && m.attachments.length > 0 ? m.attachments : undefined,
                            replyTo,
                        };
                    });
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

    // Close three-dots menu on outside click
    useEffect(() => {
        if (!showHeaderMenu) return;
        const close = (e: MouseEvent) => {
            if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
                setShowHeaderMenu(false);
            }
        };
        window.addEventListener("mousedown", close);
        return () => window.removeEventListener("mousedown", close);
    }, [showHeaderMenu]);

    // ── Handlers ────────────────────────────────────────────────────────────────

    const handleCopy = (text: string) => { navigator.clipboard.writeText(text); setContextMenu(null); };

    const handleReply = (messageId: string) => {
        const msg = messages.find((m) => m.id === messageId);
        if (msg) {
            setReplyingTo(msg);
            setContextMenu(null);
            // Focus the input after a tick so the reply bar has rendered
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    const handleForwardOpen = (messageId: string) => {
        const msg = messages.find((m) => m.id === messageId);
        if (msg) {
            setForwardMessage(msg);
            setForwardSearch("");
            setContextMenu(null);
        }
    };

    const handleForwardSend = async (contact: Contact) => {
        if (!forwardMessage || forwardSending) return;
        const text = forwardMessage.text || "[Forwarded attachment]";
        setForwardSending(true);
        try {
            await api.post("/api/chat/send", { to_id: contact.id, message: `↪ Forwarded\n${text}` });
        } catch { /* ignore */ } finally {
            setForwardSending(false);
            setForwardMessage(null);
        }
    };

    const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
        e.preventDefault(); e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, messageId });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        
        const fileArray = Array.from(files);
        setAttachments((prev) => [...prev, ...fileArray]);
        
        // Safely clear the input using the ref so the same file can be selected again
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
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
        const now = new Date();

        // Build the reply snapshot and the full message text to send
        const currentReply = replyingTo ? { id: replyingTo.id, text: replyingTo.text, sender: replyingTo.sender } as ReplyPreview : undefined;
        const replyPrefix = currentReply ? `↩ ${currentReply.text.slice(0, 120)}${currentReply.text.length > 120 ? "…" : ""}\n` : "";
        const fullText = replyPrefix + (text || "");

        const optimisticMsg: MessageItem = {
            id: `optimistic-${Date.now()}`,
            text: text || "",
            sender: "user",
            time: formatTime(now),
            rawDate: now.toISOString(),
            attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
            replyTo: currentReply,
        };
        setMessages((prev) => [...prev, optimisticMsg]);
        setInputMessage("");
        setReplyingTo(null);
        const filesToUpload = [...attachments];
        setAttachments([]);

        try {
            let newId = 0;

            if (filesToUpload.length > 0) {
                const formData = new FormData();
                formData.append("to_id", String(selectedContact.id));
                formData.append("message", fullText);
                filesToUpload.forEach((f) => formData.append("attachments", f));
                const { data } = await api.post<{ success: boolean; id: number }>("/api/chat/send", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                if (data.success && data.id) newId = data.id;
            } else {
                const { data } = await api.post<{ success: boolean; id: number }>("/api/chat/send", {
                    to_id: selectedContact.id,
                    message: fullText,
                });
                if (data.success && data.id) newId = data.id;
            }

            if (newId) {
                setMessages((prev) =>
                    prev.map((m) => m.id === optimisticMsg.id ? { ...m, id: String(newId) } : m)
                );
                lastMessageIdRef.current = newId;
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
    const filteredContacts = useMemo(() => {
        const q = searchParams.get("q")?.toLowerCase() || "";
        return contacts.filter((c) =>
            c.name.toLowerCase().includes(search.toLowerCase()) &&
            (!q || c.name.toLowerCase().includes(q) || (c.user_role || "").toLowerCase().includes(q))
        );
    }, [contacts, search, searchParams]);

    // Messages filtered by in-chat search
    const displayMsgs = inChatSearch
        ? messages.filter((m) => m.text.toLowerCase().includes(inChatSearch.toLowerCase()))
        : messages;

    // Highlight matched text in message bubbles
    const highlight = (text: string) => {
        if (!inChatSearch) return <>{text}</>;
        const escaped = inChatSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const parts = text.split(new RegExp(`(${escaped})`, "gi"));
        return <>{parts.map((p, i) =>
            p.toLowerCase() === inChatSearch.toLowerCase()
                ? <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">{p}</mark>
                : p
        )}</>;
    };

    // ── Render ───────────────────────────────────────────────────────────────────
    return (
        <div className="px-1 pt-1 pb-0 flex flex-col h-[calc(100vh-110px)] bg-white overflow-hidden">
            <div className="px-2 py-3 flex-shrink-0">
                <h2 className="text-2xl font-semibold text-[#000000]">Chat</h2>
            </div>
            <div className="flex gap-4 flex-1 min-h-0 px-2 pb-2 bg-transparent overflow-hidden">
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
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border border-[#AEACAC] rounded-lg mt-2 cursor-pointer ${selectedContact?.id === contact.id ? "bg-[#F2F2F2]" : "hover:bg-slate-50"}`}
                                >
                                    <div className="relative shrink-0">
                                        <Avatar name={contact.name} src={getGlobalProfileUrl(contact.id, contact.profile_picture) || undefined} />
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
                            {/* Forward Modal */}
                            {forwardMessage && createPortal(
                                <div
                                    className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40"
                                    onClick={() => setForwardMessage(null)}
                                >
                                    <div
                                        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Modal header */}
                                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                                            <h3 className="font-semibold text-slate-900">Forward Message</h3>
                                            <button
                                                type="button"
                                                onClick={() => setForwardMessage(null)}
                                                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer"
                                                aria-label="Close"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                        {/* Preview of message being forwarded */}
                                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-wide mb-1">Forwarding</p>
                                            <p className="text-sm text-slate-700 line-clamp-2">
                                                {forwardMessage.text || "[Attachment]"}
                                            </p>
                                        </div>
                                        {/* Search */}
                                        <div className="px-4 pt-3 pb-1">
                                            <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                                                <IconSearch />
                                                <input
                                                    type="text"
                                                    placeholder="Search contacts…"
                                                    value={forwardSearch}
                                                    onChange={(e) => setForwardSearch(e.target.value)}
                                                    className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                                                    autoFocus
                                                />
                                            </div>
                                        </div>
                                        {/* Contact list */}
                                        <div className="overflow-y-auto max-h-60 px-2 pb-3">
                                            {contacts
                                                .filter((c) => c.name.toLowerCase().includes(forwardSearch.toLowerCase()))
                                                .map((c) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        disabled={forwardSending}
                                                        onClick={() => handleForwardSend(c)}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-1"
                                                    >
                                                        <Avatar
                                                            name={c.name}
                                                            src={getGlobalProfileUrl(c.id, c.profile_picture) || undefined}
                                                            className="w-9 h-9"
                                                        />
                                                        <div className="flex-1 text-left min-w-0">
                                                            <p className="font-medium text-slate-900 text-sm truncate">{c.name}</p>
                                                            <p className="text-xs text-slate-400 truncate">{c.user_role || ""}</p>
                                                        </div>
                                                        <span className="shrink-0 text-slate-400">
                                                            <IconForward />
                                                        </span>
                                                    </button>
                                                ))
                                            }
                                            {contacts.filter((c) => c.name.toLowerCase().includes(forwardSearch.toLowerCase())).length === 0 && (
                                                <p className="text-center text-sm text-slate-400 py-6">No contacts found.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>,
                                document.body
                            )}
                            {/* Conversation header */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-[#AEACAC52] bg-[#FFFFFF] flex-shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative">
                                        <Avatar name={selectedContact.name} src={getGlobalProfileUrl(selectedContact.id, selectedContact.profile_picture) || undefined} className="w-11 h-11" />
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
                                        className="p-2 bg-[#F2F2F2] rounded-full cursor-pointer"
                                        aria-label="Video call"
                                    >
                                        <img src={videoIcon} alt="video" className="w-4 h-4" />
                                    </button>
                                    {/* Three-dots menu */}
                                    <div className="relative" ref={headerMenuRef}>
                                        <button
                                            type="button"
                                            onClick={() => setShowHeaderMenu((v) => !v)}
                                            className="p-2 bg-[#F2F2F2] rounded-full cursor-pointer flex items-center justify-center"
                                            aria-label="More options"
                                        >
                                            <svg className="w-4 h-4 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                                                <circle cx="12" cy="5" r="1.5" />
                                                <circle cx="12" cy="12" r="1.5" />
                                                <circle cx="12" cy="19" r="1.5" />
                                            </svg>
                                        </button>
                                        {showHeaderMenu && (
                                            <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-xl border border-slate-200 py-1 min-w-[160px]">
                                                <button
                                                    type="button"
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        setShowInChatSearch((v) => !v);
                                                        setInChatSearch("");
                                                        setShowHeaderMenu(false);
                                                    }}
                                                >
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                    Search messages
                                                </button>
                                                <div className="h-px bg-slate-100 mx-3" />
                                                <button
                                                    type="button"
                                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 text-left cursor-pointer transition-colors"
                                                    onClick={async () => {
                                                        if (!selectedContact) return;
                                                        try {
                                                            await api.post(`/api/chat/conversation/${selectedContact.id}/clear`);
                                                            setMessages([]);
                                                            lastMessageIdRef.current = 0;
                                                        } catch (err) {
                                                            console.error("Failed to clear chat:", err);
                                                        } finally {
                                                            setShowHeaderMenu(false);
                                                        }
                                                    }}
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Clear chat
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* In-conversation search bar */}
                            {showInChatSearch && (
                                <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200 bg-slate-50 flex-shrink-0">
                                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <input
                                        type="text"
                                        placeholder="Search in conversation…"
                                        autoFocus
                                        value={inChatSearch}
                                        onChange={(e) => setInChatSearch(e.target.value)}
                                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                                    />
                                    {inChatSearch && (
                                        <span className="text-xs text-slate-400">
                                            {messages.filter((m) => m.text.toLowerCase().includes(inChatSearch.toLowerCase())).length} found
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => { setShowInChatSearch(false); setInChatSearch(""); }}
                                        className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
                                        aria-label="Close search"
                                    >
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                                {messagesLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                    </div>
                                ) : messages.length === 0 ? (
                                    <p className="text-center text-sm text-slate-400 py-8">No messages yet. Say hello! 👋</p>
                                ) : (
                                    displayMsgs.map((msg, index) => {
                                        const prevMsg = messages[index - 1];
                                        const showDateSeparator = !prevMsg || 
                                            parseDateSafe(msg.rawDate).toDateString() !== 
                                            parseDateSafe(prevMsg.rawDate).toDateString();
                                        
                                        return (
                                            <div key={msg.id} className="space-y-4">
                                                {showDateSeparator && (
                                                    <div className="flex items-center gap-3 my-6 first:mt-2">
                                                        <div className="flex-1 h-px bg-slate-200" />
                                                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                            {getHeaderDate(msg.rawDate)}
                                                        </span>
                                                        <div className="flex-1 h-px bg-slate-200" />
                                                    </div>
                                                )}
                                                <div
                                                    className={`flex items-end gap-2 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                                >
                                                    {/* Avatar for contact messages */}
                                                    {msg.sender === "contact" && (
                                                        <Avatar
                                                            name={selectedContact?.name || ""}
                                                            src={selectedContact ? getGlobalProfileUrl(selectedContact.id, selectedContact.profile_picture) || undefined : undefined}
                                                            className="w-7 h-7 shrink-0 mb-1"
                                                        />
                                                    )}
                                                    <div
                                                        className={`relative max-w-[70%] rounded-2xl px-3 py-2 select-text cursor-context-menu ${msg.sender === "user"
                                                                ? "bg-white text-slate-800 border border-slate-200 shadow-sm rounded-br-sm"
                                                                : "bg-[#F3F4F6] text-slate-900 rounded-bl-sm"
                                                            }`}
                                                        onContextMenu={(e) => handleContextMenu(e, msg.id)}
                                                    >
                                                        {msg.attachments && msg.attachments.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 mb-2">
                                                                {msg.attachments.map((att, i) => {
                                                                    const baseUrl = (api.defaults.baseURL || "").replace(/\/$/, "");
                                                                    const rawUrl = att.url || "";
                                                                    let fileUrl = rawUrl;
                                                                    if (!rawUrl.startsWith("blob:")) {
                                                                        const path = rawUrl.startsWith("/uploads/chat/") ? rawUrl : `/uploads/chat/${rawUrl}`;
                                                                        fileUrl = `${baseUrl}${path}`;
                                                                    }
                                                                    return att.type === "image" && att.url ? (
                                                                        <a key={i} href={fileUrl} target="_blank" rel="noopener noreferrer"
                                                                            className="block rounded-lg overflow-hidden border border-slate-200 max-w-[200px] max-h-[160px]">
                                                                            <img src={fileUrl} alt={att.name} className="w-full h-auto object-cover" />
                                                                        </a>
                                                                    ) : (
                                                                        <a key={i} href={fileUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm hover:opacity-90 transition-opacity cursor-pointer shadow-sm ${msg.sender === "user" ? "bg-blue-50 text-[#1D4ED8] border border-blue-100" : "bg-white border border-slate-200 text-slate-700"
                                                                            }`}>
                                                                            <IconPaperclip />
                                                                            <span className="truncate max-w-[140px]" title={att.name}>{att.name}</span>
                                                                        </a>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                        {/* Quoted reply bubble */}
                                                        {msg.replyTo && (
                                                            <div className={`mb-1.5 pl-2 border-l-2 rounded text-xs py-1 pr-2 max-w-full ${
                                                                msg.sender === "user"
                                                                    ? "border-slate-400 bg-slate-100 text-slate-500"
                                                                    : "border-slate-500 bg-slate-200 text-slate-600"
                                                            }`}>
                                                                <span className="font-semibold block text-[10px] uppercase tracking-wide mb-0.5">
                                                                    {msg.replyTo.sender === "user" ? (user?.full_name || "You") : selectedContact?.name}
                                                                </span>
                                                                <span className="line-clamp-2 leading-snug">
                                                                    {msg.replyTo.text || "[Attachment]"}
                                                                </span>
                                                            </div>
                                                        )}
                                                        {/* Forwarded indicator */}
                                                        {msg.text.startsWith("↪ Forwarded\n") ? (
                                                            <>
                                                                <span className="flex items-center gap-1 text-[10px] text-slate-400 italic mb-0.5">
                                                                    <IconForward /> Forwarded
                                                                </span>
                                                                <p className="text-sm leading-relaxed">{highlight(msg.text.replace("↪ Forwarded\n", ""))}</p>
                                                            </>
                                                        ) : (
                                                            msg.text && <p className="text-sm leading-relaxed">{highlight(msg.text)}</p>
                                                        )}
                                                        <p className={`text-[10px] mt-1 text-right ${msg.sender === "user" ? "text-gray-400" : "text-gray-500"
                                                            }`}>{msg.time}</p>
                                                    </div>
                                                    {/* Avatar for user messages */}
                                                    {msg.sender === "user" && (
                                                        <Avatar
                                                            name={user?.full_name || "You"}
                                                            src={currentUserAvatarUrl || undefined}
                                                            className="w-7 h-7 shrink-0 mb-1"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })

                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Context menu */}
                            {contextMenu &&
                                createPortal(
                                    <div
                                        className="fixed z-[9999] bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 min-w-[160px]"
                                        style={{ left: contextMenu!.x, top: contextMenu!.y }}
                                    >
                                        <button type="button" onClick={() => handleReply(contextMenu!.messageId)}
                                            className="group w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:text-red-600 text-left transition-colors cursor-pointer">
                                            <span className="text-slate-500 group-hover:text-red-600"><IconReply /></span>
                                            Reply
                                        </button>
                                        <button type="button"
                                            onClick={() => { const m = messages.find((x) => x.id === contextMenu!.messageId); if (m) handleCopy(m.text); }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:text-red-600 text-left transition-colors cursor-pointer">
                                            <IconCopy /> Copy
                                        </button>
                                        <button type="button" onClick={() => handleForwardOpen(contextMenu!.messageId)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:text-red-600 text-left transition-colors cursor-pointer">
                                            <IconForward /> Forward
                                        </button>
                                    </div>,
                                    document.body
                                )}

                            {/* Message input */}
                            <div className="p-4 border-t border-slate-200 bg-[#FFFFFF] flex-shrink-0">
                                {/* Reply preview bar */}
                                {replyingTo && (
                                    <div className="flex items-start gap-2 mb-2 px-3 py-2 rounded-lg bg-slate-100 border-l-[3px] border-slate-400">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
                                                Replying to {replyingTo.sender === "user" ? (user?.full_name || "You") : selectedContact?.name}
                                            </p>
                                            <p className="text-xs text-slate-600 truncate">
                                                {replyingTo.text || "[Attachment]"}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setReplyingTo(null)}
                                            className="shrink-0 p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
                                            aria-label="Cancel reply"
                                        >
                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
                                    className="sr-only"
                                    onChange={handleFileChange}
                                    aria-label="Attach files"
                                    tabIndex={-1}
                                />
                                {attachments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-2" role="list" aria-label="Attached files">
                                        {attachments.map((file, index) => (
                                            <span key={`${file.name}-${index}`}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm overflow-hidden border border-slate-200">
                                                <AttachmentPreview file={file} />
                                                <span className="truncate max-w-[120px] py-1.5 pr-1" title={file.name}>{file.name}</span>
                                                <button type="button" onClick={() => removeAttachment(index)}
                                                    className="shrink-0 p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700 m-0.5 cursor-pointer"
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
                                        ref={inputRef}
                                        type="text"
                                        placeholder={replyingTo ? "Type your reply..." : "Type your message..."}
                                        value={inputMessage}
                                        onChange={(e) => setInputMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
                                        disabled={sending}
                                    />
                                    <button type="button" onClick={() => fileInputRef.current?.click()}
                                        className="p-1.5 rounded-full bg-[#F2F2F2] hover:bg-slate-200/80 cursor-pointer inline-flex items-center justify-center"
                                        aria-label="Attach files">
                                        <IconPaperclip />
                                    </button>
                                    <button type="button" onClick={sendMessage} disabled={sending}
                                        className="flex items-center justify-center w-20 h-10 rounded-lg bg-[#F2F2F2] cursor-pointer transition-colors gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    className="px-4 py-2 rounded-xl bg-slate-600 hover:bg-slate-500 text-white cursor-pointer">
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
                                        className="text-slate-400 hover:text-white text-sm cursor-pointer" aria-label="Close">
                                        ✕
                                    </button>
                                </div>
                                <div className="flex-1 relative flex gap-2 p-2 min-h-0">
                                    {/* Remote placeholder */}
                                    <div className="flex-1 rounded-xl bg-slate-800 flex items-center justify-center min-w-0">
                                        <div className="text-center text-slate-500">
                                            <Avatar
                                                name={selectedContact?.name || ""}
                                                src={selectedContact ? getGlobalProfileUrl(selectedContact.id, selectedContact.profile_picture) || undefined : undefined}
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
                                        className={`p-3 rounded-full ${isMutedAudio ? "bg-red-600" : "bg-slate-600"} hover:opacity-90 text-white cursor-pointer`}
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
                                        className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                                        aria-label="End call">
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                                        </svg>
                                    </button>
                                    {/* Mute video */}
                                    <button type="button" onClick={toggleMuteVideo}
                                        className={`p-3 rounded-full ${isMutedVideo ? "bg-red-600" : "bg-slate-600"} hover:opacity-90 text-white cursor-pointer`}
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
