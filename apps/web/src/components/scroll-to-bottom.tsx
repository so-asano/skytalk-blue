"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScrollToBottom() {
  const [isScrollable, setIsScrollable] = useState(false);
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(false);
  const [rightPosition, setRightPosition] = useState(16);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScroll = () => {
      const scrollable = document.documentElement.scrollHeight > window.innerHeight;
      setIsScrollable(scrollable);

      if (!scrollable) {
        setAtTop(true);
        setAtBottom(true);
        return;
      }

      const scrollTop = window.scrollY;
      const nearTop = scrollTop < 100;
      const nearBottom = window.innerHeight + scrollTop >= document.documentElement.scrollHeight - 100;

      setAtTop(nearTop);
      setAtBottom(nearBottom);
    };

    const updatePosition = () => {
      // Find the main content container
      const container = document.querySelector("main");
      if (container) {
        const rect = container.getBoundingClientRect();
        const rightEdge = rect.right;
        const viewportWidth = window.innerWidth;
        // Position button 16px to the right of content, but at least 16px from viewport edge
        const newRight = Math.max(16, viewportWidth - rightEdge - 56);
        setRightPosition(newRight);
      }
    };

    checkScroll();
    updatePosition();

    // Observe body size changes to detect when content loads
    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
      updatePosition();
    });
    resizeObserver.observe(document.body);

    window.addEventListener("scroll", checkScroll);
    window.addEventListener("resize", () => {
      checkScroll();
      updatePosition();
    });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      window.removeEventListener("resize", updatePosition);
    };
  }, []);

  const smoothScroll = (target: number, duration: number = 300) => {
    const start = window.scrollY;
    const distance = target - start;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      window.scrollTo(0, start + distance * ease);
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  };

  const scrollToTop = () => {
    smoothScroll(0);
  };

  const scrollToBottom = () => {
    smoothScroll(document.documentElement.scrollHeight);
  };

  if (!isScrollable) return null;

  return (
    <div
      ref={containerRef}
      className="fixed top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2"
      style={{ right: rightPosition }}
    >
      <Button
        variant="outline"
        size="icon"
        className="rounded-full shadow-lg bg-background/80 backdrop-blur-sm"
        onClick={scrollToTop}
        disabled={atTop}
      >
        <ChevronUp className="h-5 w-5" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="rounded-full shadow-lg bg-background/80 backdrop-blur-sm"
        onClick={scrollToBottom}
        disabled={atBottom}
      >
        <ChevronDown className="h-5 w-5" />
      </Button>
    </div>
  );
}
