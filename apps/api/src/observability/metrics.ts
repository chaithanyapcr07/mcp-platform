type MetricKey = string;

const counters = new Map<MetricKey, number>();

export function incrementMetric(name: string, labels: Record<string, string> = {}) {
  const key = `${name}:${JSON.stringify(labels)}`;
  counters.set(key, (counters.get(key) ?? 0) + 1);
}

export function getMetricsSnapshot() {
  return [...counters.entries()].map(([key, value]) => ({ key, value }));
}
