/** Resolve a chat attachment path from the shared messages DB to a fetchable URL. */
export function resolveChatAttachmentUrl(rawUrl: string, uploadBase = ""): string {
    if (!rawUrl || rawUrl.startsWith("blob:") || /^https?:\/\//i.test(rawUrl)) {
        return rawUrl;
    }

    let path = rawUrl.trim().replace(/\\/g, "/");
    if (path.startsWith("./../uploads/")) path = path.slice("./../uploads/".length);
    else if (path.startsWith("/uploads/")) path = path.slice("/uploads/".length);
    else if (path.startsWith("/static/uploads/")) path = path.slice("/static/uploads/".length);

    if (path.startsWith("chat/")) path = path.slice("chat/".length);
    const filename = path.includes("/") ? path.split("/").pop()! : path;
    const rel = `chat/${filename}`;
    const base = uploadBase.replace(/\/$/, "");
    return base ? `${base}/uploads/${rel}` : `/uploads/${rel}`;
}
