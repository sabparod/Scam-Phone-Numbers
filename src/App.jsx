import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'

const REPORT_THRESHOLD = 3

const categoryNames = {
  scam: 'แอบอ้างหน่วยงานรัฐ',
  bank: 'แอบอ้างธนาคาร',
  spam: 'สแปม/โทรซ้ำ',
  ai_voice: 'ปลอมเสียงคนรู้จัก',
  loan: 'ปล่อยกู้',
  prize: 'รับรางวัล',
  debt: 'เรียกหนี้/กดดัน',
  impersonation: 'แอบอ้างหน่วยงาน',
  harassment: 'คุกคาม/รังควาน',
}

const getCategoryName = (category) => {
  if (!category) return ''
  return categoryNames[category] || category
}

const getReportDetail = (report) => report.highestCategory
  ? `${report.highestCategory} เป็นประเด็นหลัก โดยมี ${report.count} รายงานในระบบ`
  : `มีการรายงานเบอร์นี้ ${report.count} รายงานในระบบ`

const categorySeverity = {
  scam: 3,
  bank: 3,
  spam: 1,
  ai_voice: 3,
  loan: 2,
  prize: 2,
  debt: 2,
  impersonation: 3,
  harassment: 2,
}

const requestedInfoSeverity = {
  'ข้อมูลส่วนตัว': 2,
  'ข้อมูลทางการเงิน': 3,
  'รหัส OTP': 3,
  'รหัสผ่าน': 3,
}

const getReportSeverity = (report) => Math.max(
  categorySeverity[report.category] || 2,
  requestedInfoSeverity[report.requestedInfo] || 2,
)

const getDamageValue = (damage) => damage === 'high' ? 3 : damage === 'medium' ? 2 : 1

const getReporterMultiplier = (reporterCount) => {
  if (reporterCount >= 5) return 1
  if (reporterCount >= 3) return 0.85
  if (reporterCount === 2) return 0.7
  return 0.5
}

const getReporterCount = (phoneReports) => new Set(
  phoneReports.map((report) => report.reporterId || 'legacy-reporter'),
).size

const getRiskScore = (phoneReports) => {
  const reportCount = phoneReports.length
  const maxSeverity = Math.max(...phoneReports.map(getReportSeverity), 0)
  const damageTotal = phoneReports.reduce((total, report) => {
    const evidenceMultiplier = report.evidence ? 1 : 0.4
    return total + getDamageValue(report.damage) * evidenceMultiplier
  }, 0)
  const evidenceTotal = phoneReports.filter((report) => report.evidence).length
  const linkTotal = phoneReports.filter((report) => report.hasLink === 'yes' || report.link).length
  const reporterCount = getReporterCount(phoneReports)
  const rawScore = reportCount * 12 + maxSeverity * 18 + damageTotal * 5 + evidenceTotal * 8 + linkTotal * 10
  return Math.min(100, rawScore * getReporterMultiplier(reporterCount))
}

const normalizePhone = (value) => value.replace(/[^0-9]/g, '')
const acceptedPhoneLengths = [3, 4, 9, 10]
const isValidPhoneLength = (value) => acceptedPhoneLengths.includes(value.length)

const formatReportedAt = (value) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

const formatReportedDate = (value) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
}).format(new Date(value))

const formatReportedTime = (value) => new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value))

const getRiskLevel = (score) => {
  if (score >= 75) return 'สูง'
  if (score >= 40) return 'กลาง'
  return 'ต่ำ'
}

const getScoreColor = (score) => {
  if (score >= 75) return '#f97316'
  if (score >= 40) return '#facc15'
  return '#34d399'
}

const getCheckPopupIcon = (popup) => {
  if (popup.noHistory) return { className: 'check-popup-icon no-history', icon: '¡' }
  if (!popup.found) return { className: 'check-popup-icon search', icon: '?' }
  if (popup.riskLevel === 'สูง') return { className: 'check-popup-icon risk-high', icon: '!' }
  if (popup.riskLevel === 'กลาง') return { className: 'check-popup-icon risk-medium', icon: '!' }
  return { className: 'check-popup-icon reported', icon: '!' }
}

const SearchIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
)

const ReportIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
  </svg>
)

const HistoryIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
  </svg>
)

const reportsStorageKey = 'kyn-reports'
const reporterIdStorageKey = 'kyn-reporter-id'

const getReporterId = () => {
  let reporterId = localStorage.getItem(reporterIdStorageKey)
  if (!reporterId) {
    reporterId = crypto.randomUUID()
    localStorage.setItem(reporterIdStorageKey, reporterId)
  }
  return reporterId
}

const readLocalReports = () => {
  try {
    return JSON.parse(localStorage.getItem(reportsStorageKey) || '[]')
  } catch {
    return []
  }
}

const saveLocalReport = (report) => {
  const reports = [report, ...readLocalReports()]
  localStorage.setItem(reportsStorageKey, JSON.stringify(reports))
  return report
}

const mapReportFromDatabase = (report) => ({
  ...report,
  hasLink: report.has_link,
  requestedInfo: report.requested_info,
  evidenceFile: report.evidence_file,
  reporterId: report.reporter_id,
  ownerDevice: report.owner_device,
  reportedAt: report.reported_at,
})

const mapReportToDatabase = (report) => ({
  id: report.id,
  phone: report.phone,
  category: report.category,
  severity: report.severity,
  damage: report.damage,
  evidence: report.evidence,
  requested_info: report.requestedInfo,
  has_link: report.hasLink,
  link: report.link,
  evidence_file: report.evidenceFile,
  detail: report.detail,
  reporter_id: report.reporterId,
  status: report.status,
  owner_device: report.ownerDevice,
  reported_at: report.reportedAt,
  date: report.date,
})

function App() {
  const currentReporterId = getReporterId()
  const [reports, setReports] = useState([])

  useEffect(() => {
    if (!supabase) {
      setReports(readLocalReports())
      return undefined
    }

    let isMounted = true
    const loadReports = async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('reported_at', { ascending: false })

      if (isMounted) setReports(error ? readLocalReports() : data.map(mapReportFromDatabase))
    }

    loadReports()
    const channel = supabase
      .channel('reports-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, (payload) => {
        if (!isMounted || !payload.new?.id) return

        setReports((previous) => {
          const nextReport = mapReportFromDatabase(payload.new)
          const withoutCurrent = previous.filter((report) => report.id !== nextReport.id)
          return payload.eventType === 'DELETE' ? withoutCurrent : [nextReport, ...withoutCurrent]
        })
      })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const [activeTab, setActiveTab] = useState('check')
  const [checkPhone, setCheckPhone] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [checkPopup, setCheckPopup] = useState(null)
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeData, setDisputeData] = useState({ phone_number: '', reason: '', contact: '' })
  const [disputeError, setDisputeError] = useState('')
  const [isDisputeSubmitting, setIsDisputeSubmitting] = useState(false)
  const [disputeSent, setDisputeSent] = useState(false)
  const [successReport, setSuccessReport] = useState(null)
  const [reportError, setReportError] = useState('')
  const [form, setForm] = useState({
    phone: '',
    category: '',
    categoryOther: '',
    damage: '',
    damageOther: '',
    requestedInfo: '',
    requestedInfoOther: '',
    hasLink: '',
    evidence: '',
    evidenceFile: '',
    link: '',
    detail: '',
  })

  const historyByPhone = useMemo(() => {
    const map = {}

    reports.forEach((report) => {
      const key = report.phone
      if (!map[key]) {
        map[key] = { phone: key, reports: [], categoryCounts: {} }
      }

      const entry = map[key]
      entry.reports.push(report)
      entry.categoryCounts[report.category] = (entry.categoryCounts[report.category] || 0) + 1
    })

    return Object.values(map)
      .map((entry) => {
        const highestCategory = Object.entries(entry.categoryCounts).sort((a, b) => b[1] - a[1])[0]
        const reporterCount = getReporterCount(entry.reports)
        const riskScore = reporterCount >= REPORT_THRESHOLD ? getRiskScore(entry.reports) : null
        return {
          phone: entry.phone,
          count: entry.reports.length,
          reporterCount,
          riskScore,
          riskLevel: riskScore === null ? null : getRiskLevel(riskScore),
          highestCategory: highestCategory ? getCategoryName(highestCategory[0]) : '',
        }
      })
      .sort((a, b) => b.riskScore - a.riskScore)
  }, [reports])

  const ownHistoryByPhone = useMemo(() => {
    const map = {}

    reports.filter((report) => report.reporterId === currentReporterId).forEach((report) => {
      const key = report.phone
      if (!map[key]) map[key] = { phone: key, reports: [], latestReportedAt: null }

      map[key].reports.push(report)
      map[key].latestReportedAt = report.reportedAt || report.date
    })

    return Object.values(map)
      .map((entry) => {
        const reporterCount = getReporterCount(entry.reports)
        const riskScore = reporterCount >= REPORT_THRESHOLD ? getRiskScore(entry.reports) : null
        return {
          ...entry,
          count: entry.reports.length,
          riskLevel: riskScore === null ? null : getRiskLevel(riskScore),
        }
      })
      .sort((a, b) => getRiskScore(b.reports) - getRiskScore(a.reports))
  }, [currentReporterId, reports])

  const yesterdayInsight = useMemo(() => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayDate = yesterday.toISOString().slice(0, 10)
    const yesterdayReports = reports.filter((report) => report.date === yesterdayDate)
    const categoryCounts = yesterdayReports.reduce((counts, report) => {
      counts[report.category] = (counts[report.category] || 0) + 1
      return counts
    }, {})
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]
    if (!topCategory || !yesterdayReports.length) return null
    const category = getCategoryName(topCategory[0]) || 'ไม่ระบุประเภท'

    return {
      category,
      reportCount: yesterdayReports.length,
      share: Math.round((topCategory[1] / yesterdayReports.length) * 100),
      summary: `พบการรายงานประเภท${category}สูงที่สุดจากข้อมูลที่ระบบวิเคราะห์ได้เมื่อวานนี้`,
    }
  }, [reports])

  useEffect(() => {
    const normalized = normalizePhone(checkPhone)
    if (!normalized) {
      setSearchResult(null)
      return
    }

    if (!isValidPhoneLength(normalized)) {
      setSearchResult({ phone: normalized, detail: 'กรุณากรอกเบอร์โทรศัพท์ 3, 4, 9 หรือ 10 หลัก' })
      return
    }

    const match = historyByPhone.find((entry) => entry.phone === normalized)
    if (!match) {
      setSearchResult({
        phone: normalized,
        riskScore: 0,
        riskLevel: 'ต่ำ',
        detail: 'ยังไม่มีประวัติที่เคยถูกรายงานในระบบ',
      })
      return
    }

    const hasEnoughReports = match.reporterCount >= REPORT_THRESHOLD
    setSearchResult({
      phone: match.phone,
      reporterCount: match.reporterCount,
      riskScore: hasEnoughReports ? match.riskScore : null,
      riskLevel: hasEnoughReports ? match.riskLevel : null,
      detail: hasEnoughReports
        ? getReportDetail(match)
        : 'ยังมีรายงานไม่มากพอที่จะประเมินระดับความเสี่ยง',
    })
  }, [checkPhone, historyByPhone])

  const handleCheckSubmit = (event) => {
    event.preventDefault()
    const normalized = normalizePhone(checkPhone)
    setCheckPhone(normalized)

    if (!isValidPhoneLength(normalized)) {
      setCheckPopup({
        phone: normalized,
        title: 'รูปแบบเบอร์ไม่ถูกต้อง',
        detail: 'กรุณากรอกเบอร์โทรศัพท์ 3, 4, 9 หรือ 10 หลัก',
        found: false,
      })
      return
    }

    const match = historyByPhone.find((entry) => entry.phone === normalized)
    if (match) {
      const hasEnoughReports = match.reporterCount >= REPORT_THRESHOLD
      setCheckPopup({
        phone: normalized,
        title: hasEnoughReports ? 'เบอร์นี้เคยถูกรายงาน' : 'มีผู้รายงาน',
        detail: hasEnoughReports
          ? getReportDetail(match)
          : 'ยังมีรายงานไม่มากพอที่จะประเมินระดับความเสี่ยง',
        found: true,
        reporterCount: match.reporterCount,
        riskLevel: hasEnoughReports ? match.riskLevel : null,
      })
      return
    }

    setCheckPopup({
      phone: normalized,
      title: 'ยังไม่มีประวัติรายงานเบอร์นี้ในระบบ',
      detail: '',
      found: false,
      noHistory: true,
    })
  }

  const handleReportFromCheck = () => {
    setForm((previous) => ({ ...previous, phone: checkPopup.phone }))
    setCheckPopup(null)
    setActiveTab('report')
  }

  const handleOpenDisputeForm = () => {
    setDisputeData({ phone_number: checkPopup.phone, reason: '', contact: '' })
    setDisputeError('')
    setDisputeSent(false)
    setCheckPopup(null)
    setShowDisputeForm(true)
  }

  const handleDisputeSubmit = async (event) => {
    event.preventDefault()
    if (isDisputeSubmitting) return

    const reason = disputeData.reason.trim()
    const contact = disputeData.contact.trim()
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const mobileContact = contact.replace(/[\s()-]/g, '')

    if (reason.length < 10 || reason.length > 500) {
      setDisputeError('กรุณาระบุเหตุผลตั้งแต่ 10 ถึง 500 ตัวอักษร')
      return
    }
    if (!emailPattern.test(contact) && !/^0[689]\d{8}$/.test(mobileContact)) {
      setDisputeError('กรุณากรอกอีเมลหรือเบอร์มือถือไทย 10 หลักให้ถูกต้อง')
      return
    }
    if (!supabase) {
      setDisputeError('ระบบยังไม่ได้เชื่อมต่อฐานข้อมูล จึงส่งคำขอไม่ได้')
      return
    }

    setDisputeError('')
    setIsDisputeSubmitting(true)
    try {
      const { error } = await supabase.from('dispute_requests').insert({
        phone_number: disputeData.phone_number,
        reason,
        contact,
      })
      if (error) throw error
      setDisputeSent(true)
    } catch {
      setDisputeError('ส่งคำขอไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsDisputeSubmitting(false)
    }
  }

  const toggleReportOption = (field, value, extra = {}) => {
    setForm((previous) => ({
      ...previous,
      ...extra,
      [field]: previous[field] === value ? '' : value,
    }))
  }

  const handleReportSubmit = async (event) => {
    event.preventDefault()

    const phone = normalizePhone(form.phone)
    const category = form.category === 'other' ? form.categoryOther.trim() : form.category
    const requestedInfo = form.requestedInfo === 'other' ? form.requestedInfoOther.trim() : form.requestedInfo
    const damage = form.damage === 'other' ? form.damageOther.trim() : form.damage
    if (!isValidPhoneLength(phone) || !category || !requestedInfo || (form.damage === 'other' && !damage)) {
      setReportError('กรุณากรอกเบอร์ เลือกประเภท ข้อมูลที่ถูกขอ และกรอกตัวเลือกอื่นๆ ให้ครบ')
      return
    }
    if (form.evidence === 'yes' && !form.evidenceFile) {
      setReportError('กรุณาแนบภาพหรือไฟล์หลักฐานก่อนส่งรายงาน')
      return
    }
    setReportError('')

    const newReport = {
      id: Date.now(),
      phone,
      category,
      severity: getReportSeverity({ category, requestedInfo }),
      damage,
      evidence: form.evidence === 'yes',
      requestedInfo,
      hasLink: form.hasLink,
      link: form.link,
      evidenceFile: form.evidenceFile,
      detail: form.detail || 'รายงานด้วยข้อมูลทั่วไป',
      reporterId: getReporterId(),
      status: 'pending',
      ownerDevice: true,
      reportedAt: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-CA'),
    }

    let savedReport
    if (supabase) {
      const { data, error } = await supabase
        .from('reports')
        .insert(mapReportToDatabase(newReport))
        .select()
        .single()
      savedReport = error ? saveLocalReport(newReport) : mapReportFromDatabase(data)
    } else {
      savedReport = saveLocalReport(newReport)
    }
    setReports((previous) => [savedReport, ...previous])
    setCheckPhone(phone)
    setSuccessReport(newReport)
    setForm({
      phone: '',
      category: '',
      categoryOther: '',
      damage: '',
      damageOther: '',
      requestedInfo: '',
      requestedInfoOther: '',
      hasLink: '',
      evidence: '',
      evidenceFile: '',
      link: '',
      detail: '',
    })
    setActiveTab('check')
  }

  const renderTabContent = () => {
    if (activeTab === 'report') {
      return (
        <div className="tab-screen report-screen">
          <button type="button" className="back-button" onClick={() => setActiveTab('check')}>
            <span aria-hidden="true">←</span>
            <span>ย้อนกลับ</span>
          </button>

          <div className="check-header">
            <div className="check-icon"><ReportIcon /></div>
            <h2>รายงานหมายเลขโทรศัพท์</h2>
          </div>

          <form onSubmit={handleReportSubmit} className="report-form">
            <section className="form-section">
              <label>
                หมายเลขโทรศัพท์
                <input
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  placeholder="0812345678"
                />
              </label>

              <label>
                ประเภทผู้แอบอ้าง <span className="required-mark">*</span>
                <div className="filter-chips" role="group" aria-label="ประเภทผู้แอบอ้าง">
                  {[
                    ['scam', 'แอบอ้างหน่วยงานรัฐ'],
                    ['bank', 'แอบอ้างธนาคาร'],
                    ['spam', 'เอกชน/ขนส่ง'],
                    ['ai_voice', 'ปลอมเสียงคนรู้จัก'],
                    ['impersonation', 'หลอกลงทุน'],
                    ['loan', 'ปล่อยกู้'],
                    ['prize', 'รับรางวัล'],
                    ['other', 'อื่นๆ'],
                  ].map(([value, label]) => (
                    <button key={value} type="button" className={form.category === value ? 'filter-chip selected' : 'filter-chip'} onClick={() => toggleReportOption('category', value, value === 'other' ? { categoryOther: '' } : {})}>{label}</button>
                  ))}
                </div>
                {form.category === 'other' ? <input type="text" required value={form.categoryOther} onChange={(event) => setForm({ ...form, categoryOther: event.target.value })} placeholder="ระบุประเภทการหลอกลวง" /> : null}
              </label>

              <label>
                ขอข้อมูลอะไร <span className="required-mark">*</span>
                <div className="filter-chips" role="group" aria-label="ข้อมูลที่ถูกขอ">
                  {['ข้อมูลส่วนตัว', 'ข้อมูลทางการเงิน', 'รหัส OTP', 'รหัสผ่าน', 'other'].map((value) => (
                    <button key={value} type="button" className={form.requestedInfo === value ? 'filter-chip selected' : 'filter-chip'} onClick={() => toggleReportOption('requestedInfo', value, value === 'other' ? { requestedInfoOther: '' } : {})}>{value === 'other' ? 'อื่นๆ' : value}</button>
                  ))}
                </div>
                {form.requestedInfo === 'other' ? <input type="text" required value={form.requestedInfoOther} onChange={(event) => setForm({ ...form, requestedInfoOther: event.target.value })} placeholder="ระบุข้อมูลที่ถูกขอ" /> : null}
              </label>
            </section>

            <section className="form-section">
              <fieldset className="form-fieldset">
                <legend>ส่งลิงก์หรือไม่</legend>
                <div className="filter-chips">
                  {[['yes', 'มีลิงก์'], ['no', 'ไม่มีลิงก์']].map(([value, label]) => (
                    <button key={value} type="button" className={form.hasLink === value ? 'filter-chip selected' : 'filter-chip'} onClick={() => toggleReportOption('hasLink', value, value === 'no' ? { link: '' } : {})}>{label}</button>
                  ))}
                </div>
                {form.hasLink === 'yes' ? <input type="url" value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} placeholder="https://example.com" /> : null}
              </fieldset>

              <fieldset className="form-fieldset">
                <legend>ความเสียหาย</legend>
                <div className="filter-chips">
                  {[['low', 'ไม่ได้รับความเสียหาย'], ['medium', 'ข้อมูลรั่วไหล'], ['high', 'เสียเงิน'], ['other', 'อื่นๆ']].map(([value, label]) => (
                    <button key={value} type="button" className={form.damage === value ? 'filter-chip selected' : 'filter-chip'} onClick={() => toggleReportOption('damage', value, value === 'other' ? { damageOther: '' } : {})}>{label}</button>
                  ))}
                </div>
                {form.damage === 'other' ? <input type="text" required value={form.damageOther} onChange={(event) => setForm({ ...form, damageOther: event.target.value })} placeholder="ระบุความเสียหาย" /> : null}
              </fieldset>

              <fieldset className="form-fieldset">
                <legend>หลักฐาน</legend>
                <div className="filter-chips">
                  {[['yes', 'มีหลักฐาน'], ['no', 'ไม่มีหลักฐาน']].map(([value, label]) => (
                    <button key={value} type="button" className={form.evidence === value ? 'filter-chip selected' : 'filter-chip'} onClick={() => toggleReportOption('evidence', value, value === 'no' ? { evidenceFile: '' } : {})}>{label}</button>
                  ))}
                </div>
                {form.evidence === 'yes' ? <input type="file" accept="image/*,.pdf,.doc,.docx" onChange={(event) => setForm({ ...form, evidenceFile: event.target.files[0]?.name || '' })} /> : null}
                {form.evidenceFile ? <small className="file-name">ไฟล์ที่เลือก: {form.evidenceFile}</small> : null}
                {reportError && form.evidence === 'yes' && !form.evidenceFile ? <small className="form-error">{reportError}</small> : null}
              </fieldset>
            </section>

            <section className="form-section">
              <label>
                รายละเอียด
                <textarea
                  rows="3"
                  value={form.detail}
                  onChange={(event) => setForm({ ...form, detail: event.target.value })}
                  placeholder="อธิบายเหตุการณ์ที่เกิดขึ้น"
                />
              </label>
            </section>

            <button type="submit" className="submit-button">บันทึกรายงาน</button>
            {reportError && !(form.evidence === 'yes' && !form.evidenceFile) ? <small className="form-error form-error-general">{reportError}</small> : null}
          </form>
        </div>
      )
    }

    if (activeTab === 'history') {
      return (
        <div className="tab-screen history-screen">
          <div className="check-header">
            <div className="check-icon"><HistoryIcon /></div>
            <h2>เบอร์ที่คุณเคยรายงานจากอุปกรณ์นี้</h2>
          </div>
          
          <div className="history-list">
            {ownHistoryByPhone.map((entry, index) => (
              <div key={entry.phone} className="history-row">
                <span>#{index + 1}</span>
                <div className="history-phone">
                  <strong>{entry.phone}</strong>
                  <small>แจ้งเมื่อ {formatReportedAt(entry.latestReportedAt)}</small>
                </div>
                <em>{entry.riskLevel || 'ยังไม่ประเมิน'}</em>
              </div>
            ))}
          </div>
        </div>
      )
    }

    return (
      <div className="tab-screen check-screen">
        {yesterdayInsight ? <section className="insight-popup" aria-label="รายงานการหลอกลวงสูงสุดเมื่อวานนี้">
          <h3>📈 รายงานการหลอกลวงสูงสุดเมื่อวานนี้</h3>

          <div className="insight-main">
            <div className="insight-gauge" style={{ background: `conic-gradient(#f04438 ${yesterdayInsight.share}%, #ff8b3d ${yesterdayInsight.share}% 100%)` }}>
              <div className="insight-gauge-inner">
                <strong>{yesterdayInsight.share}%</strong>
                <span>จากรายงานทั้งหมด</span>
              </div>
            </div>

            <div className="insight-details">
              <div className="insight-row">
                <span className="insight-icon category-icon">👮</span>
                <div>
                  <small>ประเภท</small>
                  <strong>{yesterdayInsight.category}</strong>
                </div>
              </div>
              <div className="insight-divider" />
              <div className="insight-row">
                <span className="insight-icon report-icon">📄</span>
                <div>
                  <small>จำนวน</small>
                  <strong>{yesterdayInsight.reportCount} รายงาน</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="insight-summary">
            <span>🚨</span>
            <p><strong>สรุป:</strong> {yesterdayInsight.summary}</p>
            <span className="summary-arrow">›</span>
          </div>
        </section> : <div className="empty-insight">ยังไม่มีข้อมูลเพียงพอสำหรับการวิเคราะห์รายงานสูงสุด</div>}

        <div className="check-header">
          <div className="check-icon"><SearchIcon /></div>
          <h2>ตรวจสอบหมายเลขโทรศัพท์</h2>
        </div>

        <form onSubmit={handleCheckSubmit} className="check-form">
          <input
            type="tel"
            value={checkPhone}
            onChange={(event) => setCheckPhone(normalizePhone(event.target.value))}
            placeholder="กรอกหมายเลขโทรศัพท์"
          />
          <button type="submit">ตรวจสอบ</button>
        </form>
        

      </div>
    )
  }

  return (
    <div className="phone-frame">
      {renderTabContent()}

      <nav className="bottom-nav" aria-label="main navigation">
        <button type="button" className={activeTab === 'check' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('check')}>
          <span className="nav-icon"><SearchIcon /></span>
          <span>ตรวจสอบหมายเลขโทรศัพท์</span>
        </button>
        <button type="button" className={activeTab === 'report' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('report')}>
          <span className="nav-icon"><ReportIcon /></span>
          <span>รายงานหมายเลขโทรศัพท์</span>
        </button>
        <button type="button" className={activeTab === 'history' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('history')}>
          <span className="nav-icon"><HistoryIcon /></span>
          <span>ประวัติ</span>
        </button>
      </nav>

      {successReport ? (
        <div className="success-overlay" role="dialog" aria-modal="true" aria-labelledby="success-title">
          <section className="success-modal">
            <button type="button" className="modal-close" aria-label="ปิด" onClick={() => setSuccessReport(null)}>×</button>

            <div className="success-mark" aria-hidden="true">
              <span>✓</span>
            </div>
            <h2 id="success-title">รายงานของคุณถูกส่งเรียบร้อยแล้ว!</h2>
            <p className="success-lead">ขอบคุณที่ช่วยกันสร้างสังคมปลอดภัยจากมิจฉาชีพ</p>

            <div className="success-report-card">
              <div className="success-number-row">
                <span className="success-card-icon">❗</span>
                <div>
                  <small>หมายเลขที่คุณรายงาน</small>
                  <strong>{successReport.phone}</strong>
                </div>
              </div>
              <div className="success-meta">
                <span><i aria-hidden="true">📅</i><span><small>วันที่รายงาน</small><strong>{formatReportedDate(successReport.reportedAt)}</strong></span></span>
                <span><i aria-hidden="true">🕒</i><span><small>เวลา</small><strong>{formatReportedTime(successReport.reportedAt)} น.</strong></span></span>
              </div>
            </div>

            <div className="success-note">
              <span>✓</span>
              <div>
                <strong>ร่วมสร้างชุมชนที่ปลอดภัย</strong>
                <p>ข้อมูลของคุณจะถูกนำไปวิเคราะห์เพื่อป้องกันและช่วยเหลือผู้อื่นจากการถูกหลอกลวง</p>
              </div>
            </div>

            <button type="button" className="success-home-button" onClick={() => { setSuccessReport(null); setActiveTab('check') }}>กลับหน้าหลัก</button>
            <button type="button" className="success-history-button" onClick={() => { setSuccessReport(null); setActiveTab('history') }}>ดูรายงานของฉัน</button>
          </section>
        </div>
      ) : null}

      {checkPopup ? (
        <div className="success-overlay" role="dialog" aria-modal="true" aria-labelledby="check-popup-title">
          <section className="check-popup-modal">
            <div className={getCheckPopupIcon(checkPopup).className}>{getCheckPopupIcon(checkPopup).icon}</div>
            <h2 id="check-popup-title">{checkPopup.title}</h2>
            <p className="check-popup-phone">{checkPopup.phone}</p>
            {checkPopup.detail ? <p className="check-popup-detail">{checkPopup.detail}</p> : null}
            {checkPopup.riskLevel ? <span className="check-popup-badge">ระดับความเสี่ยง {checkPopup.riskLevel}</span> : null}
            {checkPopup.found ? <p className="check-popup-disclaimer">ข้อมูลนี้มาจากผู้ใช้งาน ไม่ใช่การยืนยันจากหน่วยงานรัฐ</p> : null}
            {checkPopup.noHistory ? <p className="check-popup-safety-note">ไม่ได้แปลว่าปลอดภัย ระวังหากถูกขอ OTP หรือให้โอนเงิน</p> : null}
            <p className="check-popup-question">ต้องการรายงานเบอร์นี้หรือไม่?</p>
            <button type="button" className="success-home-button check-popup-report-button" onClick={handleReportFromCheck}>รายงานเบอร์นี้</button>
            <button type="button" className="check-popup-cancel-button" onClick={() => setCheckPopup(null)}>ยกเลิก</button>
            {checkPopup.found ? <button type="button" className="check-popup-link" onClick={handleOpenDisputeForm}>เป็นเจ้าของเบอร์นี้? ขอให้ตรวจสอบ</button> : null}
          </section>
        </div>
      ) : null}

      {showDisputeForm ? (
        <div className="success-overlay" role="dialog" aria-modal="true" aria-labelledby="dispute-title">
          <section className="check-popup-modal dispute-modal">
            {disputeSent ? (
              <div className="dispute-success" role="status">
                <h2 id="dispute-title">ส่งคำขอตรวจสอบแล้ว</h2>
                <p>ทีมงานจะตรวจสอบข้อมูลและติดต่อกลับตามช่องทางที่ระบุ</p>
                <button type="button" className="check-popup-cancel-button" onClick={() => setShowDisputeForm(false)}>ปิด</button>
              </div>
            ) : (
              <form className="dispute-form" onSubmit={handleDisputeSubmit} noValidate>
                <h2 id="dispute-title">ขอให้ตรวจสอบเบอร์นี้</h2>
                <label>
                  หมายเลขโทรศัพท์
                  <input type="tel" value={disputeData.phone_number} readOnly />
                </label>
                <label>
                  เหตุผล <span className="required-mark">*</span>
                  <textarea
                    value={disputeData.reason}
                    onChange={(event) => setDisputeData({ ...disputeData, reason: event.target.value })}
                    minLength={10}
                    maxLength={500}
                    required
                    rows="4"
                  />
                </label>
                <label>
                  ช่องทางติดต่อกลับ <span className="required-mark">*</span>
                  <input
                    type="text"
                    value={disputeData.contact}
                    onChange={(event) => setDisputeData({ ...disputeData, contact: event.target.value })}
                    autoComplete="email"
                    required
                    placeholder="อีเมลหรือเบอร์มือถือ 10 หลัก"
                  />
                  <small>อีเมลหรือเบอร์ที่ติดต่อได้ ใช้เพื่อติดต่อกลับเรื่องนี้เท่านั้น</small>
                </label>
                {disputeError ? <p className="dispute-error" role="alert">{disputeError}</p> : null}
                <button type="submit" className="submit-button dispute-submit-button" disabled={isDisputeSubmitting}>
                  {isDisputeSubmitting ? 'กำลังส่งคำขอ...' : 'ส่งคำขอตรวจสอบ'}
                </button>
                <button type="button" className="check-popup-cancel-button" disabled={isDisputeSubmitting} onClick={() => setShowDisputeForm(false)}>ยกเลิก</button>
              </form>
            )}
          </section>
        </div>
      ) : null}

    </div>
  )
}

export default App
