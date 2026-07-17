"use client";

import { Download, FileText, FileSpreadsheet, FileArchive, File as FileIcon } from "lucide-react";
import { formatBytes, isImage, isVideo } from "@/lib/utils";
import type { Attachment } from "@/types";

function iconFor(mimeType: string) {
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.startsWith("text"))
    return FileText;
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return FileSpreadsheet;
  if (mimeType.includes("zip")) return FileArchive;
  return FileIcon;
}

export function AttachmentView({ attachment }: { attachment: Attachment }) {
  if (isImage(attachment.mimeType)) {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.url}
          alt={attachment.name}
          className="max-h-72 max-w-sm rounded-xl border object-cover shadow-sm transition-opacity hover:opacity-90"
          loading="lazy"
        />
      </a>
    );
  }

  if (isVideo(attachment.mimeType)) {
    return (
      <video
        src={attachment.url}
        controls
        className="mt-2 max-h-72 max-w-sm rounded-xl border shadow-sm"
      />
    );
  }

  const Icon = iconFor(attachment.mimeType);
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex max-w-sm items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">{formatBytes(attachment.size)}</p>
      </div>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}
