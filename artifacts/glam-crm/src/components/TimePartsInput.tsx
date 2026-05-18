import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from "react";

type Period = "AM" | "PM";

type TimeParts = {
  hour: string;
  minute: string;
  period: Period;
};

type TimePartsInputProps = {
  value?: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
  testIdPrefix?: string;
};

function parseTime(value?: string | null): TimeParts {
  if (!value) return { hour: "", minute: "", period: "AM" };

  const normalized = value.trim().replace(/\./g, "").toUpperCase();
  const match = normalized.match(/^(\d{1,2})(?::(\d{1,2}))?\s*(AM|PM)?$/);
  if (!match) return { hour: "", minute: "", period: "AM" };

  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  let period = (match[3] || "AM") as Period;

  if (!match[3] && hour > 12) {
    period = "PM";
    hour -= 12;
  }

  if (hour === 0) hour = 12;
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
    return { hour: "", minute: "", period: "AM" };
  }

  return {
    hour: String(hour),
    minute: String(minute).padStart(2, "0"),
    period,
  };
}

function formatTime(parts: TimeParts) {
  const hour = Number(parts.hour);
  const minute = Number(parts.minute || "0");

  if (!Number.isFinite(hour) || hour < 1 || hour > 12) return "";
  if (!Number.isFinite(minute) || minute < 0 || minute > 59) return "";

  return `${hour}:${String(minute).padStart(2, "0")} ${parts.period}`;
}

export function TimePartsInput({ value, onChange, disabled, testIdPrefix = "time" }: TimePartsInputProps) {
  const [parts, setParts] = useState<TimeParts>(() => parseTime(value));

  useEffect(() => {
    if ((value ?? "") !== formatTime(parts)) {
      setParts(parseTime(value));
    }
  }, [value]);

  const update = (partial: Partial<TimeParts>) => {
    const nextParts = { ...parts, ...partial };
    setParts(nextParts);
    onChange(formatTime(nextParts));
  };

  const normalize = () => {
    setParts(parseTime(formatTime(parts)));
  };

  return (
    <div className="grid grid-cols-[1fr_1fr_96px] gap-2">
      <Input
        type="number"
        min={1}
        max={12}
        inputMode="numeric"
        placeholder="6"
        value={parts.hour}
        disabled={disabled}
        onChange={(event) => update({ hour: event.target.value })}
        onBlur={normalize}
        data-testid={`${testIdPrefix}-hour`}
      />
      <Input
        type="number"
        min={0}
        max={59}
        inputMode="numeric"
        placeholder="30"
        value={parts.minute}
        disabled={disabled}
        onChange={(event) => update({ minute: event.target.value })}
        onBlur={normalize}
        data-testid={`${testIdPrefix}-minute`}
      />
      <Select value={parts.period} onValueChange={(period: Period) => update({ period })} disabled={disabled}>
        <SelectTrigger data-testid={`${testIdPrefix}-period`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
