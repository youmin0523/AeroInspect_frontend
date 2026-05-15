/**
 * api/contactApi.js
 * 역할: 랜딩 페이지 "도입 문의" 폼 → 백엔드 /api/v1/contact 전송
 *       - 비로그인 호출 가능 (Authorization 헤더 없어도 200/201)
 *       - 백엔드는 슈퍼어드민에게 notification 으로 전달
 */

import axios from 'axios'

const BASE = '/api/v1/contact'

/**
 * @param {{
 *   customer_type: 'personal' | 'business',
 *   biz_number?: string | null,
 *   name: string,
 *   phone: string,
 *   message: string,
 * }} payload
 * @returns {Promise<{ received: boolean, notified_admins: number }>}
 */
export async function submitContactInquiry(payload) {
  const { data } = await axios.post(BASE, payload)
  return data
}
