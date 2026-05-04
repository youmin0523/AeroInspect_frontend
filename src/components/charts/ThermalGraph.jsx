/**
 * components/charts/ThermalGraph.jsx
 * 역할: 실시간 열화상 온도 추이 그래프 (Recharts)
 *       - LineChart로 max/min/avg 3개 라인 표시
 *       - 슬라이딩 윈도우: 최근 120개 샘플 표시
 *       - 임계값 기준선: △3°C (단열 결함 판정선)
 *       - WebSocket "thermal.frame" 이벤트 데이터 수신
 *       - useThermalData 훅으로 데이터 관리
 */

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import useThermalData from '../../hooks/useThermalData.js'

// 온도 단위 포맷
const formatTemp = (v) => v != null ? `${v.toFixed(1)}°C` : '-'

export default function ThermalGraph() {
  const { readings } = useThermalData()

  return (
    <div className="h-36">
      {readings.length === 0 ? (
        <div className="flex items-center justify-center h-full text-slate-600 text-sm">
          열화상 데이터 대기 중...
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={readings} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="time"
              tick={{ fill: '#64748b', fontSize: 10 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 10 }}
              tickFormatter={formatTemp}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 6 }}
              labelStyle={{ color: '#94a3b8', fontSize: 11 }}
              formatter={(value) => [formatTemp(value)]}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#94a3b8' }}
            />
            {/* 단열 결함 경고 기준선 (+3°C 편차 시 알림) */}
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="max"
              name="최고"
              stroke="#ef4444"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="avg"
              name="평균"
              stroke="#f97316"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="min"
              name="최저"
              stroke="#3b82f6"
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
