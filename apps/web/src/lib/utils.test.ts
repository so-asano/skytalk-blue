import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { formatDate } from "./utils";

describe("formatDate", () => {
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "Asia/Tokyo";
  });

  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  it("formats date in Japanese locale", () => {
    const result = formatDate("2024-03-15T14:30:45+09:00", "ja");
    expect(result).toBe("2024/03/15(金) 14:30:45");
  });

  it("formats date in English locale", () => {
    const result = formatDate("2024-03-15T14:30:45+09:00", "en");
    expect(result).toBe("2024/03/15(Fri) 14:30:45");
  });

  it("uses Japanese locale by default", () => {
    const result = formatDate("2024-03-15T14:30:45+09:00");
    expect(result).toBe("2024/03/15(金) 14:30:45");
  });

  it("shows correct day of week for each day in Japanese", () => {
    expect(formatDate("2024-03-10T12:00:00+09:00", "ja")).toBe("2024/03/10(日) 12:00:00");
    expect(formatDate("2024-03-11T12:00:00+09:00", "ja")).toBe("2024/03/11(月) 12:00:00");
    expect(formatDate("2024-03-12T12:00:00+09:00", "ja")).toBe("2024/03/12(火) 12:00:00");
    expect(formatDate("2024-03-13T12:00:00+09:00", "ja")).toBe("2024/03/13(水) 12:00:00");
    expect(formatDate("2024-03-14T12:00:00+09:00", "ja")).toBe("2024/03/14(木) 12:00:00");
    expect(formatDate("2024-03-15T12:00:00+09:00", "ja")).toBe("2024/03/15(金) 12:00:00");
    expect(formatDate("2024-03-16T12:00:00+09:00", "ja")).toBe("2024/03/16(土) 12:00:00");
  });

  it("shows correct day of week for each day in English", () => {
    expect(formatDate("2024-03-10T12:00:00+09:00", "en")).toBe("2024/03/10(Sun) 12:00:00");
    expect(formatDate("2024-03-11T12:00:00+09:00", "en")).toBe("2024/03/11(Mon) 12:00:00");
    expect(formatDate("2024-03-12T12:00:00+09:00", "en")).toBe("2024/03/12(Tue) 12:00:00");
    expect(formatDate("2024-03-13T12:00:00+09:00", "en")).toBe("2024/03/13(Wed) 12:00:00");
    expect(formatDate("2024-03-14T12:00:00+09:00", "en")).toBe("2024/03/14(Thu) 12:00:00");
    expect(formatDate("2024-03-15T12:00:00+09:00", "en")).toBe("2024/03/15(Fri) 12:00:00");
    expect(formatDate("2024-03-16T12:00:00+09:00", "en")).toBe("2024/03/16(Sat) 12:00:00");
  });
});
