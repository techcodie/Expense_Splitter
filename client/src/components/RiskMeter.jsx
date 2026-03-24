export default function RiskMeter({ net, threshold }) {
  if (threshold <= 0 || net >= 0) return null;

  const absNet = Math.abs(net);
  const ratio = absNet / threshold;
  const pct = Math.min(ratio * 100, 100);

  let color, bgColor, label;
  if (ratio < 0.6) {
    color = 'bg-green-500';
    bgColor = 'bg-green-100 dark:bg-green-500/10';
    label = 'Low Risk';
  } else if (ratio < 0.85) {
    color = 'bg-yellow-500';
    bgColor = 'bg-yellow-100 dark:bg-yellow-500/10';
    label = 'Moderate';
  } else {
    color = 'bg-red-500';
    bgColor = 'bg-red-100 dark:bg-red-500/10';
    label = 'High Risk';
  }

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-500">Debt vs Threshold</span>
        <span className={`font-medium ${
          ratio < 0.6 ? 'text-green-600 dark:text-green-400' : ratio < 0.85 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
        }`}>
          {Math.round(pct)}% — {label}
        </span>
      </div>
      <div className={`w-full h-2 rounded-full ${bgColor} overflow-hidden`}>
        <div
          className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
