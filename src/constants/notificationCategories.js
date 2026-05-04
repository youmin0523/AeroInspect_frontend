/**
 * constants/notificationCategories.js
 * 역할: 알림 카테고리 10종 정의 — 아이콘 · 라벨 · 라이트/다크 테마별 Tailwind 클래스
 *
 *   NotificationDropdown · EmployeeLanding NotificationsSection 양쪽에서 import.
 *   백엔드 notification_category_enum 과 key 가 1:1 매핑.
 */

import {
  Calendar,
  MapPin,
  Upload,
  Briefcase,
  AlertTriangle,
  FileText,
  Cpu,
  Users,
  Settings,
  Shield,
  MessageSquare,
} from 'lucide-react'

const NOTIFICATION_CATEGORIES = {
  schedule: {
    label: '일정 관리',
    icon: Calendar,
    lightBg: 'bg-blue-100',
    lightText: 'text-blue-700',
    darkBg: 'bg-blue-500/20',
    darkText: 'text-blue-400',
    border: 'border-l-blue-500',
  },
  site: {
    label: '현장 관리',
    icon: MapPin,
    lightBg: 'bg-indigo-100',
    lightText: 'text-indigo-700',
    darkBg: 'bg-indigo-500/20',
    darkText: 'text-indigo-400',
    border: 'border-l-indigo-500',
  },
  blueprint: {
    label: '도면·사전작업',
    icon: Upload,
    lightBg: 'bg-yellow-100',
    lightText: 'text-yellow-700',
    darkBg: 'bg-yellow-500/20',
    darkText: 'text-yellow-400',
    border: 'border-l-yellow-500',
  },
  work: {
    label: '업무 알림',
    icon: Briefcase,
    lightBg: 'bg-slate-100',
    lightText: 'text-slate-700',
    darkBg: 'bg-slate-500/20',
    darkText: 'text-slate-400',
    border: 'border-l-slate-500',
  },
  defect: {
    label: '하자 탐지',
    icon: AlertTriangle,
    lightBg: 'bg-red-100',
    lightText: 'text-red-700',
    darkBg: 'bg-red-500/20',
    darkText: 'text-red-400',
    border: 'border-l-red-500',
  },
  report: {
    label: '보고서',
    icon: FileText,
    lightBg: 'bg-green-100',
    lightText: 'text-green-700',
    darkBg: 'bg-green-500/20',
    darkText: 'text-green-400',
    border: 'border-l-green-500',
  },
  drone: {
    label: '드론·장비',
    icon: Cpu,
    lightBg: 'bg-orange-100',
    lightText: 'text-orange-700',
    darkBg: 'bg-orange-500/20',
    darkText: 'text-orange-400',
    border: 'border-l-orange-500',
  },
  team: {
    label: '팀 관리',
    icon: Users,
    lightBg: 'bg-violet-100',
    lightText: 'text-violet-700',
    darkBg: 'bg-violet-500/20',
    darkText: 'text-violet-400',
    border: 'border-l-violet-500',
  },
  system: {
    label: '시스템',
    icon: Settings,
    lightBg: 'bg-gray-100',
    lightText: 'text-gray-700',
    darkBg: 'bg-gray-500/20',
    darkText: 'text-gray-400',
    border: 'border-l-gray-500',
  },
  compliance: {
    label: '계약·규정',
    icon: Shield,
    lightBg: 'bg-amber-100',
    lightText: 'text-amber-700',
    darkBg: 'bg-amber-500/20',
    darkText: 'text-amber-400',
    border: 'border-l-amber-500',
  },
  chat: {
    label: '메시지',
    icon: MessageSquare,
    lightBg: 'bg-cyan-100',
    lightText: 'text-cyan-700',
    darkBg: 'bg-cyan-500/20',
    darkText: 'text-cyan-400',
    border: 'border-l-cyan-500',
  },
}

export default NOTIFICATION_CATEGORIES
