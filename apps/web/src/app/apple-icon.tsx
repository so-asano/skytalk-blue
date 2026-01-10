import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 180,
  height: 180,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg width="140" height="112" viewBox="0 0 40 32" fill="none">
          <path
            d="M32 12c0-4.4-3.6-8-8-8-3.2 0-6 1.9-7.3 4.6C15.8 8.2 14.9 8 14 8c-3.3 0-6 2.7-6 6 0 .4 0 .7.1 1.1C5.2 15.7 3 18.1 3 21c0 3.3 2.7 6 6 6h2l3 5 3-5h15c3.3 0 6-2.7 6-6 0-2.9-2.1-5.4-5-5.9-.1-1-.1-2.1-.1-3.1h-.9z"
            fill="#18181b"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
