type ClassValue = string | number | bigint | null | boolean | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
