"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
};

// Helper to format date to "yyyy-MM-dd" for the input
function formatDateForInput(date: Date | undefined): string {
    if (!date) return "";
    try {
        // Create a new date object to avoid modifying the original one
        const dateObj = new Date(date);
        // Adjust for timezone offset to get the correct local date
        const adjustedDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000));
        return adjustedDate.toISOString().split('T')[0];
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
        // The input value is 'YYYY-MM-DD'. It's treated as local time by the browser.
        // new Date() will parse it correctly as local time midnight.
        const date = new Date(newStringValue);
         // To avoid timezone issues when it's sent to the server, we adjust it to be UTC midnight
        const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
        onChange(utcDate);
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
        "w-full justify-start text-left font-normal",
        !value && "text-muted-foreground"
      )}
    />
  );
}
