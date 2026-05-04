/**
 * components/defects/SeverityBadge.jsx
 * 역할: 하자 심각도 표시 컬러 칩 컴포넌트
 *       - HIGH: 빨간 배지
 *       - MED: 주황 배지
 *       - LOW: 노랑 배지
 */

import clsx from 'clsx'

const CLASS_MAP = {
  HIGH: 'badge-high',
  MED:  'badge-med',
  LOW:  'badge-low',
}

const LABEL_MAP = {
  HIGH: 'HIGH',
  MED:  'MED',
  LOW:  'LOW',
}

export default function SeverityBadge({ severity, className }) {
  const badgeClass = CLASS_MAP[severity] || CLASS_MAP.MED
  return (
    <span className={clsx(badgeClass, className)}>
      {LABEL_MAP[severity] || severity}
    </span>
  )
}
