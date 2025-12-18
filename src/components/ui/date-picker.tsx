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
    // Ensure the date is treated as local time when formatting for the input
    const localDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60000);
    return format(localDate, "yyyy-MM-dd");
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
        // The input value is a string 'YYYY-MM-DD'.
        // parseISO treats it as UTC midnight.
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
