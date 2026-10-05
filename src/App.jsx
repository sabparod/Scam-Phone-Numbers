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
const formatPhoneNumber = (value) => {
  const phone = normalizePhone(value)
  if (phone.length === 10) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-${phone.slice(6)}`
  if (phone.length === 9) return `${phone.slice(0, 2)}-${phone.slice(2, 5)}-${phone.slice(5)}`
  return phone
}

const formatReportedAt = (value) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

const formatUpdatedAt = (value) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(value)

const formatReportedDate = (value) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
}).format(new Date(value))

const formatReportedTime = (value) => new Intl.DateTimeFormat('th-TH', {
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value))

const getLocalDateKey = (value) => {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getRiskLevel = (score) => {
  if (score >= 75) return 'สูง'
  if (score >= 40) return 'กลาง'
  return 'ต่ำ'
}

const getHistoryRiskBadge = (entry) => {
  const risk = entry.risk ?? entry.riskLevel
  if (risk === 'อันตราย' || risk === 'danger') return { label: 'อันตราย', tone: 'danger' }
  if (risk === 'สูง' || risk === 'high' || risk === 'ความเสี่ยงสูง') return { label: 'ความเสี่ยงสูง', tone: 'high' }
  if (risk === 'กลาง' || risk === 'medium' || risk === 'ควรระวัง') return { label: 'ควรระวัง', tone: 'caution' }
  if (risk === 'ต่ำ' || risk === 'low' || risk === 'ความเสี่ยงต่ำ') return { label: 'ความเสี่ยงต่ำ', tone: 'low' }
  return { label: 'ข้อมูลน้อย', tone: 'insufficient' }
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

const PhoneIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h3l2 5-2 1.5a15 15 0 0 0 6.5 6.5L16 14l5 2v3a2 2 0 0 1-2 2C10 21 3 14 3 5a2 2 0 0 1 2-2Z" />
  </svg>
)

const WarningIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.3 4.3 2.8 17.2A1.8 1.8 0 0 0 4.4 20h15.2a1.8 1.8 0 0 0 1.6-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    <path strokeLinecap="round" d="M12 9v4m0 3h.01" />
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
  const [reportsLoading, setReportsLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setReports(readLocalReports())
      setReportsLoading(false)
      return undefined
    }

    let isMounted = true
    const loadReports = async () => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('reported_at', { ascending: false })

        if (isMounted) setReports(error ? readLocalReports() : data.map(mapReportFromDatabase))
      } catch {
        if (isMounted) setReports(readLocalReports())
      } finally {
        if (isMounted) setReportsLoading(false)
      }
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
  const [expandedHistoryPhone, setExpandedHistoryPhone] = useState(null)
  const [currentTimestamp, setCurrentTimestamp] = useState(() => new Date())
  const [checkPhone, setCheckPhone] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [checkError, setCheckError] = useState('')
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

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTimestamp(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

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
        const systemHistory = historyByPhone.find((historyEntry) => historyEntry.phone === entry.phone)
        return {
          ...entry,
          count: entry.reports.length,
          riskScore: systemHistory?.riskScore ?? null,
          riskLevel: systemHistory?.riskLevel ?? null,
        }
      })
      .sort((a, b) => getRiskScore(b.reports) - getRiskScore(a.reports))
  }, [currentReporterId, historyByPhone, reports])

  const yesterdaySummary = useMemo(() => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateKey = getLocalDateKey(yesterday)
    const yesterdayReports = reports.filter((report) => getLocalDateKey(report.reportedAt || report.date) === dateKey)
    return { date: yesterday, reports: yesterdayReports }
  }, [reports])

  const communitySummary = useMemo(() => {
    const categoryCounts = reports.reduce((counts, report) => {
      const category = getCategoryName(report.category) || 'ไม่ระบุประเภท'
      counts[category] = (counts[category] || 0) + 1
      return counts
    }, {})
    const categories = Object.entries(categoryCounts).sort((first, second) => second[1] - first[1])

    return { categories }
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
    if (isChecking) return
    setIsChecking(true)
    setCheckError('')

    window.setTimeout(() => {
      try {
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
      } catch {
        setCheckError('ไม่สามารถตรวจสอบข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง')
      } finally {
        setIsChecking(false)
      }
    }, 180)
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

    const reportedAt = new Date().toISOString()
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
      reportedAt,
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
          <div className="history-heading">
            <span className="history-heading-icon"><HistoryIcon /></span>
            <div className="history-heading-copy">
              <h2>เบอร์ที่คุณเคยรายงานจากอุปกรณ์นี้</h2>
            </div>
            <span className="history-count">{ownHistoryByPhone.length} รายการ</span>
          </div>

          <div className="history-list">
            {ownHistoryByPhone.length === 0 ? (
              <div className="empty-history">ยังไม่มีประวัติการรายงานจากอุปกรณ์นี้</div>
            ) : ownHistoryByPhone.map((entry) => {
              const riskBadge = getHistoryRiskBadge(entry)
              const isExpanded = expandedHistoryPhone === entry.phone

              return (
                <article className="history-entry" key={entry.phone}>
                  <button
                    type="button"
                    className="history-row"
                    aria-label={`เปิดรายละเอียดหมายเลข ${entry.phone}`}
                    aria-expanded={isExpanded}
                    aria-controls={`history-details-${entry.phone}`}
                    onClick={() => setExpandedHistoryPhone(isExpanded ? null : entry.phone)}
                  >
                    <span className="history-phone">
                      <strong>{entry.phone}</strong>
                      <small>แจ้งเมื่อ {formatReportedAt(entry.latestReportedAt)}</small>
                    </span>
                    <span className={`risk-badge history-risk-badge ${riskBadge.tone}`}>{riskBadge.label}</span>
                  </button>
                  {isExpanded ? (
                    <div className="history-details" id={`history-details-${entry.phone}`}>
                      <strong>{entry.count} รายงาน</strong>
                      <ul>
                        {entry.reports.map((report) => (
                          <li key={report.id}>
                            <span>{getCategoryName(report.category) || 'ไม่ระบุประเภท'}</span>
                            <time>{formatReportedAt(report.reportedAt || report.date)}</time>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </div>
      )
    }

    return (
      <div className="tab-screen check-screen">
        <div className="last-updated">
          <span className="last-updated-indicator" aria-hidden="true" />
          <span className="last-updated-copy">
            <span>ข้อมูลอัปเดตล่าสุด</span>
            <time dateTime={currentTimestamp.toISOString()}>{formatUpdatedAt(currentTimestamp)}</time>
          </span>
        </div>
        <section className="search-panel" aria-labelledby="search-title">
          <div className="search-panel-title">
            <span className="search-panel-icon"><SearchIcon /></span>
            <div>
              <h2 id="search-title">ตรวจสอบหมายเลขโทรศัพท์</h2>
              <p>ค้นหาประวัติการรายงานและตรวจสอบว่าเบอร์นี้มีความเสี่ยงหรือไม่</p>
            </div>
          </div>
          <form onSubmit={handleCheckSubmit} className="check-form">
            <label className="visually-hidden" htmlFor="phone-check">กรอกหมายเลขโทรศัพท์</label>
            <input
              id="phone-check"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={checkPhone}
              onChange={(event) => setCheckPhone(normalizePhone(event.target.value))}
              placeholder="เช่น 081-234-5678"
              aria-describedby={checkError ? 'check-error' : undefined}
            />
            <button type="submit" disabled={isChecking || reportsLoading}>
              {isChecking || reportsLoading ? <><span className="loading-spinner" aria-hidden="true" />กำลังตรวจสอบ...</> : <><SearchIcon />ตรวจสอบ</>}
            </button>
          </form>
          {checkError ? <p className="check-error" id="check-error" role="alert">{checkError}</p> : null}
        </section>

        <section className="community-section" aria-labelledby="community-title">
          <div className="community-heading">
            <span className="community-heading-icon"><ReportIcon /></span>
            <div>
              <h2 id="community-title">รายงานจากชุมชน</h2>
              <p>ข้อมูลการรายงานจากผู้ใช้งาน</p>
            </div>
            {reports.length > 0 ? <span className="community-total">{reports.length} รายงาน</span> : null}
          </div>

          <div className="daily-summary" aria-live="polite">
            <div>
              <strong>รายงานเมื่อวาน</strong>
              <time dateTime={getLocalDateKey(yesterdaySummary.date)}>{formatReportedDate(yesterdaySummary.date)}</time>
            </div>
            {yesterdaySummary.reports.length > 0
              ? <p>มีรายงานใหม่ {yesterdaySummary.reports.length} รายการ</p>
              : <p>เมื่อวานยังไม่มีรายงาน</p>}
          </div>

          {reportsLoading ? (
            <div className="community-loading" role="status"><span className="loading-spinner" />กำลังโหลดรายงาน</div>
          ) : reports.length === 0 ? (
            <div className="community-empty">
              <span className="empty-report-icon"><ReportIcon /></span>
              <h3>วันนี้ยังไม่มีรายงานใหม่</h3>
              <p>เมื่อมีผู้ใช้งานรายงานหมายเลข ข้อมูลจะแสดงที่นี่</p>
              <button type="button" className="secondary-action" onClick={() => setActiveTab('report')}>+ รายงานหมายเลข</button>
            </div>
          ) : reports.length <= 5 ? (
            <div className="community-data">
              <h3>รายงานล่าสุด</h3>
              <ul className="category-list">
                {communitySummary.categories.map(([category, count]) => (
                  <li key={category}>
                    <span className="category-dot" aria-hidden="true" />
                    <span>{category}</span>
                    <strong>{count} รายงาน</strong>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="community-data">
              <h3>ประเภทการรายงานที่พบบ่อย</h3>
              <ul className="category-bars">
                {[
                  ...communitySummary.categories.slice(0, 5),
                  ...(communitySummary.categories.length > 5
                    ? [['ประเภทอื่น ๆ', communitySummary.categories.slice(5).reduce((total, [, count]) => total + count, 0)]]
                    : []),
                ].map(([category, count]) => (
                  <li key={category}>
                    <div className="category-bar-label"><span>{category}</span><strong>{count} รายงาน</strong></div>
                    <div className="category-track" role="img" aria-label={`${category} ${Math.round((count / reports.length) * 100)} เปอร์เซ็นต์`}>
                      <span style={{ width: `${(count / reports.length) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside className="report-invitation">
          <div>
            <strong>ช่วยกันสร้างฐานข้อมูล</strong>
            <p>พบหมายเลขที่น่าสงสัย? ช่วยรายงานเพื่อให้ผู้ใช้งานคนอื่นระวังได้มากขึ้น</p>
          </div>
          <button type="button" onClick={() => setActiveTab('report')}>รายงานหมายเลข <span aria-hidden="true">→</span></button>
        </aside>
      </div>
    )
  }

  return (
    <div className="phone-frame">
      {renderTabContent()}

      <nav className="bottom-nav" aria-label="เมนูหลัก">
        <button type="button" aria-label="ตรวจสอบ" aria-current={activeTab === 'check' ? 'page' : undefined} className={activeTab === 'check' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('check')}>
          <span className="nav-icon"><SearchIcon /></span>
          <span>ตรวจสอบ</span>
        </button>
        <button type="button" aria-label="รายงาน" aria-current={activeTab === 'report' ? 'page' : undefined} className={activeTab === 'report' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('report')}>
          <span className="nav-icon"><ReportIcon /></span>
          <span>รายงาน</span>
        </button>
        <button type="button" aria-label="ประวัติ" aria-current={activeTab === 'history' ? 'page' : undefined} className={activeTab === 'history' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('history')}>
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
            <h2 id="success-title">ส่งรายงานแล้ว</h2>
            <p className="success-lead">ขอบคุณที่ช่วยกันสร้างสังคมปลอดภัยจากมิจฉาชีพ</p>

            <div className="success-report-card">
              <div className="success-number-row">
                <span className="success-card-icon"><PhoneIcon /></span>
                <div>
                  <small>หมายเลขที่คุณรายงาน</small>
                  <strong>{formatPhoneNumber(successReport.phone)}</strong>
                </div>
              </div>
              <div className="success-meta">
                <span><span><small>วันที่</small><strong>{formatReportedDate(successReport.reportedAt)}</strong></span></span>
                <span><span><small>เวลา</small><strong>{formatReportedTime(successReport.reportedAt)} น.</strong></span></span>
              </div>
            </div>

            <div className="success-emergency-note">
              <WarningIcon />
              <div>
                <strong>ถ้าคุณเสียเงินไปแล้ว</strong>
                <p><a href="https://thaipoliceonline.go.th/" target="_blank" rel="noreferrer">แจ้งความออนไลน์</a><span>หรือโทรสายด่วน <a href="tel:1441">1441</a></span></p>
              </div>
            </div>

            <button type="button" className="success-home-button" onClick={() => { setSuccessReport(null); setActiveTab('check') }}>กลับหน้าหลัก</button>
            <button type="button" className="success-history-button" onClick={() => { setSuccessReport(null); setActiveTab('history') }}>ดูรายงานของฉัน</button>
          </section>
        </div>
      ) : null}

      {checkPopup ? (
        <div className="success-overlay" role="dialog" aria-modal="true" aria-labelledby="check-popup-title">
          <section className={checkPopup.noHistory ? 'check-popup-modal check-popup-no-history' : checkPopup.reporterCount > 0 && checkPopup.reporterCount < REPORT_THRESHOLD ? 'check-popup-modal check-popup-low-reports' : 'check-popup-modal'}>
            <div className={`${getCheckPopupIcon(checkPopup).className}${checkPopup.reporterCount > 0 && checkPopup.reporterCount < REPORT_THRESHOLD ? ' low-reports' : ''}`}>{getCheckPopupIcon(checkPopup).icon}</div>
            <h2 id="check-popup-title">{checkPopup.title}</h2>
            <p className="check-popup-phone">{checkPopup.phone}</p>
            {checkPopup.detail ? <p className="check-popup-detail">{checkPopup.detail}</p> : null}
            {checkPopup.riskLevel ? <span className="check-popup-badge">ระดับความเสี่ยง {checkPopup.riskLevel}</span> : null}
            {checkPopup.found ? <p className="check-popup-disclaimer">ข้อมูลนี้มาจากผู้ใช้งาน ไม่ใช่การยืนยันจากหน่วยงานรัฐ</p> : null}
            {checkPopup.noHistory ? <p className="check-popup-safety-note"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 11v5m0-8h.01" /></svg><span>ไม่ได้แปลว่าปลอดภัย ระวังหากถูกขอ OTP หรือให้โอนเงิน</span></p> : null}
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
