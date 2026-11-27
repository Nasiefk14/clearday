export const DEBT_TYPES = [
  { value: "CREDIT_CARD", label: "Credit card" },
  { value: "PERSONAL_LOAN", label: "Personal loan" },
  { value: "CAR", label: "Car" },
  { value: "HOME", label: "Home loan" },
  { value: "STORE", label: "Store account" },
  { value: "STUDENT", label: "Student loan" },
  { value: "OTHER", label: "Other" },
] as const;

export const CURRENCIES = ["ZAR", "USD", "EUR", "GBP", "AUD", "CAD", "NZD", "INR", "NGN", "KES"];

export const DEBT_EMOJI: Record<string, string> = {
  CREDIT_CARD: "💳",
  PERSONAL_LOAN: "🤝",
  CAR: "🚗",
  HOME: "🏠",
  STORE: "🛍️",
  STUDENT: "🎓",
  OTHER: "🧾",
};
