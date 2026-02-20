import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import alertIcon from "../../assets/Chat/icon.svg";
import sendIcon from "../../assets/Chat/sendicon.svg";

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
const IconPhone = () => (
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
      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
    />
  </svg>
);
const IconAlert = () => (
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
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
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
const IconSend = () => (
  <svg
    className="w-5 h-5 text-white"
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

// Mock conversation for selected contact
const MOCK_MESSAGES: {
  id: string;
  text: string;
  sender: "user" | "contact";
  time: string;
}[] = [
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

export default function Chat() {
  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact>(
    MOCK_CONTACTS[0],
  );
  const [inputMessage, setInputMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setAttachments((prev) => [...prev, ...Array.from(files)]);
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

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
        <div className="w-[340px] shrink-0 flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
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
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  selectedContact.id === contact.id
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
                className="p-2 bg-[#F2F2F2] rounded-full hover:bg-slate-100"
                aria-label="Video call"
              >
                <IconVideo />
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
            {MOCK_MESSAGES.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[75%] rounded-2xl px-4 py-2.5 select-text cursor-context-menu ${
                    msg.sender === "user"
                      ? "bg-slate-200 text-slate-900"
                      : "bg-slate-100 text-slate-900"
                  }`}
                  onContextMenu={(e) => handleContextMenu(e, msg.id)}
                >
                  <p className="text-sm">{msg.text}</p>
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
                    const m = MOCK_MESSAGES.find(
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
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx"
              className="hidden"
              onChange={handleFileChange}
              aria-label="Attach files"
            />
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((file, index) => (
                  <span
                    key={`${file.name}-${index}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-sm"
                  >
                    <span className="truncate max-w-[120px]" title={file.name}>
                      {file.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="shrink-0 p-0.5 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-700"
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
                className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none"
              />
              <button
                type="button"
                onClick={handleAttachClick}
                className="p-1.5 rounded-full bg-[#F2F2F2] hover:bg-slate-200/80 cursor-pointer"
                aria-label="Attach files"
              >
                <IconPaperclip />
              </button>
              <button
                type="button"
                className="flex items-center justify-center w-20 h-10 rounded-xl bg-[#F2F2F2] cursor-pointer transition-colors gap-2"
                aria-label="Send"
              >
                <span className="text-xs text-black">Send</span>{" "}
                <img src={sendIcon} alt="send" className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
