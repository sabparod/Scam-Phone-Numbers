import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabase'

const REPORT_THRESHOLD = 3
const OFFICIAL_REPORTS_PREVIEW_COUNT = 2
const officialSource = {
  organization: 'สถานีตำรวจภูธรไทรโยค',
  type: 'government',
  publishedDate: '2025-03-15',
  url: 'https://saiyok.kanchanaburi.police.go.th/%E0%B9%81%E0%B8%88%E0%B9%89%E0%B8%87%E0%B9%80%E0%B8%95%E0%B8%B7%E0%B8%AD%E0%B8%99%E0%B8%A0%E0%B8%B1%E0%B8%A2-%E0%B8%A1%E0%B8%B4%E0%B8%88%E0%B8%89%E0%B8%B2%E0%B8%8A%E0%B8%B5%E0%B8%9E%E0%B9%81%E0%B8%AD/',
}
const officialScamType = 'แอบอ้างหน่วยงานรัฐ'
const officialReports = [
  ...[
    '0633800897',
    '0634322699',
    '0620144189',
    '0620089883',
  ].map((phone) => ({
    phone,
    scamType: officialScamType,
    status: 'reported',
    riskLevel: 'high',
    source: officialSource,
  })),
  {
    phone: '0660952909',
    scamType: 'แอบอ้างธนาคาร',
    status: 'reported',
    riskLevel: 'high',
    source: {
      organization: 'ธนาคารกรุงไทย / กระทรวงการคลัง',
      type: 'government',
      publishedDate: '2025-02-15',
      url: 'https://www.antifakenewscenter.com/%E0%B8%99%E0%B9%82%E0%B8%A2%E0%B8%9A%E0%B8%B2%E0%B8%A2%E0%B8%A3%E0%B8%B1%E0%B8%90%E0%B8%9A%E0%B8%B2%E0%B8%A5-%E0%B8%82%E0%B9%88%E0%B8%B2%E0%B8%A7%E0%B8%AA%E0%B8%B2%E0%B8%A3/%E0%B9%80%E0%B8%88%E0%B9%89%E0%B8%B2%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2%E0%B8%97%E0%B8%B5%E0%B9%88-%E0%B8%98-%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%84%E0%B8%97%E0%B8%A2-%E0%B9%82%E0%B8%97%E0%B8%A3%E0%B8%95%E0%B8%B4%E0%B8%94%E0%B8%95%E0%B9%88%E0%B8%AD%E0%B8%AA%E0%B8%AD%E0%B8%9A%E0%B8%96%E0%B8%B2%E0%B8%A1%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%8A%E0%B8%B2%E0%B8%8A%E0%B8%99/?utm_source=',
    },
  },
  {
    phone: '0620314389',
    scamType: 'แอบอ้างเป็นเจ้าหน้าที่ธนาคารกรุงไทย ใช้เบอร์ส่วนตัวโทรสอบถามข้อมูล',
    status: 'reported',
    riskLevel: 'high',
    source: {
      organization: 'ธนาคารกรุงไทย / กระทรวงการคลัง',
      type: 'government',
      publishedDate: '2025-09-17',
      url: 'https://www.antifakenewscenter.com/%E0%B8%81%E0%B8%B2%E0%B8%A3%E0%B9%80%E0%B8%87%E0%B8%B4%E0%B8%99-%E0%B8%AB%E0%B8%B8%E0%B9%89%E0%B8%99/%E0%B9%80%E0%B8%88%E0%B9%89%E0%B8%B2%E0%B8%AB%E0%B8%99%E0%B9%89%E0%B8%B2%E0%B8%97%E0%B8%B5%E0%B9%88%E0%B8%98%E0%B8%99%E0%B8%B2%E0%B8%84%E0%B8%B2%E0%B8%A3%E0%B8%81%E0%B8%A3%E0%B8%B8%E0%B8%87%E0%B9%84%E0%B8%97%E0%B8%A2-%E0%B9%83%E0%B8%8A%E0%B9%89%E0%B9%80%E0%B8%9A%E0%B8%AD%E0%B8%A3%E0%B9%8C%E0%B8%AA%E0%B9%88%E0%B8%A7%E0%B8%99%E0%B8%95%E0%B8%B1%E0%B8%A7%E0%B9%82%E0%B8%97%E0%B8%A3%E0%B8%AA%E0%B8%AD%E0%B8%9A%E0%B8%96%E0%B8%B2%E0%B8%A1%E0%B8%82%E0%B9%89%E0%B8%AD%E0%B8%A1%E0%B8%B9%E0%B8%A5%E0%B8%A5%E0%B8%B9%E0%B8%81%E0%B8%84%E0%B9%89%E0%B8%B2/?utm_source=',
    },
  },
  {
    phone: '0829464808',
    scamType: 'แอบอ้างเป็นเจ้าหน้าที่ ธอส. โทรสอบถามเลขบัญชีและเลขบัตรประชาชนเพื่ออ้างว่าจะโอนเงินให้',
    status: 'reported',
    riskLevel: 'high',
    source: {
      organization: 'ธนาคารอาคารสงเคราะห์ (ธอส.) / กระทรวงการคลัง',
      type: 'government',
      publishedDate: '2020-12-29',
      url: 'https://www.ghbank.co.th/news/detail/public-relations/press-dec-29-2020?utm_source=',
    },
  },
]

const getOfficialReport = (phone) => officialReports.find((report) => report.phone === phone)

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
  if (category === 'แอบอ้างเป็นตำรวจ') return categoryNames.scam
  if (category === 'แอบอ้างหน่วยงานรัฐ') return categoryNames.scam
  if (category === 'แอบอ้างธนาคาร') return categoryNames.bank
  return categoryNames[category] || category
}

const getOfficialCategoryName = (report) => {
  const scamType = report.scamType || ''
  if (/ธนาคาร|ธอส\./.test(scamType)) return categoryNames.bank
  if (/ตำรวจ|หน่วยงานรัฐ|หน่วยงานราชการ/.test(scamType)) return categoryNames.scam
  return getCategoryName(scamType) || 'ไม่ระบุประเภท'
}

const getReportDetail = (report) => report.highestCategory
  ? `${report.highestCategory} · ${report.count} รายงานในระบบ`
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

const getUniqueReporterCount = (reportList) => new Set(
  reportList
    .map((report) => report.reporterId ?? report.reporter_id)
    .filter(Boolean),
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

const maskPhoneNumber = (value) => {
  const phone = normalizePhone(value || '')
  if (phone.length === 10) return `${phone.slice(0, 3)}-${phone.slice(3, 6)}-****`
  if (phone.length === 9) return `${phone.slice(0, 2)}-***-****`
  if (phone.length <= 1) return '*'
  const visibleDigits = Math.min(3, phone.length - 1)
  return `${phone.slice(0, visibleDigits)}${'*'.repeat(phone.length - visibleDigits)}`
}

const formatReportedAt = (value) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value))

const getReportTimestamp = (value) => {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

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

const bangkokDateFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Bangkok',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const getBangkokDateKey = (value) => {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null

  const parts = Object.fromEntries(
    bangkokDateFormatter.formatToParts(date).map(({ type, value: partValue }) => [type, partValue]),
  )
  return `${parts.year}-${parts.month}-${parts.day}`
}

const formatBangkokDate = (value) => new Intl.DateTimeFormat('th-TH', {
  dateStyle: 'medium',
  timeZone: 'Asia/Bangkok',
}).format(value)

const getRiskLevel = (score) => {
  if (score >= 90) return 'สูงมาก'
  if (score >= 75) return 'สูง'
  if (score >= 40) return 'กลาง'
  return 'ต่ำ'
}

const getHistoryRiskBadge = (entry) => {
  const risk = entry.risk ?? entry.riskLevel
  if (risk === 'สูงมาก' || risk === 'อันตราย' || risk === 'very-high' || risk === 'danger') return { label: 'ความเสี่ยงสูงมาก', tone: 'very-high' }
  if (risk === 'สูง' || risk === 'high' || risk === 'ความเสี่ยงสูง') return { label: 'ความเสี่ยงสูง', tone: 'high' }
  if (risk === 'กลาง' || risk === 'medium' || risk === 'ควรระวัง') return { label: 'ควรระวัง', tone: 'caution' }
  if (risk === 'ต่ำ' || risk === 'low' || risk === 'ความเสี่ยงต่ำ') return { label: 'ความเสี่ยงต่ำ', tone: 'low' }
  return { label: 'ข้อมูลไม่เพียงพอ', tone: 'insufficient' }
}

const getScoreColor = (score) => {
  if (score >= 75) return '#f97316'
  if (score >= 40) return '#facc15'
  return '#34d399'
}

const getCheckPopupIcon = (popup) => {
  if (popup.noHistory) return { className: 'check-popup-icon no-history', icon: 'i' }
  if (!popup.found) return { className: 'check-popup-icon search', icon: '?' }
  if (popup.riskLevel === 'สูงมาก') return { className: 'check-popup-icon risk-very-high', icon: '!' }
  if (popup.riskLevel === 'สูง') return { className: 'check-popup-icon risk-high', icon: '!' }
  if (popup.riskLevel === 'กลาง') return { className: 'check-popup-icon risk-medium', icon: '!' }
  if (popup.riskLevel === 'ต่ำ') return { className: 'check-popup-icon risk-low', icon: '!' }
  return { className: 'check-popup-icon insufficient', icon: 'i' }
}

const getRiskTone = (riskLevel) => {
  if (riskLevel === 'สูงมาก' || riskLevel === 'อันตราย') return 'very-high'
  if (riskLevel === 'สูง') return 'high'
  if (riskLevel === 'กลาง') return 'medium'
  if (riskLevel === 'ต่ำ') return 'low'
  return 'insufficient'
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

const hasDuplicateReport = (reportList, phone, reporterId) => reportList.some((report) => (
  normalizePhone(report.phone || '') === phone
  && (report.reporterId ?? report.reporter_id) === reporterId
))

const isPhoneReporterUniqueViolation = (error) => error?.code === '23505' && (
  error.constraint === 'reports_phone_reporter_id_unique_idx'
  || error.message?.includes('reports_phone_reporter_id_unique_idx')
  || error.details?.includes('(phone, reporter_id)')
)

const saveLocalReport = (report) => {
  const reports = readLocalReports()
  if (hasDuplicateReport(reports, report.phone, report.reporterId)) return null

  reports.unshift(report)
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

function ReportModal({ className = '', titleId, onClose, children }) {
  return (
    <section className={`check-popup-modal ${className}`} aria-labelledby={titleId}>
      <button type="button" className="modal-close" aria-label="ปิดหน้าต่าง" onClick={onClose}>×</button>
      {children}
    </section>
  )
}

function DetailCard({ className = '', children }) {
  return <div className={`report-detail-card ${className}`}>{children}</div>
}

function AlertBanner({ as: Element = 'div', className = '', children, ...props }) {
  return <Element className={`report-alert-banner ${className}`} {...props}>{children}</Element>
}

function StatusBadge({ className = '', children }) {
  return <span className={`report-status-badge ${className}`}>{children}</span>
}

function ModalButton({ variant = 'primary', type = 'button', className = '', children, ...props }) {
  return (
    <button
      {...props}
      type={type}
      className={`report-modal-button report-modal-button-${variant} ${className}`}
    >
      {children}
    </button>
  )
}

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
  const [selectedFrequentCategory, setSelectedFrequentCategory] = useState(null)
  const [showAllOfficialReports, setShowAllOfficialReports] = useState(false)
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
  const [isReportSubmitting, setIsReportSubmitting] = useState(false)
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
  const officialPopupReportCount = checkPopup?.officialSource
    ? officialReports.filter((report) => report.phone === checkPopup.phone).length
    : 0

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
    let sourceOrder = 0

    reports.filter((report) => report.reporterId === currentReporterId).forEach((report) => {
      const key = report.phone
      if (!map[key]) {
        map[key] = { phone: key, reports: [], latestReportedAt: null, sourceOrder: sourceOrder++ }
      }

      const entry = map[key]
      const reportedAt = report.reportedAt || report.date
      entry.reports.push(report)
      if (!entry.latestReportedAt || getReportTimestamp(reportedAt) > getReportTimestamp(entry.latestReportedAt)) {
        entry.latestReportedAt = reportedAt
      }
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
      .sort((first, second) => (
        getReportTimestamp(second.latestReportedAt) - getReportTimestamp(first.latestReportedAt)
        || first.sourceOrder - second.sourceOrder
      ))
      .map(({ sourceOrder: _sourceOrder, ...entry }) => entry)
  }, [currentReporterId, historyByPhone, reports])

  const yesterdaySummary = useMemo(() => {
    const todayParts = Object.fromEntries(
      bangkokDateFormatter.formatToParts(currentTimestamp)
        .map(({ type, value }) => [type, Number(value)]),
    )
    const yesterday = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day - 1))
    const dateKey = getBangkokDateKey(yesterday)
    const yesterdayReports = reports.filter((report) => (
      getBangkokDateKey(report.reportedAt || report.date) === dateKey
    ))
    const categoryCounts = new Map()

    yesterdayReports.forEach((report) => {
      const category = getCategoryName(report.category) || 'ไม่ระบุประเภท'
      categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1)
    })

    const categories = [...categoryCounts.entries()].sort((first, second) => (
      second[1] - first[1] || first[0].localeCompare(second[0], 'th')
    ))

    return { date: yesterday, dateKey, total: yesterdayReports.length, categories }
  }, [currentTimestamp, reports])

  const communitySummary = useMemo(() => {
    const categoryCounts = reports.reduce((counts, report) => {
      const category = getCategoryName(report.category) || 'ไม่ระบุประเภท'
      counts[category] = (counts[category] || 0) + 1
      return counts
    }, {})
    const categories = Object.entries(categoryCounts).sort((first, second) => second[1] - first[1])

    return { categories }
  }, [reports])

  const frequentCategorySummary = useMemo(() => {
    const categoryCounts = new Map()
    const addCount = (category, source) => {
      const entry = categoryCounts.get(category) || { community: 0, official: 0 }
      entry[source] += 1
      categoryCounts.set(category, entry)
    }

    reports.forEach((report) => {
      addCount(getCategoryName(report.category) || 'ไม่ระบุประเภท', 'community')
    })
    officialReports.forEach((report) => {
      addCount(getOfficialCategoryName(report), 'official')
    })

    const categories = [...categoryCounts.entries()]
      .map(([category, counts]) => ({
        category,
        count: counts.community + counts.official,
      }))
      .sort((first, second) => second.count - first.count)
    const total = reports.length + officialReports.length

    return { categories, total }
  }, [reports])

  const selectedCategoryReports = useMemo(() => {
    if (!selectedFrequentCategory) return null

    const includedCategories = new Set(selectedFrequentCategory.categories)
    const communityCategoryReports = reports.filter((report) => (
      includedCategories.has(getCategoryName(report.category) || 'ไม่ระบุประเภท')
    ))
    const officialCategoryReports = officialReports.filter((report) => (
      includedCategories.has(getOfficialCategoryName(report))
    ))
    const reportsByPhone = new Map()

    const addPhoneReport = (report, source) => {
      const normalizedPhone = normalizePhone(report.phone || '')
      const key = normalizedPhone || 'unknown'
      const entry = reportsByPhone.get(key) || { phone: normalizedPhone, communityCount: 0, officialCount: 0 }
      entry[`${source}Count`] += 1
      reportsByPhone.set(key, entry)
    }

    communityCategoryReports.forEach((report) => addPhoneReport(report, 'community'))
    officialCategoryReports.forEach((report) => addPhoneReport(report, 'official'))
    const phones = [...reportsByPhone.values()]
      .map((entry) => ({
        ...entry,
        count: entry.communityCount + entry.officialCount,
      }))
      .sort((first, second) => second.count - first.count)

    return {
      total: communityCategoryReports.length + officialCategoryReports.length,
      phones,
    }
  }, [reports, selectedFrequentCategory])

  useEffect(() => {
    if (!selectedFrequentCategory) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedFrequentCategory(null)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedFrequentCategory])

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

    const officialMatch = getOfficialReport(normalized)
    const match = historyByPhone.find((entry) => entry.phone === normalized)
    if (officialMatch) {
      setSearchResult({
        phone: normalized,
        riskLevel: 'สูง',
        detail: `พบข้อมูลจาก${officialMatch.source.organization}: ${officialMatch.scamType}`,
        source: officialMatch.source,
      })
      return
    }

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

        const officialMatch = getOfficialReport(normalized)
        const match = historyByPhone.find((entry) => entry.phone === normalized)
        if (officialMatch) {
          setCheckPopup({
            phone: normalized,
            title: 'พบรายงานจากแหล่งทางการ',
            detail: `${officialMatch.scamType} ตามข้อมูลจาก${officialMatch.source.organization}`,
            found: true,
            riskLevel: 'สูง',
            officialScamType: officialMatch.scamType,
            officialSource: officialMatch.source,
          })
          return
        }

        if (match) {
          const hasEnoughReports = match.reporterCount >= REPORT_THRESHOLD
          setCheckPopup({
            phone: normalized,
            title: hasEnoughReports ? 'มีผู้รายงาน' : 'มีผู้รายงาน',
            detail: hasEnoughReports
              ? getReportDetail(match)
              : 'ยังมีรายงานไม่มากพอที่จะประเมินระดับความเสี่ยง',
            found: true,
            reportCount: match.count,
            reporterCount: match.reporterCount,
            riskLevel: hasEnoughReports ? match.riskLevel : null,
            highestCategory: match.highestCategory,
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
    if (isReportSubmitting) return

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
    if (
      hasDuplicateReport(reports, phone, currentReporterId)
      || hasDuplicateReport(readLocalReports(), phone, currentReporterId)
    ) {
      setReportError('คุณได้รายงานหมายเลขนี้จากอุปกรณ์นี้แล้ว')
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
      reporterId: currentReporterId,
      status: 'pending',
      ownerDevice: true,
      reportedAt,
      date: new Date().toLocaleDateString('en-CA'),
    }

    setIsReportSubmitting(true)
    try {
      let savedReport
      if (supabase) {
        const { data, error } = await supabase
          .from('reports')
          .insert(mapReportToDatabase(newReport))
          .select()
          .single()

        if (isPhoneReporterUniqueViolation(error)) {
          setReportError('คุณได้รายงานหมายเลขนี้จากอุปกรณ์นี้แล้ว')
          return
        }
        savedReport = error ? saveLocalReport(newReport) : mapReportFromDatabase(data)
      } else {
        savedReport = saveLocalReport(newReport)
      }

      if (!savedReport) {
        setReportError('คุณได้รายงานหมายเลขนี้จากอุปกรณ์นี้แล้ว')
        return
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
    } catch (error) {
      setReportError(isPhoneReporterUniqueViolation(error)
        ? 'คุณได้รายงานหมายเลขนี้จากอุปกรณ์นี้แล้ว'
        : 'บันทึกรายงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setIsReportSubmitting(false)
    }
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

            <button type="submit" className="submit-button" disabled={isReportSubmitting}>
              {isReportSubmitting ? 'กำลังบันทึกรายงาน...' : 'บันทึกรายงาน'}
            </button>
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

        {officialReports.length > 0 ? (
          <section className="official-source-section" aria-labelledby="official-source-title">
            <div className="community-heading">
              <span className="community-heading-icon"><ReportIcon /></span>
              <div>
                <h2 id="official-source-title">รายงานจากแหล่งทางการ</h2>
                <p>ข้อมูลจากหน่วยงานที่น่าเชื่อถือ</p>
              </div>
              <span className="community-total">{officialReports.length} รายการ</span>
            </div>
            <ul>
              {officialReports.slice(0, showAllOfficialReports ? undefined : OFFICIAL_REPORTS_PREVIEW_COUNT).map((report) => (
                <li key={report.phone}>
                  <div className="official-source-record">
                    <strong>{formatPhoneNumber(report.phone)}</strong>
                    <span>{report.scamType} · {report.source.organization}</span>
                    <small>เผยแพร่ {formatReportedDate(report.source.publishedDate)}</small>
                  </div>
                  <span className="official-source-risk">ความเสี่ยงสูง</span>
                  <a href={report.source.url} target="_blank" rel="noreferrer">
                    เว็บไซต์ต้นทาง
                  </a>
                </li>
              ))}
            </ul>
            {officialReports.length > OFFICIAL_REPORTS_PREVIEW_COUNT ? (
              <button
                type="button"
                className="official-source-toggle"
                aria-expanded={showAllOfficialReports}
                onClick={() => setShowAllOfficialReports((isExpanded) => !isExpanded)}
              >
                {showAllOfficialReports
                  ? 'แสดงน้อยลง'
                  : `ดูข้อมูลทั้งหมด (${officialReports.length} รายการ)`}
                <span aria-hidden="true">{showAllOfficialReports ? '⌃' : '⌄'}</span>
              </button>
            ) : null}
          </section>
        ) : null}

        <section className="community-section" aria-labelledby="community-title">
          <div className="community-heading">
            <span className="community-heading-icon"><ReportIcon /></span>
            <div>
              <h2 id="community-title">รายงานจากชุมชน</h2>
              <p>ข้อมูลการรายงานจากผู้ใช้งาน</p>
            </div>
          </div>

          {reports.length > 0 ? (
            <div className="community-metrics" aria-label="สถิติรายงานจากชุมชน">
              <div>
                <strong>{reports.length}</strong>
                <span>จำนวนรายงาน</span>
              </div>
              <div>
                <strong>{getUniqueReporterCount(reports)}</strong>
                <span>เบอร์โทรศัพท์ที่ถูกรายงานที่ไม่ซ้ำ</span>
              </div>
            </div>
          ) : null}

          <div className="daily-summary" aria-live="polite">
            <div className="daily-summary-header">
              <strong>ประเภทที่มีการรายงานเมื่อวาน</strong>
              <time dateTime={yesterdaySummary.dateKey}>{formatBangkokDate(yesterdaySummary.date)}</time>
            </div>
            {reportsLoading ? (
              <p className="yesterday-summary-loading"><span className="loading-spinner" />กำลังโหลดรายงาน</p>
            ) : yesterdaySummary.total > 0 ? (
              <>
                <div className="yesterday-summary-total">
                  <span>รายงานใหม่ทั้งหมด</span>
                  <strong>{yesterdaySummary.total} รายงาน</strong>
                </div>
                <ul className="yesterday-category-list">
                  {yesterdaySummary.categories.map(([category, count]) => (
                    <li key={category}>
                      <span className="category-dot" aria-hidden="true" />
                      <span>{category}</span>
                      <strong>{count} รายงาน</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="yesterday-summary-empty">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path strokeLinecap="round" d="M16 3v4M8 3v4M3 10h18m-11 5 2 2 4-4" />
                </svg>
                <strong>เมื่อวานไม่มีรายงานใหม่</strong>
              </div>
            )}
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
                ...frequentCategorySummary.categories.slice(0, 5).map(({ category, count }) => ({
                    category,
                    count,
                    includedCategories: [category],
                  })),
                ...(frequentCategorySummary.categories.length > 5
                    ? [{
                      category: 'ประเภทอื่น ๆ',
                    count: frequentCategorySummary.categories.slice(5).reduce((total, { count: categoryCount }) => total + categoryCount, 0),
                    includedCategories: frequentCategorySummary.categories.slice(5).map(({ category }) => category),
                    }]
                    : []),
                ].map(({ category, count, includedCategories }) => (
                  <li key={category}>
                    <div className="category-bar-label">
                      <button
                        type="button"
                        className="category-name-button"
                        onClick={() => setSelectedFrequentCategory({ name: category, categories: includedCategories })}
                      >
                        {category}
                      </button>
                      <button
                        type="button"
                        className="category-count-button"
                        onClick={() => setSelectedFrequentCategory({ name: category, categories: includedCategories })}
                      >
                        {count} ครั้ง
                      </button>
                    </div>
                    <div className="category-track" role="img" aria-label={`${category} ${Math.round((count / frequentCategorySummary.total) * 100)} เปอร์เซ็นต์`}>
                      <span style={{ width: `${(count / frequentCategorySummary.total) * 100}%` }} />
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

      {selectedFrequentCategory && selectedCategoryReports ? (
        <div
          className="success-overlay category-detail-overlay"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelectedFrequentCategory(null)
          }}
        >
          <section className="category-detail-modal" role="dialog" aria-modal="true" aria-labelledby="category-detail-title">
            <button type="button" className="modal-close" aria-label="ปิดรายละเอียด" onClick={() => setSelectedFrequentCategory(null)}>×</button>
            <h2 id="category-detail-title">{selectedFrequentCategory.name}</h2>
            <p className="category-detail-total">{selectedCategoryReports.total} รายงาน</p>
            {selectedCategoryReports.phones.length > 0 ? (
              <ul className="category-detail-list">
                {selectedCategoryReports.phones.map(({ phone, count, communityCount, officialCount }) => (
                  <li key={phone || 'unknown'}>
                    <strong>{phone ? maskPhoneNumber(phone) : 'ไม่ระบุหมายเลข'}</strong>
                    <span>{count} รายงาน</span>
                    <small>ชุมชน {communityCount} / แหล่งทางการ {officialCount}</small>
                  </li>
                ))}
              </ul>
            ) : <p className="category-detail-empty">ไม่พบหมายเลขในประเภทนี้</p>}
          </section>
        </div>
      ) : null}

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
          <ReportModal
            className={checkPopup.noHistory ? 'check-popup-no-history' : checkPopup.reporterCount > 0 && checkPopup.reporterCount < REPORT_THRESHOLD ? 'check-popup-low-reports' : ''}
            titleId="check-popup-title"
            onClose={() => setCheckPopup(null)}
          >
            <div className="report-modal-header">
              <div className={`check-popup-icon report-modal-icon ${checkPopup.noHistory ? 'no-history' : checkPopup.officialSource ? 'reported' : getCheckPopupIcon(checkPopup).className}${checkPopup.reporterCount > 0 && checkPopup.reporterCount < REPORT_THRESHOLD ? ' low-reports' : ''}`}>
                {checkPopup.officialSource
                  ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3 4.5 6v5.2c0 4.4 3 8.4 7.5 9.8 4.5-1.4 7.5-5.4 7.5-9.8V6L12 3Z" /><path strokeLinecap="round" d="M12 8v4m0 3h.01" /></svg>
                  : checkPopup.noHistory
                    ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 11v5m0-8h.01" /></svg>
                    : checkPopup.riskLevel === 'ต่ำ'
                      ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>
                      : checkPopup.found
                        ? <WarningIcon />
                        : getCheckPopupIcon(checkPopup).icon}
              </div>
              <h2 id="check-popup-title">{checkPopup.officialSource ? 'พบข้อมูลจากแหล่งทางการ' : checkPopup.title}</h2>
            </div>
            <div className="report-modal-phone">
              <span className="check-popup-number-label">หมายเลขโทรศัพท์</span>
              <p className="check-popup-phone">{formatPhoneNumber(checkPopup.phone)}</p>
            </div>
            {checkPopup.riskLevel ? (
              <StatusBadge className={`check-popup-badge ${getRiskTone(checkPopup.riskLevel)}`}>
                {getRiskTone(checkPopup.riskLevel) === 'low'
                  ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 4 4L19 6" /></svg>
                  : <WarningIcon />}
                {checkPopup.officialSource ? 'ความเสี่ยงสูง' : checkPopup.riskLevel === 'กลาง' ? 'ควรระวัง' : `ความเสี่ยง${checkPopup.riskLevel}`}
              </StatusBadge>
            ) : checkPopup.noHistory || checkPopup.reporterCount > 0 ? (
              <StatusBadge className={`check-popup-badge ${checkPopup.noHistory ? 'no-data' : 'insufficient'}`}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 11v5m0-8h.01" /></svg>
                {checkPopup.noHistory ? 'ยังไม่มีข้อมูล' : 'ข้อมูลไม่เพียงพอ'}
              </StatusBadge>
            ) : null}
            <DetailCard className="check-popup-summary">
              <span>ประเภทการรายงาน</span><strong>{checkPopup.officialSource ? checkPopup.officialScamType : checkPopup.highestCategory || '—'}</strong>
              <span>จำนวนรายงาน</span><strong>{checkPopup.officialSource ? officialPopupReportCount : checkPopup.reportCount || 0} ครั้ง</strong>
              <span>แหล่งข้อมูล</span><strong>{checkPopup.officialSource ? 'แหล่งทางการ' : checkPopup.found ? 'ชุมชน' : 'ยังไม่มีข้อมูล'}</strong>
            </DetailCard>
            {!checkPopup.officialSource && checkPopup.detail && (!checkPopup.found || !checkPopup.reportCount || !checkPopup.riskLevel)
              ? <p className="check-popup-detail">{checkPopup.detail}</p>
              : null}
            {checkPopup.officialSource ? (
              <DetailCard className="official-source-card">
                <div className="official-source-card-heading">
                  <span className="official-source-shield">
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 3.5 5v6.2c0 5.2 3.6 9.9 8.5 11.3 4.9-1.4 8.5-6.1 8.5-11.3V5L12 2Zm-1.1 14.7-4-4 1.5-1.5 2.5 2.5 4.7-4.7 1.5 1.5-6.2 6.2Z" /></svg>
                  </span>
                  <strong>แหล่งที่มาของข้อมูล</strong>
                </div>
                <p className="official-source-organization">{checkPopup.officialSource.organization}</p>
                <p className="official-source-date">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3.5" y="5" width="17" height="16" rx="2" /><path strokeLinecap="round" d="M7.5 3v4m9-4v4M4 9.5h16" /></svg>
                  <span>เผยแพร่ {formatReportedDate(checkPopup.officialSource.publishedDate)}</span>
                </p>
                <a className="official-source-link" href={checkPopup.officialSource.url} target="_blank" rel="noreferrer">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M13 5h6v6m-9 4 9-9M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>
                  <span>ดูข้อมูลจากเว็บไซต์ต้นทาง</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </DetailCard>
            ) : checkPopup.found ? (
              <AlertBanner className="check-popup-disclaimer" role="note">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 11v5m0-8h.01" /></svg>
                <span>ข้อมูลนี้มาจากผู้ใช้งาน ไม่ใช่การยืนยันจากหน่วยงานรัฐ</span>
              </AlertBanner>
            ) : null}
            {checkPopup.noHistory ? <AlertBanner as="p" className="check-popup-safety-note"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 11v5m0-8h.01" /></svg><span>ไม่ได้แปลว่าปลอดภัย ระวังหากถูกขอ OTP หรือให้โอนเงิน</span></AlertBanner> : null}
            <ModalButton className="success-home-button check-popup-report-button" onClick={handleReportFromCheck}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9.5a1.5 1.5 0 0 0-1.5 1.5v2A1.5 1.5 0 0 0 3 14.5h2.2l1.7 4.1a1 1 0 0 0 .92.62h1.5a1 1 0 0 0 .93-1.37L8.8 14.5h.7l9 5a1 1 0 0 0 1.5-.87V5.37a1 1 0 0 0-1.5-.87l-9 5H3Zm16-1.42 3.5-2.02v11.88L19 15.92V8.08Z" /></svg>
              รายงานเบอร์นี้
            </ModalButton>
            <ModalButton variant="secondary" className="check-popup-cancel-button" onClick={() => setCheckPopup(null)}>ปิด</ModalButton>
            {checkPopup.found ? <button type="button" className="check-popup-link" onClick={handleOpenDisputeForm}>เป็นเจ้าของเบอร์นี้? ขอให้ตรวจสอบ</button> : null}
          </ReportModal>
        </div>
      ) : null}

      {showDisputeForm ? (
        <div className="success-overlay" role="dialog" aria-modal="true" aria-labelledby="dispute-title">
          <section className="check-popup-modal dispute-modal">
            <button type="button" className="modal-close" aria-label="ปิดหน้าต่าง" disabled={isDisputeSubmitting} onClick={() => setShowDisputeForm(false)}>×</button>
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
