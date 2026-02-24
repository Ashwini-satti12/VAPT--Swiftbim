
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import alertIcon from "../../assets/Chat/icon.svg";
import sendIcon from "../../assets/Chat/sendicon.svg";
import videoIcon from "../../assets/Chat/video.svg";
import { PhoneIcon, VideoCameraIcon } from "@heroicons/react/24/outline";

interface Contact {
    id: string;
    name: string;
    status: string;
    lastActivity: string;
    isOnline?: boolean;
    isTyping?: boolean;
    avatar?: string;
}

// Icons as inline SVGs (no extra deps)
const IconSearch = () => (
    <svg
        className="w-4 h-4 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
    </svg>
);
const IconVideo = () => (
    <svg
        className="w-5 h-5 text-slate-600"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
    </svg>
);
const IconPaperclip = () => (
    <svg
        className="w-5 h-5 text-slate-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
        />
    </svg>
);
const IconReply = () => (
    <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
        />
    </svg>
);
const IconCopy = () => (
    <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
    </svg>
);
const IconForward = () => (
    <svg
        className="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 5l7 7m0 0l-7 7m7-7H3"
        />
    </svg>
);

// Mock contacts for the left panel (status = last message preview; isTyping shows "Typing..." when true)
const MOCK_CONTACTS: Contact[] = [
    {
        id: "1",
        name: "Jackie Chan",
        status: "Section 13 is under...",
        lastActivity: "Now",
        isOnline: true,
        isTyping: true,
    },
    {
        id: "2",
        name: "Agent Black",
        status: "Section 13 is under...",
        lastActivity: "2h ago",
        isOnline: true,
    },
    {
        id: "3",
        name: "Black Widow",
        status: "Meeting @Avengers HQ...",
        lastActivity: "9h ago",
    },
    {
        id: "4",
        name: "Mike Wozowski",
        status: "Lorem Ipsum has been...",
        lastActivity: "Yesterday",
        isOnline: true,
    },
];

// Message type and initial mock conversation for selected contact
type MessageAttachment = {
    name: string;
    url?: string; // object URL or data URL for images
    type: "image" | "file";
};

type MessageItem = {
    id: string;
    text: string;
    sender: "user" | "contact";
    time: string;
    attachments?: MessageAttachment[];
};

const INITIAL_MESSAGES: MessageItem[] = [
    {
        id: "1",
        text: "Lorem Ipsum has been the industry's standard",
        sender: "contact",
        time: "8:00 PM",
    },
    {
        id: "2",
        text: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
        sender: "contact",
        time: "8:00 PM",
    },
    {
        id: "3",
        text: "Lorem Ipsum has been the industry's standard dummy text ever since the 1500s,",
        sender: "user",
        time: "8:00 PM",
    },
];

function formatTime(date: Date) {
    return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function Avatar({
    name,
    className = "w-10 h-10",
}: {
    name: string;
    className?: string;
}) {
    const initial = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2);
    return (
        <div
            className={`${className} rounded-full bg-slate-300 flex items-center justify-center text-slate-600 font-semibold text-sm shrink-0`}
        >
            {initial}
        </div>
    );
}

/** Renders image preview with object URL; revokes URL on unmount to avoid leaks */
function AttachmentPreview({ file }: { file: File }) {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!file.type.startsWith("image/")) return;
        const u = URL.createObjectURL(file);
        const id = requestAnimationFrame(() => setUrl(u));
        return () => {
            cancelAnimationFrame(id);
            URL.revokeObjectURL(u);
        };
    }, [file]);
    if (!file.type.startsWith("image/"))
        return (
            <span className="w-10 h-10 shrink-0 bg-slate-200 flex items-center justify-center rounded-l-lg">
                <IconPaperclip />
            </span>
        );
    if (!url) return <span className="w-12 h-12 shrink-0 bg-slate-200 animate-pulse" />;
    return (
        <span className="w-12 h-12 shrink-0 bg-slate-200 flex items-center justify-center overflow-hidden">
            <img src={url} alt="" className="w-full h-full object-cover" />
        </span>
    );
}

export default function ChatBL() {
    const [search, setSearch] = useState("");
    const [selectedContact, setSelectedContact] = useState<Contact>(
        MOCK_CONTACTS[0],
    );
    const [messages, setMessages] = useState<MessageItem[]>(INITIAL_MESSAGES);
    const [inputMessage, setInputMessage] = useState("");
    const [attachments, setAttachments] = useState<File[]>([]);
    const [contextMenu, setContextMenu] = useState<{
        x: number;
        y: number;
        messageId: string;
    } | null>(null);
    const [isVideoCallActive, setIsVideoCallActive] = useState(false);
    const [videoCallError, setVideoCallError] = useState<string | null>(null);
    const [isMutedVideo, setIsMutedVideo] = useState(false);
    const [isMutedAudio, setIsMutedAudio] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    const filteredContacts = MOCK_CONTACTS.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()),
    );

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setContextMenu(null);
    };

    const handleContextMenu = (e: React.MouseEvent, messageId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, messageId });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;
        const files = input.files;
        if (!files?.length) return;
        const newFiles = Array.from(files);
        setAttachments((prev) => [...prev, ...newFiles]);
        input.value = "";
    };

    const removeAttachment = (index: number) => {
        setAttachments((prev) => prev.filter((_, i) => i !== index));
    };

    const startVideoCall = async () => {
        setVideoCallError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true,
            });
            localStreamRef.current = stream;
            setIsVideoCallActive(true);
        } catch (err) {
            const message =
                err instanceof Error ? err.message : "Could not access camera or microphone";
            setVideoCallError(message);
        }
    };

    const endVideoCall = () => {
        const stream = localStreamRef.current;
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
        setIsVideoCallActive(false);
        setVideoCallError(null);
        setIsMutedVideo(false);
        setIsMutedAudio(false);
    };

    const toggleMuteVideo = () => {
        const stream = localStreamRef.current;
        if (stream) {
            const newMuted = !isMutedVideo;
            stream.getVideoTracks().forEach((track) => {
                track.enabled = !newMuted;
            });
            setIsMutedVideo(newMuted);
        }
    };

    const toggleMuteAudio = () => {
        const stream = localStreamRef.current;
        if (stream) {
            const newMuted = !isMutedAudio;
            stream.getAudioTracks().forEach((track) => {
                track.enabled = !newMuted;
            });
            setIsMutedAudio(newMuted);
        }
    };

    // Attach local stream to video element when the element is mounted (callback ref handles timing)
    const setLocalVideoRef = (el: HTMLVideoElement | null) => {
        (localVideoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
        if (el && localStreamRef.current) {
            el.srcObject = localStreamRef.current;
        }
    };

    useEffect(() => {
        return () => {
            const stream = localStreamRef.current;
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
                localStreamRef.current = null;
            }
        };
    }, []);

    const buildAttachmentsFromFiles = (files: File[]): MessageAttachment[] => {
        return files.map((file) => {
            const isImage = file.type.startsWith("image/");
            return {
                name: file.name,
                url: isImage ? URL.createObjectURL(file) : undefined,
                type: isImage ? "image" : "file",
            };
        });
    };

    const sendMessage = () => {
        const text = inputMessage.trim();
        const hasAttachments = attachments.length > 0;
        if (!text && !hasAttachments) return;

        const now = new Date();
        const messageAttachments = buildAttachmentsFromFiles(attachments);
        const userMsg: MessageItem = {
            id: `user-${Date.now()}`,
            text: text || "(attachment)",
            sender: "user",
            time: formatTime(now),
            attachments: messageAttachments.length > 0 ? messageAttachments : undefined,
        };
        setMessages((prev) => [...prev, userMsg]);
        setInputMessage("");
        setAttachments([]);

        // Optional: simulate a reply from the contact after a short delay
        setTimeout(() => {
            const replyMsg: MessageItem = {
                id: `contact-${Date.now()}`,
                text: hasAttachments
                    ? `Received your ${attachments.length} file(s). (Reply from ${selectedContact.name})`
                    : `Thanks for your message. (Reply from ${selectedContact.name})`,
                sender: "contact",
                time: formatTime(new Date()),
            };
            setMessages((prev) => [...prev, replyMsg]);
        }, 800);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const closeMenu = () => setContextMenu(null);
        if (contextMenu) {
            window.addEventListener("click", closeMenu);
            return () => window.removeEventListener("click", closeMenu);
        }
    }, [contextMenu]);

    return (
        // old code
        //  <div className="space-y-4">
        //   <h2 className="text-xl font-semibold text-slate-800">Chat</h2>
        //   <div className="bg-white rounded-xl border border-slate-200 p-6">
        //     {list.length === 0 ? (
        //       <p className="text-slate-500 text-center py-8">No messages yet.</p>
        //     ) : (
        //       <ul className="space-y-3">
        //         {list.map((m) => (
        //           <li key={m.id} className="border-b border-slate-100 pb-3 last:border-0">
        //             <p className="text-sm font-medium text-slate-700">{m.sender_name ?? 'Unknown'}</p>
        //             <p className="text-slate-600">{m.message ?? '-'}</p>
        //             <p className="text-xs text-slate-400 mt-1">{m.created_at}</p>
        //           </li>
        //         ))}
        //       </ul>

        // New code
        <div>
            <h2 className="text-2xl text-black mb-4">Chat</h2>
            <div className="flex gap-4 h-[calc(100vh-8rem)] min-h-[500px] p-4 bg-transparent">
                {/* Left panel: People - separate box */}
                <div className="w-[300px] shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-white">
                        <h3 className="text-lg  text-black mt-3">People</h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Direct Conversations in your workplace
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
                    <div className="flex-1 overflow-y-auto">
                        {filteredContacts.map((contact) => (
                            <button
                                key={contact.id}
                                type="button"
                                onClick={() => setSelectedContact(contact)}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${selectedContact.id === contact.id
                                    ? "bg-slate-200/80"
                                    : "hover:bg-slate-100/80"
                                    }`}
                            >
                                <Avatar name={contact.name} />
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-900 truncate">
                                        {contact.name}
                                    </p>
                                    <p className="text-sm text-slate-500 truncate">
                                        {contact.isTyping ? "Typing..." : contact.status}
                                    </p>
                                </div>
                                <div className="flex flex-col items-end gap-0.5 shrink-0">
                                    {contact.isOnline && (
                                        <span className="inline-block w-2 h-2 rounded-full bg-green-500" />
                                    )}
                                    <span className="text-xs text-slate-400">
                                        {contact.lastActivity}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right panel: Chat conversation - separate box */}
                <div className="flex-1 flex flex-col min-w-0 rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {/* Conversation header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar name={selectedContact.name} className="w-11 h-11" />
                            <div>
                                <p className="font-semibold text-slate-900">
                                    {selectedContact.name}
                                </p>
                                <p className="text-sm text-slate-500">
                                    {selectedContact.isTyping
                                        ? "Typing..."
                                        : selectedContact.isOnline
                                            ? "Online"
                                            : selectedContact.status}
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
                            {/* <button type="button" className="p-2 rounded-lg hover:bg-slate-100" aria-label="Voice call">
              <IconPhone />
            </button> */}
                            <button
                                type="button"
                                className="p-2 bg-[#F2F2F2] rounded-full hover:bg-slate-100"
                                aria-label="Report"
                            >
                                {/* <IconAlert /> */}
                                <img src={alertIcon} alt="alert" className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-slate-200" />
                            <span className="text-xs font-medium text-slate-500">
                                13 December 2025
                            </span>
                            <div className="flex-1 h-px bg-slate-200" />
                        </div>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`relative max-w-[75%] rounded-2xl px-4 py-2.5 select-text cursor-context-menu ${msg.sender === "user"
                                        ? "bg-slate-200 text-slate-900"
                                        : "bg-slate-100 text-slate-900"
                                        }`}
                                    onContextMenu={(e) => handleContextMenu(e, msg.id)}
                                >
                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {msg.attachments.map((att, i) =>
                                                att.type === "image" && att.url ? (
                                                    <a
                                                        key={i}
                                                        href={att.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block rounded-lg overflow-hidden border border-slate-200 max-w-[200px] max-h-[160px]"
                                                    >
                                                        <img
                                                            src={att.url}
                                                            alt={att.name}
                                                            className="w-full h-auto object-cover"
                                                        />
                                                    </a>
                                                ) : (
                                                    <div
                                                        key={i}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-300/80 text-slate-800 text-sm"
                                                    >
                                                        <IconPaperclip />
                                                        <span
                                                            className="truncate max-w-[140px]"
                                                            title={att.name}
                                                        >
                                                            {att.name}
                                                        </span>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                    )}
                                    {msg.text && <p className="text-sm">{msg.text}</p>}
                                    <p className="text-xs text-slate-500 mt-1 text-right">
                                        {msg.time}
                                    </p>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Context menu - opens at cursor position on right-click on any message text */}
                    {contextMenu &&
                        createPortal(
                            <div
                                className="fixed z-9999 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 min-w-[160px]"
                                style={{ left: contextMenu.x, top: contextMenu.y }}
                            >
                                <button
                                    type="button"
                                    onClick={() => setContextMenu(null)}
                                    className="group w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 text-left transition-colors"
                                >
                                    <span className="text-slate-500 group-hover:text-red-600">
                                        <IconReply />
                                    </span>
                                    Reply
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const m = messages.find(
                                            (x) => x.id === contextMenu.messageId,
                                        );
                                        if (m) handleCopy(m.text);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 text-left transition-colors"
                                >
                                    <IconCopy />
                                    Copy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setContextMenu(null)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-100 text-left transition-colors"
                                >
                                    <IconForward />
                                    Forward
                                </button>
                            </div>,
                            document.body,
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
                            <div
                                className="flex flex-wrap gap-2 mb-2"
                                role="list"
                                aria-label="Attached files"
                            >
                                {attachments.map((file, index) => (
                                    <span
                                        key={`${file.name}-${index}`}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm overflow-hidden border border-slate-200"
                                    >
                                        <AttachmentPreview file={file} />
                                        <span
                                            className="truncate max-w-[120px] py-1.5 pr-1"
                                            title={file.name}
                                        >
                                            {file.name}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => removeAttachment(index)}
                                            className="shrink-0 p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700 m-0.5"
                                            aria-label={`Remove ${file.name}`}
                                        >
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M6 18L18 6M6 6l12 12"
                                                />
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
                            />
                            <label
                                htmlFor="chat-file-attach-input"
                                className="p-1.5 rounded-full bg-[#F2F2F2] hover:bg-slate-200/80 cursor-pointer inline-flex items-center justify-center"
                                aria-label="Attach files"
                            >
                                <IconPaperclip />
                            </label>
                            <button
                                type="button"
                                onClick={sendMessage}
                                className="flex items-center justify-center w-20 h-10 rounded-lg bg-[#F2F2F2] cursor-pointer transition-colors gap-1"
                                aria-label="Send"
                            >
                                <span className="text-xs text-black">Send</span>
                                <img src={sendIcon} alt="send" className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Video call modal: camera + placeholder for remote participant */}
            {(isVideoCallActive || videoCallError) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl w-full max-w-4xl aspect-video max-h-[85vh] flex flex-col">
                        {videoCallError ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-white">
                                <p className="text-red-300 text-center">{videoCallError}</p>
                                <p className="text-sm text-slate-400 text-center">
                                    Allow camera and microphone in your browser settings, then try
                                    again.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setVideoCallError(null)}
                                    className="px-4 py-2 rounded-xl bg-slate-600 hover:bg-slate-500 text-white"
                                >
                                    OK
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between px-4 py-3 bg-slate-800/80">
                                    <span className="text-white font-medium">
                                        Video call with {selectedContact.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={endVideoCall}
                                        className="text-slate-400 hover:text-white text-sm"
                                        aria-label="Close"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="flex-1 relative flex gap-2 p-2 min-h-0">
                                    {/* Remote participant (placeholder until real WebRTC) */}
                                    <div className="flex-1 rounded-xl bg-slate-800 flex items-center justify-center min-w-0">
                                        <div className="text-center text-slate-500">
                                            <Avatar
                                                name={selectedContact.name}
                                                className="w-20 h-20 mx-auto mb-2 opacity-80"
                                            />
                                            <p className="font-medium text-slate-400">
                                                {selectedContact.name}
                                            </p>
                                            <p className="text-sm">Waiting for them to join…</p>
                                        </div>
                                    </div>
                                    {/* Local camera - "You" feed */}
                                    <div className="w-64 shrink-0 min-h-[180px] rounded-xl overflow-hidden bg-slate-800 border-2 border-slate-600 relative">
                                        <video
                                            ref={setLocalVideoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full min-h-[180px] object-cover"
                                            style={{ transform: "scaleX(-1)" }}
                                        />
                                        <div className="absolute bottom-2 right-2 text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
                                            You
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-4 py-3 bg-slate-800/80">
                                    <button
                                        type="button"
                                        onClick={toggleMuteAudio}
                                        className={`p-3 rounded-full ${isMutedAudio ? "bg-red-600" : "bg-slate-600"} hover:opacity-90 text-white`}
                                        aria-label={
                                            isMutedAudio ? "Unmute microphone" : "Mute microphone"
                                        }
                                        title={
                                            isMutedAudio ? "Unmute microphone" : "Mute microphone"
                                        }
                                    >
                                        {isMutedAudio ? (
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                                                />
                                            </svg>
                                        ) : (
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                                />
                                            </svg>
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={toggleMuteVideo}
                                        className={`p-3 rounded-full ${isMutedVideo ? "bg-red-600" : "bg-slate-600"} hover:opacity-90 text-white`}
                                        aria-label={
                                            isMutedVideo ? "Turn on camera" : "Turn off camera"
                                        }
                                        title={isMutedVideo ? "Turn on camera" : "Turn off camera"}
                                    >
                                        {isMutedVideo ? (
                                            <svg
                                                className="w-5 h-5"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                                                />
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                                />
                                            </svg>
                                        ) : (
                                            <VideoCameraIcon className="w-5 h-5 text-white" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={endVideoCall}
                                        className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white"
                                        aria-label="End call"
                                        title="End call"
                                    >
                                        <PhoneIcon className="w-5 h-5 " />
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
