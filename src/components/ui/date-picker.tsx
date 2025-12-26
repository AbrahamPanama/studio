
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

function formatDateForInput(date: Date | undefined): string {
    if (!date) return "";
    try {
        const dateObj = new Date(date);
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
        const date = new Date(newStringValue);
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
        "w-[150px] justify-start text-left font-normal",
        !value && "text-muted-foreground"
      )}
    />
  );
}
