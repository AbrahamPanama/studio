"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { format, parseISO } from 'date-fns';

type DatePickerProps = {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
};

// Helper to format date to "yyyy-MM-dd" for the input
function formatDateForInput(date: Date | undefined): string {
  if (!date) return "";
  try {
    return format(date, "yyyy-MM-dd");
  } catch {
    return "";
  }
}

export function DatePicker({ value, onChange, disabled }: DatePickerProps) {
  const [inputValue, setInputValue] = React.useState<string>(formatDateForInput(value));

  React.useEffect(() => {
    setInputValue(formatDateForInput(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStringValue = e.target.value;
    setInputValue(newStringValue);
    if (newStringValue) {
        // The input value is a string 'YYYY-MM-DD'. The time zone is UTC.
        // We parse it and then pass it to the form.
        const date = parseISO(newStringValue);
        onChange(date);
    } else {
      onChange(undefined);
    }
  };

  return (
    <Input
      type="date"
      value={inputValue}
      onChange={handleChange}
      disabled={disabled}
      className={cn(
        "w-[150px] justify-start text-left font-normal",
        !value && "text-muted-foreground"
      )}
    />
  );
}
