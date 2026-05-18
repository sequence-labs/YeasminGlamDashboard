export function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeUSPhoneDigits(value: string) {
  const digits = phoneDigits(value);
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

export function isCompleteUSPhone(value: string) {
  return normalizeUSPhoneDigits(value).length === 10;
}

export function formatUSPhone(value: string) {
  const digits = normalizeUSPhoneDigits(value);
  if (digits.length !== 10) {
    return value.trim();
  }
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function formatUSPhoneInput(value: string) {
  const digits = normalizeUSPhoneDigits(value).slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
