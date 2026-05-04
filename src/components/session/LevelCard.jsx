/**
 * components/session/LevelCard.jsx
 * 역할: Level 선택 카드 — L1(CAD) / L2(평면도) / L3(자율비행) 공용
 *       - 클릭 시 onSelect(level) 호출
 *       - selected=true 면 accent(emerald) 글로우
 *       - recommended=true 면 우상단 "추천" 뱃지 (L3 에 사용)
 */

export default function LevelCard({
  level,
  icon: Icon,
  title,
  subtitle,
  bullets = [],
  selected,
  recommended,
  onSelect,
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(level)}
      className={`group relative flex flex-col text-left h-full w-full rounded-2xl border px-5 py-5 transition ${
        selected
          ? 'bg-accent-500/10 border-accent-500 ring-2 ring-accent-500/30'
          : 'bg-neutral-900/70 border-neutral-700/60 hover:border-neutral-500'
      }`}
    >
      {recommended && (
        <span className="absolute top-3 right-3 px-2 py-0.5 rounded bg-accent-500 text-white text-[10px] font-semibold">
          추천
        </span>
      )}

      {/* 상단 아이콘 + 레벨 번호 */}
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            selected ? 'bg-accent-500/20 text-accent-300' : 'bg-neutral-800 text-slate-300'
          }`}
        >
          <Icon size={24} />
        </div>
        <span
          className={`text-[10px] font-mono font-bold tracking-widest ${
            selected ? 'text-accent-300' : 'text-slate-500'
          }`}
        >
          LEVEL {level}
        </span>
      </div>

      {/* 타이틀 */}
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-slate-400 mb-4 break-keep">{subtitle}</p>

      {/* 불릿 */}
      <ul className="flex-1 space-y-1 text-[11px] text-slate-400">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="text-accent-400 mt-0.5">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {/* 하단 상태 */}
      <div
        className={`mt-4 text-[10px] font-mono uppercase tracking-wider text-center py-1.5 rounded-md border transition ${
          selected
            ? 'bg-accent-500 border-accent-500 text-slate-900'
            : 'bg-neutral-950/40 border-neutral-700 text-slate-500 group-hover:text-slate-300'
        }`}
      >
        {selected ? 'Selected' : 'Tap to select'}
      </div>
    </button>
  )
}
