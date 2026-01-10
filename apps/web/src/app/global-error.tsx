"use client";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
          <h1 className="text-4xl font-bold mb-4">500</h1>
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-6">An unexpected error occurred.</p>
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </body>
    </html>
  );
}
