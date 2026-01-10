/**
 * TID (Timestamp ID) generation for AT Protocol records
 * TID is used as the rkey for AT Protocol records
 */
export function generateTID(): string {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `${timestamp.toString(36)}${randomPart}`;
}
