import { useEffect, useMemo, useState } from 'react'
import './App.css'

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

const severityWeight = {
  low: 1,
  medium: 2,
  high: 3,
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
  if (!popup.found) return { className: 'check-popup-icon search', icon: '?' }
  if (popup.riskLevel === 'สูง') return { className: 'check-popup-icon risk-high', icon: '!' }
  if (popup.riskLevel === 'กลาง') return { className: 'check-popup-icon risk-medium', icon: '!' }
  return { className: 'check-popup-icon risk-low', icon: '✓' }
}

const reportsStorageKey = 'kyn-reports'

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

function App() {
  const [reports, setReports] = useState([])

  useEffect(() => {
    fetch('/api/reports')
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable')
        return response.json()
      })
      .then(setReports)
      .catch(() => setReports(readLocalReports()))
  }, [])

  const [activeTab, setActiveTab] = useState('check')
  const [checkPhone, setCheckPhone] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [checkPopup, setCheckPopup] = useState(null)
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
        map[key] = { phone: key, count: 0, maxSeverity: 0, categoryCounts: {}, damageTotal: 0, evidenceTotal: 0 }
      }

      const entry = map[key]
      entry.count += 1
      entry.maxSeverity = Math.max(entry.maxSeverity, severityWeight[report.severity] || 0)
      entry.categoryCounts[report.category] = (entry.categoryCounts[report.category] || 0) + 1
      entry.damageTotal += report.damage === 'high' ? 3 : report.damage === 'medium' ? 2 : 1
      entry.evidenceTotal += report.evidence ? 1 : 0
    })

    return Object.values(map)
      .map((entry) => {
        const highestCategory = Object.entries(entry.categoryCounts).sort((a, b) => b[1] - a[1])[0]
        const riskScore = Math.min(100, entry.count * 12 + entry.maxSeverity * 18 + entry.damageTotal * 5 + entry.evidenceTotal * 8)
        return {
          phone: entry.phone,
          count: entry.count,
          riskScore,
          riskLevel: getRiskLevel(riskScore),
          highestCategory: highestCategory ? getCategoryName(highestCategory[0]) : '',
        }
      })
      .sort((a, b) => b.riskScore - a.riskScore)
  }, [reports])

  const ownHistoryByPhone = useMemo(() => {
    const map = {}

    reports.filter((report) => report.ownerDevice).forEach((report) => {
      const key = report.phone
      if (!map[key]) map[key] = { phone: key, count: 0, maxSeverity: 0, latestReportedAt: null }

      map[key].count += 1
      map[key].maxSeverity = Math.max(map[key].maxSeverity, severityWeight[report.severity] || 0)
      map[key].latestReportedAt = report.reportedAt || report.date
    })

    return Object.values(map)
      .map((entry) => ({
        ...entry,
        riskLevel: getRiskLevel(Math.min(100, entry.count * 18 + entry.maxSeverity * 18)),
      }))
      .sort((a, b) => b.maxSeverity - a.maxSeverity || b.count - a.count)
  }, [reports])

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

    setSearchResult({
      phone: match.phone,
      riskScore: match.riskScore,
      riskLevel: match.riskLevel,
      detail: getReportDetail(match),
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
    setCheckPopup(match ? {
      phone: normalized,
      title: 'เบอร์นี้เคยถูกรายงาน',
      detail: getReportDetail(match),
      found: true,
      riskLevel: match.riskLevel,
    } : {
      phone: normalized,
      title: 'ยังไม่มีประวัติรายงานเบอร์นี้ในระบบ',
      detail: '',
      found: false,
    })
  }

  const handleReportFromCheck = () => {
    setForm((previous) => ({ ...previous, phone: checkPopup.phone }))
    setCheckPopup(null)
    setActiveTab('report')
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
      severity: form.damage === 'high' ? 'high' : 'medium',
      damage,
      evidence: form.evidence === 'yes',
      requestedInfo,
      hasLink: form.hasLink,
      link: form.link,
      evidenceFile: form.evidenceFile,
      detail: form.detail || 'รายงานด้วยข้อมูลทั่วไป',
      status: 'pending',
      ownerDevice: true,
      reportedAt: new Date().toISOString(),
      date: new Date().toLocaleDateString('en-CA'),
    }

    let savedReport
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReport),
      })
      if (!response.ok) throw new Error('API unavailable')
      savedReport = await response.json()
    } catch {
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
            <div className="check-icon">📬</div>
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
                ประเภท <span className="required-mark">*</span>
                <div className="filter-chips" role="group" aria-label="ประเภทการหลอกลวง">
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
                    <button key={value} type="button" className={form.category === value ? 'filter-chip selected' : 'filter-chip'} onClick={() => setForm({ ...form, category: value })}>{label}</button>
                  ))}
                </div>
                {form.category === 'other' ? <input type="text" required value={form.categoryOther} onChange={(event) => setForm({ ...form, categoryOther: event.target.value })} placeholder="ระบุประเภทการหลอกลวง" /> : null}
              </label>

              <label>
                ขอข้อมูลอะไร <span className="required-mark">*</span>
                <div className="filter-chips" role="group" aria-label="ข้อมูลที่ถูกขอ">
                  {['ข้อมูลส่วนตัว', 'ข้อมูลทางการเงิน', 'รหัส OTP', 'รหัสผ่าน', 'other'].map((value) => (
                    <button key={value} type="button" className={form.requestedInfo === value ? 'filter-chip selected' : 'filter-chip'} onClick={() => setForm({ ...form, requestedInfo: value })}>{value === 'other' ? 'อื่นๆ' : value}</button>
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
                    <button key={value} type="button" className={form.hasLink === value ? 'filter-chip selected' : 'filter-chip'} onClick={() => setForm({ ...form, hasLink: value, link: value === 'no' ? '' : form.link })}>{label}</button>
                  ))}
                </div>
                {form.hasLink === 'yes' ? <input type="url" value={form.link} onChange={(event) => setForm({ ...form, link: event.target.value })} placeholder="https://example.com" /> : null}
              </fieldset>

              <fieldset className="form-fieldset">
                <legend>ความเสียหาย</legend>
                <div className="filter-chips">
                  {[['low', 'ไม่ได้รับความเสียหาย'], ['medium', 'ข้อมูลรั่วไหล'], ['high', 'เสียเงิน'], ['other', 'อื่นๆ']].map(([value, label]) => (
                    <button key={value} type="button" className={form.damage === value ? 'filter-chip selected' : 'filter-chip'} onClick={() => setForm({ ...form, damage: value })}>{label}</button>
                  ))}
                </div>
                {form.damage === 'other' ? <input type="text" required value={form.damageOther} onChange={(event) => setForm({ ...form, damageOther: event.target.value })} placeholder="ระบุความเสียหาย" /> : null}
              </fieldset>

              <fieldset className="form-fieldset">
                <legend>หลักฐาน</legend>
                <div className="filter-chips">
                  {[['yes', 'มีหลักฐาน'], ['no', 'ไม่มีหลักฐาน']].map(([value, label]) => (
                    <button key={value} type="button" className={form.evidence === value ? 'filter-chip selected' : 'filter-chip'} onClick={() => setForm({ ...form, evidence: value, evidenceFile: value === 'no' ? '' : form.evidenceFile })}>{label}</button>
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
            <div className="check-icon">☰</div>
            <span>ประวัติ</span>
          </div>

          <h2>ฐานข้อมูล</h2>
          <p>เบอร์ที่คุณเคยรายงานจากอุปกรณ์นี้</p>

          <div className="history-list">
            {ownHistoryByPhone.map((entry, index) => (
              <div key={entry.phone} className="history-row">
                <span>#{index + 1}</span>
                <div className="history-phone">
                  <strong>{entry.phone}</strong>
                  <small>แจ้งเมื่อ {formatReportedAt(entry.latestReportedAt)}</small>
                </div>
                <em>{entry.riskLevel}</em>
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
          <div className="check-icon">🔍</div>
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
          <span className="nav-icon">🔍</span>
          <span>ตรวจสอบหมายเลขโทรศัพท์</span>
        </button>
        <button type="button" className={activeTab === 'report' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('report')}>
          <span className="nav-icon">📬</span>
          <span>รายงานหมายเลขโทรศัพท์</span>
        </button>
        <button type="button" className={activeTab === 'history' ? 'nav-item active' : 'nav-item'} onClick={() => setActiveTab('history')}>
          <span className="nav-icon">☰</span>
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
            <p className="check-popup-question">ต้องการรายงานเบอร์นี้หรือไม่?</p>
            <button type="button" className="success-home-button check-popup-report-button" onClick={handleReportFromCheck}>รายงานเบอร์นี้</button>
            <button type="button" className="check-popup-cancel-button" onClick={() => setCheckPopup(null)}>ยกเลิก</button>
          </section>
        </div>
      ) : null}

    </div>
  )
}

export default App
