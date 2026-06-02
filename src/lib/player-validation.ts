export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidNigerianPhone(value: string) {
  const phone = normalizePhone(value);
  return /^(070|080|081|090|091)\d{8}$/.test(phone);
}

export function validateGamePlayerId(value: string, platformId?: string) {
  const cleanValue = value.trim();
  if (cleanValue.length < 3) return "Game Player ID / UID must be at least 3 characters.";
  if (platformId && cleanValue.toUpperCase() === platformId.trim().toUpperCase()) return "Do not use your Platform ID as your Game Player ID / UID. Enter the ID from inside your game.";
  if (cleanValue.length > 50) return "Game Player ID / UID must be 50 characters or less.";
  return "";
}

