import { useEffect, useState, type ComponentProps } from "react"

import { Input } from "@/components/ui/input"
import { cn, formatIsoDate, normalizeDateInput, parseDisplayDateToIso } from "@/lib/utils"

type DateInputProps = Omit<ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: string | null | undefined
  onChange: (value: string) => void
}

export function DateInput({ value, onChange, className, placeholder = "dd.mm.yyyy", onBlur, ...props }: DateInputProps) {
  const [displayValue, setDisplayValue] = useState(() => (value ? formatIsoDate(value, "") : ""))

  useEffect(() => {
    setDisplayValue(value ? formatIsoDate(value, "") : "")
  }, [value])

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
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
      className={cn(className)}
    />
  )
}
