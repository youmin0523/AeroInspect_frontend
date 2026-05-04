/**
 * api/businessVerifyApi.js
 * 역할: 국세청(공공데이터포털 odcloud.kr) 사업자 상태조회 API 래퍼
 *       - checkBusinessStatus: 사업자등록번호 10자리로 과세유형/영업상태 확인
 *
 * 참고
 *   - 엔드포인트: POST https://api.odcloud.kr/api/nts-businessman/v1/status
 *   - 요청 본문: { b_no: ["1234567890", ...] }  (최대 100건)
 *   - 응답:    { data: [{ b_no, tax_type, b_stt, ... }] }
 *   - serviceKey는 쿼리스트링으로 전달 (공공데이터포털에서 발급받은 "Decoding" 키)
 *
 * CORS / 개발 환경
 *   - 브라우저에서 api.odcloud.kr을 직접 호출하면 CORS 에러가 날 수 있으므로
 *     Vite 개발 서버의 /odcloud 프록시를 통해 호출한다. (vite.config.js 참고)
 *   - 운영 배포 시에는 백엔드(FastAPI)에 프록시 라우트를 만들어 키를 서버에 숨기는 것을 권장.
 */

import axios from 'axios'

// Vite는 VITE_ 접두사가 붙은 env만 클라이언트 번들에 노출한다.
const SERVICE_KEY = import.meta.env.VITE_ODCLOUD_SERVICE_KEY

// dev: vite 프록시(/odcloud) 경유  ·  prod: odcloud.kr 직접 호출
const BASE_URL = import.meta.env.DEV
  ? '/odcloud/api/nts-businessman/v1'
  : 'https://api.odcloud.kr/api/nts-businessman/v1'

/**
 * 사업자 상태 조회
 * @param {string} businessNumber - 하이픈(-) 제외 10자리 사업자등록번호
 * @returns {Promise<{
 *   b_no: string,
 *   tax_type: string,   // 예: "부가가치세 일반과세자"
 *   b_stt: string,      // 예: "계속사업자" | "휴업자" | "폐업자"
 *   b_stt_cd: string,   // "01"(계속) | "02"(휴업) | "03"(폐업)
 *   end_dt?: string,
 *   utcc_yn?: string,
 *   tax_type_cd?: string,
 *   rbf_tax_type?: string,
 *   rbf_tax_type_cd?: string,
 * }>}
 */
export async function checkBusinessStatus(businessNumber) {
  if (!SERVICE_KEY) {
    throw new Error(
      '환경변수 VITE_ODCLOUD_SERVICE_KEY가 설정되지 않았습니다. frontend/.env 를 확인하세요.',
    )
  }

  const url = `${BASE_URL}/status?serviceKey=${encodeURIComponent(SERVICE_KEY)}`

  const { data } = await axios.post(
    url,
    { b_no: [businessNumber] },
    {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    },
  )

  const first = data?.data?.[0]
  if (!first) {
    throw new Error('국세청 응답이 비어있습니다.')
  }
  return first
}

/**
 * 상태 코드 → 화면 표시용 매핑
 * 01: 계속사업자 / 02: 휴업자 / 03: 폐업자
 * API가 b_stt에 빈 문자열("")을 주면 미등록 사업자번호로 간주.
 */
export function interpretStatus(result) {
  if (!result) return { ok: false, message: '조회 실패' }
  if (!result.b_stt || !result.b_stt_cd) {
    return { ok: false, message: '국세청에 등록되지 않은 사업자번호입니다.' }
  }
  if (result.b_stt_cd === '01') {
    return {
      ok: true,
      message: `확인 완료: ${result.tax_type || '정상 사업자'} (계속사업자)`,
    }
  }
  if (result.b_stt_cd === '02') {
    return { ok: false, message: '휴업 중인 사업자입니다.' }
  }
  if (result.b_stt_cd === '03') {
    return {
      ok: false,
      message: `폐업된 사업자입니다.${result.end_dt ? ` (폐업일: ${result.end_dt})` : ''}`,
    }
  }
  return { ok: false, message: `알 수 없는 상태: ${result.b_stt}` }
}
