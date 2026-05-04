/**
 * Signup.jsx
 * 역할: 회원가입 페이지
 *       - 상단 탭으로 고객 유형 전환 (개인 / 사업자)
 *       - 사업자: 사업자번호/대표자명/개업일자 진위 확인 섹션 노출
 *       - 공통: 이메일(중복확인), 아이디(중복확인), 비밀번호(자동생성), 휴대폰, 이름
 *       - 약관 동의 (전체 ↔ 개별 연동)
 */

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import logoDark from '../assets/logo/logo_transparent-removebg-preview.png'
import { checkBusinessStatus, interpretStatus } from '../api/businessVerifyApi'
import { checkEmail, checkUsername, signup } from '../api/authApi'

// 눈 아이콘 (비밀번호 표시)
function EyeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  )
}

// 눈 감김 아이콘 (비밀번호 숨김)
function EyeOffIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.6} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.243 4.243L9.88 9.88" />
    </svg>
  )
}

// 탭 구성
const SIGNUP_TABS = [
  { value: 'personal', label: '개인' },
  { value: 'business', label: '사업자 (개인/법인)' },
]

// 약관 항목 (내용은 아래 TERMS_CONTENT 참고)
const TERMS = [
  { id: 'service', label: '[필수] 서비스 이용약관 동의', required: true },
  { id: 'privacy', label: '[필수] 개인정보 수집 및 이용 동의', required: true },
  { id: 'marketing', label: '[선택] 마케팅 정보 수신 동의', required: false },
]

// 약관 전문 (실제 서비스에서는 별도 문서/CMS에서 관리 권장)
const TERMS_CONTENT = {
  service: {
    title: '서비스 이용약관',
    body: `제 1 조 (목적)
본 약관은 DRONE INSPECT(이하 "회사")가 제공하는 드론 기반 3D 모델링 및 정밀 하자점검 플랫폼 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.

제 2 조 (용어의 정의)
1. "서비스"란 회사가 드론 비행 데이터, 영상, 열화상, LiDAR 등을 기반으로 제공하는 3D 모델링, 하자 탐지, 리포트 생성 등의 일체의 온·오프라인 서비스를 말합니다.
2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 개인 및 사업자·법인 회원을 의미합니다.
3. "계정"이란 이용자 식별과 서비스 이용을 위하여 이용자가 설정하고 회사가 승인한 이메일·아이디 및 비밀번호의 조합을 말합니다.
4. "AI 분석 결과"란 회사의 인공지능 모델이 드론 영상·열화상 데이터를 기반으로 자동 생성한 하자 후보, 신뢰도 점수, 분류 결과 등의 일체의 분석 산출물을 말합니다.

제 3 조 (약관의 효력 및 변경)
1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.
2. 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 시 적용일자 및 개정사유를 명시하여 최소 7일 이전부터 공지합니다.

제 4 조 (서비스의 제공 및 변경)
1. 회사는 드론 데이터 수집, 3D 디지털 트윈 생성, 열화상/AI 기반 하자 탐지, 리포트 생성 및 관제 대시보드 제공 등의 서비스를 제공합니다.
2. 회사는 서비스의 품질 향상을 위해 서비스의 내용 및 제공 방식을 변경할 수 있으며, 중대한 변경 시 사전에 공지합니다.

제 5 조 (이용자의 의무)
이용자는 서비스 이용 시 다음 행위를 하여서는 안 됩니다.
- 타인의 정보 도용, 허위 정보 등록
- 회사의 지적재산권 및 제3자의 권리 침해
- 드론 촬영 데이터의 무단 복제·배포
- 기타 관련 법령에 위반되는 행위

제 6 조 (AI 분석 결과의 성격 및 한계)
1. 본 서비스가 제공하는 AI 분석 결과는 자격을 갖춘 검사관·기술사·건축사 등 전문가의 검사 활동을 보조하기 위한 참고 자료이며, 그 자체로 법적·기술적 진단·판단을 대체하지 않습니다.
2. AI 분석 결과는 학습 데이터, 촬영 환경(조명·각도·거리·기상), 장비 상태, 건축물 특성 등 다양한 요인에 따라 정확도가 변동될 수 있으며, 회사는 분석 결과의 완전성·정확성·적합성을 보증하지 아니합니다.
3. AI 분석 결과에는 미탐지(False Negative) 및 오탐지(False Positive)가 포함될 수 있으며, 이용자는 이를 이해하고 모든 분석 결과를 자격을 갖춘 검사관의 직접 확인 및 최종 판정 절차를 거쳐 사용할 의무가 있습니다.
4. 이용자는 AI 분석 결과에 표시된 신뢰도(Confidence) 정보를 확인하고, 낮은 신뢰도 또는 의심 영역에 대해서는 추가 현장 점검·정밀 진단을 수행해야 합니다.

제 7 조 (책임의 제한)
1. 회사는 AI 분석 결과만에 의존하여 발생한 직접·간접 손해, 미탐지 또는 오탐지로 인한 후속 조치 누락·과잉, 그로 인한 분쟁·청구·소송에 대해 어떠한 책임도 부담하지 않습니다. 다만 회사의 고의 또는 중대한 과실이 입증된 경우에는 그러하지 아니합니다.
2. 본 서비스를 통한 점검·진단의 최종 책임은 해당 점검 활동을 수행하고 이용자가 지정한 자격을 갖춘 전문가(검사관·기술사·건축사 등) 및 이용자(법인·사업자)에게 있습니다.
3. 입주자·실거주자·시공사·발주처 등 제3자에 대한 손해 발생 시, 그 손해의 1차 책임은 검사 활동을 수행한 전문가 및 이용자에게 있으며, 회사는 도구 제공자로서 본 약관에 명시된 기능적 책임 범위 내에서만 한정 책임을 부담합니다.
4. 천재지변, 통신·전력 장애, 외부 시스템 장애, 이용자 환경 문제 등 회사의 통제 범위를 벗어난 사유로 발생한 서비스 중단·오류·결과 손상에 대해 회사는 책임을 부담하지 않습니다.

제 8 조 (감사 추적 및 기록 보존)
1. 회사는 이용자가 본 서비스를 통해 수행한 모든 검출·검토·승인 활동의 로그(시각, 이용자, 신뢰도 점수, 검토 결과 등)를 일정 기간 보존하며, 분쟁 발생 시 책임 소재 판단의 근거 자료로 제공합니다.
2. 이용자는 자신의 검토·승인 행위가 감사 로그에 기록된다는 사실을 인지하고 동의합니다.

제 9 조 (사용 권장 환경 및 권장 절차)
1. 회사는 다음 절차에 따른 서비스 이용을 권장합니다.
   ① AI 분석 결과 자동 생성 → ② 자격을 갖춘 검사관의 결과 검토 → ③ 신뢰도 낮음 또는 의심 영역에 대한 현장 재점검 → ④ 검사관의 최종 판정 및 서명 → ⑤ 이용자(법인) 책임자의 리포트 승인 → ⑥ 발주처·고객 전달
2. 위 절차를 생략하거나 단축하여 발생한 손해에 대해 회사는 책임을 부담하지 않습니다.`,
  },
  privacy: {
    title: '개인정보 수집 및 이용 동의',
    body: `DRONE INSPECT는 「개인정보 보호법」에 따라 회원 가입 및 서비스 제공을 위해 아래와 같이 개인정보를 수집·이용합니다.

■ 수집하는 개인정보 항목
[필수 항목]
- 공통: 이메일, 아이디, 비밀번호, 휴대폰 번호, 이름
- 사업자 회원: 사업자등록번호, 상호(법인명), 대표자 성명, 개업일자, 담당자 정보

[자동 수집 항목]
- 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP, 기기 정보

■ 개인정보의 수집·이용 목적
1. 회원 식별 및 본인 확인
2. 서비스 제공(드론 데이터 분석, 3D 모델링, 하자 리포트 제공) 및 계약의 이행
3. 고객 상담, 민원 처리 및 공지사항 전달
4. 서비스 개선 및 신규 서비스 개발에 활용
5. 부정 이용 방지 및 비인가 사용 방지

■ 개인정보의 보유·이용 기간
회원 탈퇴 시까지 보유하며, 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
- 전자상거래 관련 기록: 최대 5년 (전자상거래법)
- 서비스 이용 로그 기록: 3개월 (통신비밀보호법)

■ 동의 거부 권리 및 불이익
이용자는 개인정보 수집·이용에 대한 동의를 거부할 권리가 있으며, 거부 시 회원가입 및 서비스 이용이 제한될 수 있습니다.`,
  },
  marketing: {
    title: '마케팅 정보 수신 동의',
    body: `DRONE INSPECT는 이용자에게 다음과 같은 마케팅·광고성 정보를 제공하기 위해 개인정보를 이용하고자 합니다.

■ 이용 목적
- 신규 서비스 및 기능 업데이트 안내
- 이벤트, 프로모션, 할인 혜택 등 마케팅 정보 제공
- 맞춤형 콘텐츠 및 추천 서비스 제공
- 설문조사 및 이용자 분석

■ 이용 항목
이메일, 휴대폰 번호, 이름, 서비스 이용 이력

■ 보유·이용 기간
동의 철회 시 또는 회원 탈퇴 시까지

■ 전송 수단
이메일, SMS/LMS/MMS, 앱 푸시 알림 등

※ 본 동의는 선택사항이며, 동의하지 않으셔도 서비스 이용에는 제한이 없습니다.
※ 동의 후에도 언제든지 수신 거부가 가능하며, 계정 설정에서 변경할 수 있습니다.
※ 법령에 따라 발송되는 의무적 안내 메시지(주문·결제 내역, 보안 공지 등)는 본 동의 여부와 무관하게 발송됩니다.`,
  },
}

const INITIAL_FORM = {
  // 사업자 인증 (국세청 상태조회 API 기준 — 개업일자 없이 번호만으로 상태 확인 가능)
  bizNumber: '',
  bizCeoName: '',
  // 공통
  emailLocal: '',   // @ 앞부분
  emailDomain: '',  // @ 뒷부분 (직접입력 또는 프리셋)
  userId: '',
  password: '',
  passwordConfirm: '',
  phone: '',
  name: '',
}

// 자주 사용하는 이메일 도메인 프리셋 (value === '' ⇒ 직접입력)
const EMAIL_DOMAINS = [
  { value: '', label: '직접입력' },
  { value: 'gmail.com', label: 'gmail.com' },
  { value: 'naver.com', label: 'naver.com' },
  { value: 'daum.net', label: 'daum.net' },
  { value: 'kakao.com', label: 'kakao.com' },
  { value: 'nate.com', label: 'nate.com' },
  { value: 'hanmail.net', label: 'hanmail.net' },
  { value: 'outlook.com', label: 'outlook.com' },
]

// 휴대폰 번호 자동 포맷팅: 010-0000-0000 / 011-000-0000 등 대응
// - 숫자만 추출 후 길이에 따라 하이픈 삽입
function formatPhone(input) {
  const digits = (input || '').replace(/\D/g, '').slice(0, 11)
  if (digits.length < 4) return digits
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  // 11자리: 3-4-4, 10자리(011/016~019 등): 3-3-4
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
}

// 무작위 비밀번호 생성 (12자, 영문/숫자/특수문자 혼합)
function generatePassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let pw = ''
  for (let i = 0; i < 12; i++) {
    pw += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pw
}

export default function Signup() {
  const navigate = useNavigate()
  const [signupType, setSignupType] = useState('personal')
  const [form, setForm] = useState(INITIAL_FORM)
  const [error, setError] = useState('')
  const [verifyState, setVerifyState] = useState({ status: 'idle', message: '' })

  // 약관 동의 상태 (id → boolean)
  const [termsAgreed, setTermsAgreed] = useState(
    TERMS.reduce((acc, t) => ({ ...acc, [t.id]: false }), {}),
  )

  // 중복확인 결과 상태: { email: { checked, available, message }, userId: { ... } }
  const [dupCheck, setDupCheck] = useState({
    email: { checked: false, available: false, message: '' },
    userId: { checked: false, available: false, message: '' },
  })

  // 비밀번호 가시성 토글
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)

  // 이메일 도메인 프리셋 선택 (value === '' ⇒ 직접입력 모드, 도메인 input 활성)
  const [emailDomainPreset, setEmailDomainPreset] = useState('')

  // 약관 내용 보기 모달 (열린 약관의 id, 닫혔을 땐 null)
  const [viewingTermId, setViewingTermId] = useState(null)

  // 모달 열려 있을 때 ESC로 닫기 + 배경 스크롤 잠금
  useEffect(() => {
    if (!viewingTermId) return
    const onKey = (e) => {
      if (e.key === 'Escape') setViewingTermId(null)
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [viewingTermId])

  const pwInputRef = useRef(null)

  const isBusiness = signupType === 'business'

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError('')
    // 이메일 관련 필드 변경 시 이메일 중복확인 리셋
    if (key === 'emailLocal' || key === 'emailDomain') {
      setDupCheck((prev) => ({ ...prev, email: { checked: false, available: false, message: '' } }))
    }
    // 아이디 변경 시 아이디 중복확인 리셋
    if (key === 'userId') {
      setDupCheck((prev) => ({ ...prev, userId: { checked: false, available: false, message: '' } }))
    }
  }

  const handleTypeChange = (type) => {
    setSignupType(type)
    setForm(INITIAL_FORM)
    setError('')
    setVerifyState({ status: 'idle', message: '' })
    setEmailDomainPreset('')
  }

  // 이메일 도메인 프리셋 변경
  const handleDomainPresetChange = (value) => {
    setEmailDomainPreset(value)
    if (value !== '') {
      // 프리셋 선택 시 도메인 input에 자동 반영
      setForm((prev) => ({ ...prev, emailDomain: value }))
    } else {
      // '직접입력' 전환 시 도메인 비우기
      setForm((prev) => ({ ...prev, emailDomain: '' }))
    }
    setError('')
  }

  // 조합된 이메일 문자열 (검증·API 전송용)
  const composedEmail =
    form.emailLocal && form.emailDomain
      ? `${form.emailLocal}@${form.emailDomain}`
      : ''

  // 사업자 진위 확인 — 공공데이터포털(odcloud.kr) 국세청 상태조회 API 연동
  const verifyBusiness = async () => {
    const bizNum = form.bizNumber.trim()
    if (bizNum.length !== 10 || Number.isNaN(Number(bizNum))) {
      setVerifyState({ status: 'error', message: '유효한 10자리 사업자등록번호를 입력해주세요.' })
      return
    }
    if (!form.bizCeoName.trim()) {
      setVerifyState({ status: 'error', message: '대표자 성명을 입력해주세요.' })
      return
    }
    setVerifyState({ status: 'loading', message: '국세청 데이터 조회 중...' })

    try {
      const result = await checkBusinessStatus(bizNum)
      const { ok, message } = interpretStatus(result)
      setVerifyState({ status: ok ? 'success' : 'error', message })
    } catch (err) {
      const serverMsg =
        err?.response?.data?.msg ||
        err?.response?.data?.message ||
        err?.message ||
        '알 수 없는 오류'
      setVerifyState({
        status: 'error',
        message: `조회 실패: ${serverMsg}`,
      })
    }
  }

  // 중복 확인 — 백엔드 API 연동
  const handleDuplicateCheck = async (field) => {
    const isEmail = field === 'email'
    const label = isEmail ? '이메일' : '아이디'
    const value = isEmail ? composedEmail : form.userId?.trim()
    if (!value) {
      alert(`${label}을(를) 입력해주세요.`)
      return
    }

    try {
      const { data } = isEmail
        ? await checkEmail(value)
        : await checkUsername(value)

      setDupCheck((prev) => ({
        ...prev,
        [isEmail ? 'email' : 'userId']: {
          checked: true,
          available: data.available,
          message: data.message,
        },
      }))
    } catch (err) {
      const msg = err?.response?.data?.detail || '중복 확인 중 오류가 발생했습니다.'
      setDupCheck((prev) => ({
        ...prev,
        [isEmail ? 'email' : 'userId']: {
          checked: true,
          available: false,
          message: msg,
        },
      }))
    }
  }

  // 비밀번호 자동생성 — 생성 후 눈 아이콘 토글로 자동 노출하여 사용자가 직접 확인
  const handleGeneratePassword = () => {
    const pw = generatePassword()
    setForm((prev) => ({ ...prev, password: pw, passwordConfirm: pw }))
    setShowPw(true)
    setShowPwConfirm(true)
  }

  // 약관 전체 동의 토글
  const toggleAllTerms = (checked) => {
    setTermsAgreed(TERMS.reduce((acc, t) => ({ ...acc, [t.id]: checked }), {}))
  }

  const toggleTerm = (id, checked) => {
    setTermsAgreed((prev) => ({ ...prev, [id]: checked }))
  }

  const allTermsChecked = TERMS.every((t) => termsAgreed[t.id])

  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (isBusiness) {
      if (verifyState.status !== 'success') {
        setError('사업자 진위 확인을 먼저 완료해주세요.')
        return
      }
    }

    if (!composedEmail || !form.userId || !form.password || !form.passwordConfirm || !form.phone || !form.name) {
      setError('모든 항목을 입력해주세요.')
      return
    }
    // 중복확인 완료 여부 검증
    if (!dupCheck.email.checked || !dupCheck.email.available) {
      setError('이메일 중복 확인을 완료해주세요.')
      return
    }
    if (!dupCheck.userId.checked || !dupCheck.userId.available) {
      setError('아이디 중복 확인을 완료해주세요.')
      return
    }
    if (form.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }
    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    // 필수 약관 체크
    const missingRequired = TERMS.filter((t) => t.required && !termsAgreed[t.id])
    if (missingRequired.length > 0) {
      setError('필수 약관에 모두 동의해주세요.')
      return
    }

    // 백엔드 회원가입 API 호출
    setSubmitting(true)
    setError('')

    const payload = {
      account_type: signupType,
      email: composedEmail,
      username: form.userId,
      password: form.password,
      name: form.name,
      phone: form.phone,
      terms: {
        service: termsAgreed.service,
        privacy: termsAgreed.privacy,
        marketing: termsAgreed.marketing,
      },
      ...(isBusiness && {
        business: {
          biz_number: form.bizNumber,
          ceo_name: form.bizCeoName,
        },
      }),
    }

    try {
      await signup(payload)
      alert(`회원가입이 완료되었습니다.\n아이디: ${form.userId}\n로 로그인해주세요.`)
      navigate('/login')
    } catch (err) {
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string') {
        setError(detail)
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(', '))
      } else {
        setError('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // 탭 버튼 스타일
  const tabClass = (active) =>
    `flex-1 py-2 text-sm font-bold rounded-md transition ${
      active
        ? 'bg-white text-blue-600 shadow-sm'
        : 'text-gray-500 hover:text-slate-700'
    }`

  // 진위 확인 메시지 색상
  const verifyTextClass = {
    idle: 'hidden',
    loading: 'text-xs font-medium text-slate-500',
    success: 'text-xs font-medium text-green-600',
    error: 'text-xs font-medium text-red-600',
  }[verifyState.status]

  // pwInput이 외부에서 변경됐을 때 포커스 유지용 (사용 안 해도 안전)
  useEffect(() => {}, [form.password])

  return (
    <div className="font-sans antialiased text-gray-800 bg-gray-50 flex items-center justify-center min-h-screen py-4 px-4">
      <div className="w-full max-w-2xl bg-white px-6 py-4 md:px-8 md:py-5 rounded-2xl shadow-xl border border-gray-100">
        {/* 타이틀 ─ 좌측 로고(공백 중앙) + 중앙 제목 + 우측 밸런스 스페이서 */}
        <div className="flex items-center mb-3">
          {/* 좌측: 로고 전용 컬럼 */}
          <Link
            to="/"
            aria-label="홈으로 이동"
            className="w-20 shrink-0 flex justify-center hover:opacity-80 transition"
          >
            <img
              src={logoDark}
              alt="DRONE INSPECT 홈"
              className="h-12 w-auto object-contain"
            />
          </Link>
          {/* 중앙: 제목 */}
          <div className="flex-1 text-center">
            <Link to="/" className="inline-block">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tighter hover:text-blue-600 transition">
                회원가입
              </h1>
            </Link>
          </div>
          {/* 우측: 메인화면으로 나가기 */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="이전 화면으로 이동"
            className="w-20 shrink-0 flex items-center justify-center text-gray-400 hover:text-blue-600 transition"
          >
            <i className="ri-corner-up-left-line text-2xl" />
          </button>
        </div>

        {/* 탭 선택 */}
        <div className="flex p-1 bg-gray-100 rounded-lg mb-3">
          {SIGNUP_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleTypeChange(tab.value)}
              className={tabClass(signupType === tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          {/* ── 사업자 정보 인증 박스 (한 줄 레이아웃) ── */}
          {isBusiness && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm">사업자 정보 인증</h3>
              <div className="grid grid-cols-[1.2fr_1fr_auto] gap-2 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    사업자등록번호
                  </label>
                  <input
                    type="text"
                    value={form.bizNumber}
                    onChange={(e) => {
                      updateField('bizNumber', e.target.value)
                      setVerifyState({ status: 'idle', message: '' })
                    }}
                    placeholder="'-' 제외 10자리"
                    maxLength={10}
                    className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    대표자 성명
                  </label>
                  <input
                    type="text"
                    value={form.bizCeoName}
                    onChange={(e) => {
                      updateField('bizCeoName', e.target.value)
                      setVerifyState({ status: 'idle', message: '' })
                    }}
                    placeholder="대표자명"
                    className="w-full px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={verifyBusiness}
                  className="px-4 bg-slate-700 text-white font-bold text-sm py-2 rounded hover:bg-slate-800 transition whitespace-nowrap"
                >
                  진위 확인
                </button>
              </div>
              {verifyState.status !== 'idle' && (
                <p className={verifyTextClass}>{verifyState.message}</p>
              )}
            </div>
          )}

          {/* 이름 + 휴대폰 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">
                {isBusiness ? '담당자 이름' : '이름'}
              </label>
              <input
                type="text"
                id="name"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="실명을 입력해주세요"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 mb-1">
                휴대폰 번호
              </label>
              <input
                type="tel"
                id="phone"
                value={form.phone}
                onChange={(e) => updateField('phone', formatPhone(e.target.value))}
                placeholder="010-0000-0000"
                maxLength={13}
                inputMode="numeric"
                className="w-full px-3.5 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
              />
            </div>
          </div>

          {/* 이메일 ─ 아이디 + @ + 도메인 + 프리셋 드롭다운 */}
          <div>
            <label htmlFor="emailLocal" className="block text-sm font-semibold text-gray-700 mb-1">
              이메일
            </label>
            <div className="flex gap-2 items-stretch">
              <input
                type="text"
                id="emailLocal"
                value={form.emailLocal}
                onChange={(e) => updateField('emailLocal', e.target.value)}
                placeholder="아이디"
                className="flex-1 min-w-0 px-3.5 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
              />
              <span className="flex items-center text-gray-500 font-semibold text-sm">
                @
              </span>
              <input
                type="text"
                id="emailDomain"
                value={form.emailDomain}
                onChange={(e) => updateField('emailDomain', e.target.value)}
                placeholder="gmail.com"
                disabled={emailDomainPreset !== ''}
                className="flex-1 min-w-0 px-3.5 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
              <select
                value={emailDomainPreset}
                onChange={(e) => handleDomainPresetChange(e.target.value)}
                className="px-2 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm bg-white"
              >
                {EMAIL_DOMAINS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleDuplicateCheck('email')}
                className="px-4 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition text-sm border border-slate-200 whitespace-nowrap"
              >
                중복 확인
              </button>
            </div>
            {dupCheck.email.checked && (
              <p className={`mt-1 text-xs font-medium ${dupCheck.email.available ? 'text-green-600' : 'text-red-600'}`}>
                {dupCheck.email.message}
              </p>
            )}
          </div>

          {/* 아이디 */}
          <div>
            <label htmlFor="userId" className="block text-sm font-semibold text-gray-700 mb-1">
              아이디
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="userId"
                value={form.userId}
                onChange={(e) => updateField('userId', e.target.value)}
                placeholder="영문, 숫자 조합 4~12자리"
                className="flex-1 px-3.5 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
              />
              <button
                type="button"
                onClick={() => handleDuplicateCheck('userId')}
                className="px-4 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition text-sm border border-slate-200 whitespace-nowrap"
              >
                중복 확인
              </button>
            </div>
            {dupCheck.userId.checked && (
              <p className={`mt-1 text-xs font-medium ${dupCheck.userId.available ? 'text-green-600' : 'text-red-600'}`}>
                {dupCheck.userId.message}
              </p>
            )}
          </div>

          {/* 비밀번호 (별도 행) — 눈 아이콘 + 자동생성 */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">
              비밀번호
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPw ? 'text' : 'password'}
                  id="password"
                  ref={pwInputRef}
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="대/소문자, 숫자, 특수문자 포함 8자 이상"
                  className="w-full px-3.5 py-2 pr-10 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-600 outline-none text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? '비밀번호 숨기기' : '비밀번호 보기'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
                >
                  {showPw ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleGeneratePassword}
                title="무작위 생성"
                className="px-3 bg-yellow-50 text-yellow-700 border border-yellow-300 font-bold rounded-lg hover:bg-yellow-100 transition text-sm whitespace-nowrap"
              >
                자동생성
              </button>
            </div>
          </div>

          {/* 비밀번호 확인 (별도 행) — 눈 아이콘 + 일치 여부 */}
          <div>
            <label htmlFor="passwordConfirm" className="block text-sm font-semibold text-gray-700 mb-1">
              비밀번호 확인
            </label>
            {/* 위 비밀번호 행의 [input + 자동생성 버튼] 구조와 동일하게 맞추기 위해
                flex + 동일 너비의 투명 스페이서를 둠 → 입력칸 가로 너비 정렬 */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPwConfirm ? 'text' : 'password'}
                  id="passwordConfirm"
                  value={form.passwordConfirm}
                  onChange={(e) => updateField('passwordConfirm', e.target.value)}
                  placeholder="비밀번호 재입력"
                  className={`w-full px-3.5 py-2 pr-10 rounded-lg border outline-none text-sm focus:ring-2 ${
                    form.passwordConfirm && form.password !== form.passwordConfirm
                      ? 'border-red-400 focus:ring-red-400'
                      : form.passwordConfirm && form.password === form.passwordConfirm
                        ? 'border-green-400 focus:ring-green-400'
                        : 'border-gray-300 focus:ring-blue-600'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPwConfirm((v) => !v)}
                  aria-label={showPwConfirm ? '비밀번호 숨기기' : '비밀번호 보기'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition"
                >
                  {showPwConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {/* 스페이서: 자동생성 버튼과 동일 너비·패딩 → 입력칸 끝선 정렬용 */}
              <div
                aria-hidden="true"
                className="invisible px-3 border font-bold text-sm whitespace-nowrap"
              >
                자동생성
              </div>
            </div>
            {/* 일치 여부 표시 (두 칸 모두 입력됐을 때만) */}
            {form.password && form.passwordConfirm && (
              <p
                className={`mt-1.5 text-xs font-medium ${
                  form.password === form.passwordConfirm
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {form.password === form.passwordConfirm
                  ? '✓ 비밀번호가 일치합니다.'
                  : '✗ 비밀번호가 일치하지 않습니다.'}
              </p>
            )}
          </div>

          {/* 약관 동의 */}
          <div className="mt-2 pt-2.5 border-t border-gray-200">
            <label className="flex items-center mb-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allTermsChecked}
                onChange={(e) => toggleAllTerms(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2.5 font-bold text-gray-800 text-sm">
                전체 약관에 동의합니다.
              </span>
            </label>

            <div className="space-y-1 pl-6">
              {TERMS.map((term) => (
                <label key={term.id} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAgreed[term.id]}
                    onChange={(e) => toggleTerm(term.id, e.target.checked)}
                    className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <span className="ml-2.5 text-xs text-gray-600">{term.label}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      setViewingTermId(term.id)
                    }}
                    className="ml-auto text-xs text-blue-500 hover:underline"
                  >
                    내용 보기
                  </button>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 font-medium">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base py-2.5 rounded-lg transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? '가입 처리 중...' : '가입 완료하기'}
          </button>
        </form>

        {/* 하단 링크 */}
        <div className="flex items-center justify-center mt-2.5 text-sm">
          <span className="text-gray-500">이미 계정이 있으신가요?</span>
          <Link to="/login" className="ml-2 text-blue-600 font-bold hover:underline">
            로그인
          </Link>
        </div>
      </div>

      {/* ── 약관 내용 보기 모달 ── */}
      {viewingTermId && TERMS_CONTENT[viewingTermId] && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8"
          role="dialog"
          aria-modal="true"
          aria-labelledby="term-modal-title"
        >
          {/* 배경 오버레이 */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewingTermId(null)}
          />

          {/* 모달 본체 */}
          <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col">
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 id="term-modal-title" className="text-lg font-bold text-slate-900">
                {TERMS_CONTENT[viewingTermId].title}
              </h2>
              <button
                type="button"
                onClick={() => setViewingTermId(null)}
                aria-label="닫기"
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <span className="text-xl leading-none">×</span>
              </button>
            </div>

            {/* 본문 (스크롤) */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                {TERMS_CONTENT[viewingTermId].body}
              </pre>
            </div>

            {/* 푸터 */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              <button
                type="button"
                onClick={() => setViewingTermId(null)}
                className="px-5 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  toggleTerm(viewingTermId, true)
                  setViewingTermId(null)
                }}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition"
              >
                동의하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
