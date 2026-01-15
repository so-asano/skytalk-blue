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
        <svg width="140" height="140" viewBox="0 0 32 32" fill="none">
          <g transform="translate(0, 1)">
            <path
              d="M22.4,11.2C22.4,8.56 20.24,6.4 17.6,6.4C15.68,6.4 14,7.52 13.2,9.2C12.72,8.96 12.16,8.8 11.6,8.8C9.6,8.8 8,10.4 8,12.4C8,12.64 8,12.8 8.08,13.04C6.4,13.44 5.2,14.88 5.2,16.6C5.2,18.6 6.8,20.2 8.8,20.2L10,20.2L11.8,23.2L13.6,20.2L22.8,20.2C24.8,20.2 26.4,18.6 26.4,16.6C26.4,14.84 25.12,13.4 23.4,13.08C23.32,12.44 22.4,11.2 22.4,11.2Z"
              fill="#18181b"
            />
          </g>
        </svg>
      </div>
    ),
    {
      ...size,
    }
  );
}
