// Money is integer cents in app code and Decimal(12,2) in the database.

const MAX_CENTS = 999_999_999_999; // Decimal(12,2) limit

/** Parse user input like "R 1,500.50" into cents. null if invalid, negative or too large. */
export function parseMoney(input: string): number | null {
  const s = input.replace(/[\s,]/g, "").replace(/^(R|\$|€|£)/i, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = toCents(s);
  return cents <= MAX_CENTS ? cents : null;
}

/** Decimal string (or Prisma Decimal) to cents, without float maths. */
export function toCents(value: { toString(): string }): number {
  const [whole, frac = ""] = value.toString().split(".");
  return Number(whole) * 100 + Number((frac + "00").slice(0, 2));
}

export function toDecimalString(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
