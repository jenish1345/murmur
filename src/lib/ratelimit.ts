const hits = new Map<string, number[]>();
let day = new Date().toISOString().slice(0, 10);
let dayCount = 0;

const PER_IP = Number(process.env.MURMUR_PER_IP_HOURLY ?? 12);
const PER_DAY = Number(process.env.MURMUR_DAILY_CAP ?? 400);

/** In-memory guard so a public demo can't drain the API key. Returns an error message or null. */
export function checkLimit(ip: string): string | null {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    dayCount = 0;
  }
  if (dayCount >= PER_DAY) return "Murmur has hit today's demo cap. Please try again tomorrow.";

  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= PER_IP) return "You've run a lot of reviews this hour. Take a breath and retry shortly.";

  recent.push(now);
  hits.set(ip, recent);
  dayCount++;
  if (hits.size > 5000) hits.clear();
  return null;
}
