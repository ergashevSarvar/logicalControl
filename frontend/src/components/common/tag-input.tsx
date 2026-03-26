import { useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TagInputProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function addTag(rawValue: string) {
    const nextValue = rawValue.trim();
    if (!nextValue || value.includes(nextValue)) {
      return;
    }
    onChange([...value, nextValue]);
    setDraft("");
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/80 p-3">
      <div className="flex flex-wrap gap-2">
        {value.length === 0 ? <p className="text-sm text-muted-foreground">{placeholder}</p> : null}
        {value.map((item) => (
          <Badge key={item} variant="secondary" className="h-8 gap-2 rounded-full px-3">
            {item}
            <button
              type="button"
              className="rounded-full p-0.5 text-muted-foreground transition hover:bg-background hover:text-foreground"
              onClick={() => onChange(value.filter((current) => current !== item))}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addTag(draft);
            }
          }}
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={() => addTag(draft)}>
          Add
        </Button>
      </div>
    </div>
  );
}
