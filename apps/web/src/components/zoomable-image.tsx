"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface ZoomableImageProps {
  src: string;
  alt?: string;
  inline?: boolean;
}

export function ZoomableImage({ src, alt, inline = false }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`${inline ? "inline-block align-bottom" : "block"} w-24 h-24 rounded-lg border overflow-hidden cursor-zoom-in group`}
      >
        <img
          src={src}
          alt={alt || ""}
          className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
          loading="lazy"
        />
      </button>
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setLoading(true); }}>
        <DialogContent className="max-w-7xl p-2 bg-transparent border-none shadow-none" showCloseButton={false}>
          <div
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpen(false);
              }
            }}
          >
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            <img
              src={src}
              alt={alt || ""}
              className="w-full h-auto max-h-[90vh] object-contain rounded-lg shadow-2xl pointer-events-none"
              onLoad={() => setLoading(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
