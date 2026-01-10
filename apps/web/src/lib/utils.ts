import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { ja, enUS } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isMac() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent)
}

export function formatDate(dateStr: string, locale: string = "ja") {
  const date = new Date(dateStr)
  const localeObj = locale === "ja" ? ja : enUS
  return format(date, "yyyy/MM/dd(EEE) HH:mm:ss", { locale: localeObj })
}
