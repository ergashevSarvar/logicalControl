import { CalendarDays } from "lucide-react"
import { useEffect, useState, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { cn, formatIsoDate, normalizeDateInput, parseDisplayDateToIso } from "@/lib/utils"

type DateInputProps = Omit<ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: string | null | undefined
  onChange: (value: string) => void
}

export function DateInput({
  value,
  onChange,
  className,
  placeholder = "dd.mm.yyyy",
  onBlur,
  min,
  max,
  disabled,
  ...props
}: DateInputProps) {
  const [displayValue, setDisplayValue] = useState(() => (value ? formatIsoDate(value, "") : ""))

  useEffect(() => {
    setDisplayValue(value ? formatIsoDate(value, "") : "")
  }, [value])

  return (
    <div className="relative">
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        maxLength={10}
        value={displayValue}
        onChange={(event) => {
          const nextDisplayValue = normalizeDateInput(event.target.value)
          setDisplayValue(nextDisplayValue)

          if (!nextDisplayValue) {
            onChange("")
            return
          }

          const parsed = parseDisplayDateToIso(nextDisplayValue)
          if (parsed) {
            onChange(parsed)
          }
        }}
        onBlur={(event) => {
          if (displayValue && !parseDisplayDateToIso(displayValue)) {
            setDisplayValue(value ? formatIsoDate(value, "") : "")
          }
          onBlur?.(event)
        }}
        className={cn("pr-11", className)}
      />

      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground">
        <CalendarDays className="size-4" />
      </div>

      <input
        type="date"
        value={value ?? ""}
        min={min}
        max={max}
        disabled={disabled}
        aria-label="Sanani tanlash"
        className="absolute inset-y-1 right-1 w-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        onChange={(event) => {
          const nextValue = event.target.value
          setDisplayValue(nextValue ? formatIsoDate(nextValue, "") : "")
          onChange(nextValue)
        }}
      />
    </div>
  )
}
