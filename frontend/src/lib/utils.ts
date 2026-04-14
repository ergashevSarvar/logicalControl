import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

export function normalizeDateInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) {
    return digits
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`
}

export function parseDisplayDateToIso(value: string) {
  const normalized = normalizeDateInput(value)
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(normalized)) {
    return null
  }

  const [dayText, monthText, yearText] = normalized.split(".")
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)
  const parsed = new Date(Date.UTC(year, month - 1, day))

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null
  }

  return `${yearText}-${monthText}-${dayText}`
}

export function formatIsoDate(value: string | null | undefined, fallback = "Belgilanmagan") {
  if (!value) {
    return fallback
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    return `${day}.${month}.${year}`
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return fallback
  }

  return `${pad2(parsed.getDate())}.${pad2(parsed.getMonth() + 1)}.${parsed.getFullYear()}`
}
