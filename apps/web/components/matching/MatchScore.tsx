'use client';

export function MatchScore({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 85
      ? { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', bar: 'bg-emerald-500' }
      : clamped >= 70
        ? { bg: 'bg-sky-100', text: 'text-sky-700', ring: 'ring-sky-200', bar: 'bg-sky-500' }
        : clamped >= 50
          ? { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200', bar: 'bg-amber-500' }
          : { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200', bar: 'bg-slate-400' };

  return (
    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ${color.bg} ${color.ring}`}>
      <span className={`text-sm font-bold ${color.text}`}>{clamped}%</span>
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/60" aria-hidden="true">
        <div className={`h-full ${color.bar}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className={`text-xs font-semibold uppercase tracking-wide ${color.text}`}>Match</span>
    </div>
  );
}
