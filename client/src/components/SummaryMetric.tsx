type SummaryMetricProps = {
  label: string;
  value: string;
  tone?: "default" | "alert";
};

export function SummaryMetric({ label, value, tone = "default" }: SummaryMetricProps) {
  return (
    <div className={`summary-metric summary-metric--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
