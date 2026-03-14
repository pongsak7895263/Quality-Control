import { useState, useEffect, useCallback, useMemo } from "react";

// ─── Persistent Storage Helper ───
const Storage = {
  async get(key) {
    try {
      const r = await window.storage.get(key);
      return r ? JSON.parse(r.value) : null;
    } catch { return null; }
  },
  async set(key, val) {
    try {
      await window.storage.set(key, JSON.stringify(val));
    } catch (e) { console.error("Storage set error:", e); }
  },
};

// ─── Constants ───
const STATUS_COLORS = {
  open: { bg: "#FEE2E2", text: "#DC2626", label: "Open" },
  investigating: { bg: "#FEF3C7", text: "#D97706", label: "Investigating" },
  resolved: { bg: "#D1FAE5", text: "#059669", label: "Resolved" },
  closed: { bg: "#E0E7FF", text: "#4F46E5", label: "Closed" },
  ncr_issued: { bg: "#FCE7F3", text: "#DB2777", label: "NCR Issued" },
};

const SEVERITY_MAP = {
  critical: { color: "#DC2626", icon: "⚠", label: "Critical" },
  major: { color: "#EA580C", icon: "●", label: "Major" },
  minor: { color: "#CA8A04", icon: "◆", label: "Minor" },
  observation: { color: "#6B7280", icon: "○", label: "Observation" },
};

const LINES = ["Line 1", "Line 2", "Line 3", "Line 4", "Line 5", "Cutting", "Forging", "Heat Treatment", "Machining", "Assembly"];
const SHIFTS = ["Day", "Night", "AB"];
const CATEGORIES = ["Machine Breakdown", "Material Defect", "Process Deviation", "Quality Issue", "Safety Concern", "Tool Wear", "Calibration", "Environment", "Human Error", "Other"];

const genId = () => `TH-${Date.now().toString(36).toUpperCase()}`;
const genAttId = () => `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const FILE_ICONS = {
  image: { icon: "🖼️", color: "#06B6D4", label: "รูปภาพ" },
  pdf: { icon: "📄", color: "#EF4444", label: "PDF" },
  doc: { icon: "📝", color: "#3B82F6", label: "เอกสาร" },
  excel: { icon: "📊", color: "#22C55E", label: "Excel" },
  video: { icon: "🎬", color: "#A855F7", label: "วิดีโอ" },
  other: { icon: "📎", color: "#6B7280", label: "ไฟล์" },
};

const getFileType = (name) => {
  const ext = (name || "").split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx", "txt", "rtf"].includes(ext)) return "doc";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["mp4", "mov", "avi", "webm"].includes(ext)) return "video";
  return "other";
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};
const fmtDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
};
const fmtDateTime = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  return dt.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

// ─── Seed demo data ───
const DEMO_DATA = [
  {
    id: "TH-DEMO01", status: "resolved", severity: "major", category: "Machine Breakdown",
    line: "Line 2", shift: "Day", reportedBy: "สมชาย", reportedAt: "2026-03-01T08:30:00",
    what: "เครื่อง Press #3 หยุดทำงานกะทันหัน แรงดัน Hydraulic ตก", who: "ช่างประจำเครื่อง - สมชาย",
    when: "2026-03-01 เวลา 08:15", where: "Line 2 - สถานี Press #3", why: "ซีลไฮดรอลิกรั่ว ทำให้แรงดันตก",
    how: "พบน้ำมันรั่วที่ข้อต่อ ส่งผลให้ระบบ Safety หยุดเครื่องอัตโนมัติ",
    correctiveAction: "เปลี่ยนซีลไฮดรอลิกชุดใหม่ ตรวจสอบแรงดันปกติ",
    preventiveAction: "เพิ่มรอบการตรวจซีลเป็นทุก 3 เดือน", resolvedAt: "2026-03-01T14:00:00", resolvedBy: "ช่างซ่อม - วิชัย",
    ncrIssued: false, ncrNumber: "", attachments: [], comments: [
      { by: "วิชัย", at: "2026-03-01T10:00:00", text: "เริ่มตรวจสอบ พบน้ำมันรั่วที่ซีล" },
      { by: "วิชัย", at: "2026-03-01T14:00:00", text: "เปลี่ยนซีลเสร็จ ทดสอบเครื่องปกติแล้ว" },
    ],
  },
  {
    id: "TH-DEMO02", status: "ncr_issued", severity: "critical", category: "Quality Issue",
    line: "Forging", shift: "Night", reportedBy: "วิภา", reportedAt: "2026-03-05T22:45:00",
    what: "พบชิ้นงาน Forging Lot F-2603 มี Crack ที่ผิวหน้า จำนวน 15 ชิ้นจาก 200 ชิ้น (7.5%)",
    who: "QC Inspector - วิภา", when: "2026-03-05 เวลา 22:30 ระหว่างตรวจสอบ Final Inspection",
    where: "Forging Area - Die #7", why: "อุณหภูมิ Die สูงเกินกำหนด ทำให้เกิด Thermal Crack",
    how: "ตรวจพบจาก Visual Inspection และยืนยันด้วย Magnetic Particle Testing",
    correctiveAction: "หยุดการผลิต Lot นี้ คัดแยกชิ้นงานเสียออก 100% Inspection ชิ้นที่เหลือ",
    preventiveAction: "ติดตั้ง Temperature Sensor เพิ่มเติมที่ Die พร้อม Alarm",
    resolvedAt: "", resolvedBy: "", ncrIssued: true, ncrNumber: "NCR-2603-001",
    attachments: [], comments: [
      { by: "วิภา", at: "2026-03-05T23:00:00", text: "แจ้ง Supervisor ดำเนินการ Hold Lot แล้ว" },
      { by: "สุรชัย", at: "2026-03-06T08:00:00", text: "ออก NCR-2603-001 แจ้งลูกค้าแล้ว" },
    ],
  },
  {
    id: "TH-DEMO03", status: "open", severity: "minor", category: "Tool Wear",
    line: "Machining", shift: "Day", reportedBy: "ประเสริฐ", reportedAt: "2026-03-10T10:15:00",
    what: "Insert Cutting Tool สึกหรอเร็วกว่าปกติ อายุการใช้งานลดลง 40%",
    who: "Operator - ประเสริฐ", when: "2026-03-10 เวลา 10:00",
    where: "Machining Center #2 - Spindle A", why: "ยังไม่ทราบสาเหตุ อยู่ระหว่างตรวจสอบ",
    how: "สังเกตจากค่า Surface Roughness ที่เพิ่มขึ้นและเสียง Chatter", correctiveAction: "", preventiveAction: "",
    resolvedAt: "", resolvedBy: "", ncrIssued: false, ncrNumber: "",
    attachments: [], comments: [],
  },
];

// ─── Main App ───
export default function TroubleHistory() {
  const [records, setRecords] = useState([]);
  const [view, setView] = useState("dashboard"); // dashboard, list, form, detail, ncr, summary
  const [selectedId, setSelectedId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLine, setFilterLine] = useState("all");
  const [filterMonth, setFilterMonth] = useState("");
  const [searchText, setSearchText] = useState("");
  const [loaded, setLoaded] = useState(false);

  // Load from storage
  useEffect(() => {
    (async () => {
      const saved = await Storage.get("trouble-records");
      if (saved && saved.length > 0) {
        setRecords(saved);
      } else {
        setRecords(DEMO_DATA);
        await Storage.set("trouble-records", DEMO_DATA);
      }
      setLoaded(true);
    })();
  }, []);

  // Save to storage
  useEffect(() => {
    if (loaded) Storage.set("trouble-records", records);
  }, [records, loaded]);

  const saveRecord = useCallback((rec) => {
    setRecords((prev) => {
      const idx = prev.findIndex((r) => r.id === rec.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = rec;
        return next;
      }
      return [rec, ...prev];
    });
  }, []);

  const deleteRecord = useCallback((id) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setView("list");
  }, []);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterLine !== "all" && r.line !== filterLine) return false;
      if (filterMonth) {
        const m = r.reportedAt.slice(0, 7);
        if (m !== filterMonth) return false;
      }
      if (searchText) {
        const s = searchText.toLowerCase();
        const hay = `${r.id} ${r.what} ${r.who} ${r.where} ${r.category} ${r.reportedBy}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [records, filterStatus, filterLine, filterMonth, searchText]);

  const selected = records.find((r) => r.id === selectedId);

  // ─── Styles ───
  const font = "'Sarabun', 'Noto Sans Thai', sans-serif";

  return (
    <div style={{ fontFamily: font, background: "#0C0F1A", color: "#E2E8F0", minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: -200, right: -200, width: 500, height: 500, background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: -200, left: -100, width: 400, height: 400, background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Top Bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(12,15,26,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #6366F1, #06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700 }}>T</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "0.5px", color: "#F1F5F9" }}>TROUBLE HISTORY</div>
              <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "1px" }}>PRODUCTION LINE MANAGEMENT</div>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 4 }}>
            {[
              { key: "dashboard", icon: "◉", label: "Dashboard" },
              { key: "list", icon: "☰", label: "รายการปัญหา" },
              { key: "form", icon: "+", label: "แจ้งปัญหาใหม่" },
              { key: "summary", icon: "◧", label: "สรุปรายเดือน" },
            ].map((n) => (
              <button key={n.key} onClick={() => { setView(n.key); setSelectedId(null); setEditMode(false); }}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, fontFamily: font,
                  background: view === n.key ? "rgba(99,102,241,0.2)" : "transparent",
                  color: view === n.key ? "#A5B4FC" : "#94A3B8",
                  transition: "all 0.2s",
                }}>
                <span style={{ marginRight: 6 }}>{n.icon}</span>{n.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 24px 80px", position: "relative", zIndex: 1 }}>
        {view === "dashboard" && <Dashboard records={records} setView={setView} setFilterStatus={setFilterStatus} setFilterLine={setFilterLine} />}
        {view === "list" && <ListView records={filtered} filterStatus={filterStatus} setFilterStatus={setFilterStatus} filterLine={filterLine} setFilterLine={setFilterLine} filterMonth={filterMonth} setFilterMonth={setFilterMonth} searchText={searchText} setSearchText={setSearchText} onSelect={(id) => { setSelectedId(id); setView("detail"); }} />}
        {view === "form" && <RecordForm record={editMode ? selected : null} onSave={(r) => { saveRecord(r); setView("detail"); setSelectedId(r.id); setEditMode(false); }} onCancel={() => { setView(editMode ? "detail" : "list"); setEditMode(false); }} />}
        {view === "detail" && selected && <DetailView record={selected} onEdit={() => { setEditMode(true); setView("form"); }} onDelete={deleteRecord} onSave={saveRecord} onBack={() => setView("list")} />}
        {view === "summary" && <MonthlySummary records={records} />}
      </div>
    </div>
  );
}

// ─── Image Lightbox ───
function ImageLightbox({ src, name, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: 40 }}>
      <div style={{ position: "absolute", top: 16, right: 24, color: "#fff", fontSize: 32, cursor: "pointer", opacity: 0.8 }} onClick={onClose}>✕</div>
      <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", color: "#94A3B8", fontSize: 13, background: "rgba(0,0,0,0.6)", padding: "6px 16px", borderRadius: 8 }}>{name}</div>
      <img src={src} alt={name} style={{ maxWidth: "90vw", maxHeight: "85vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

// ─── File Upload Component ───
function FileAttachment({ attachments = [], onChange, readOnly = false }) {
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setUploading(true);

    const newAttachments = [];
    for (const file of files) {
      // Limit file size to 4MB for storage
      if (file.size > 4 * 1024 * 1024) {
        alert(`ไฟล์ "${file.name}" มีขนาดเกิน 4MB`);
        continue;
      }
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      newAttachments.push({
        id: genAttId(),
        name: file.name,
        size: file.size,
        type: file.type,
        fileType: getFileType(file.name),
        data: base64,
        uploadedAt: new Date().toISOString(),
      });
    }
    if (newAttachments.length > 0) {
      onChange([...attachments, ...newAttachments]);
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeAttachment = (id) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  const font = "'Sarabun', 'Noto Sans Thai', sans-serif";

  return (
    <div>
      {/* Lightbox */}
      {lightbox && <ImageLightbox src={lightbox.data} name={lightbox.name} onClose={() => setLightbox(null)} />}

      {/* Drop Zone - only in edit mode */}
      {!readOnly && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? "#6366F1" : "rgba(255,255,255,0.1)"}`,
            borderRadius: 12,
            padding: "24px 16px",
            textAlign: "center",
            background: dragOver ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.02)",
            transition: "all 0.2s",
            cursor: "pointer",
            marginBottom: attachments.length > 0 ? 16 : 0,
          }}
          onClick={() => document.getElementById("file-upload-input")?.click()}
        >
          <input
            id="file-upload-input"
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.mp4,.mov"
            style={{ display: "none" }}
            onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }}
          />
          {uploading ? (
            <div style={{ color: "#A5B4FC", fontSize: 14 }}>กำลังอัพโหลด...</div>
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📎</div>
              <div style={{ color: "#94A3B8", fontSize: 14 }}>ลากไฟล์มาวางที่นี่ หรือ <span style={{ color: "#A5B4FC", textDecoration: "underline" }}>เลือกไฟล์</span></div>
              <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>รองรับ: รูปภาพ, PDF, Word, Excel, Video (สูงสุด 4MB/ไฟล์)</div>
            </>
          )}
        </div>
      )}

      {/* Attachment List / Gallery */}
      {attachments.length > 0 && (
        <div>
          {/* Image Gallery */}
          {attachments.filter((a) => a.fileType === "image").length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8, fontWeight: 600 }}>🖼️ รูปภาพ ({attachments.filter((a) => a.fileType === "image").length})</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                {attachments.filter((a) => a.fileType === "image").map((att) => (
                  <div key={att.id} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)", aspectRatio: "4/3" }}>
                    <img
                      src={att.data}
                      alt={att.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "zoom-in", display: "block" }}
                      onClick={() => setLightbox(att)}
                    />
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.8))", padding: "16px 8px 6px", fontSize: 11, color: "#CBD5E1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {att.name}
                    </div>
                    {!readOnly && (
                      <button onClick={(e) => { e.stopPropagation(); removeAttachment(att.id); }}
                        style={{ position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: "50%", border: "none", background: "rgba(220,38,38,0.8)", color: "#fff", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document List */}
          {attachments.filter((a) => a.fileType !== "image").length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 8, fontWeight: 600 }}>📁 เอกสาร ({attachments.filter((a) => a.fileType !== "image").length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {attachments.filter((a) => a.fileType !== "image").map((att) => {
                  const ft = FILE_ICONS[att.fileType] || FILE_ICONS.other;
                  return (
                    <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize: 20 }}>{ft.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, color: "#CBD5E1", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{att.name}</div>
                        <div style={{ fontSize: 11, color: "#475569" }}>{formatFileSize(att.size)} • {ft.label}</div>
                      </div>
                      <a href={att.data} download={att.name}
                        style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(99,102,241,0.1)", color: "#A5B4FC", fontSize: 11, textDecoration: "none", border: "1px solid rgba(99,102,241,0.2)", fontFamily: font }}>
                        ดาวน์โหลด
                      </a>
                      {!readOnly && (
                        <button onClick={() => removeAttachment(att.id)}
                          style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.08)", color: "#FCA5A5", fontSize: 11, cursor: "pointer", fontFamily: font }}>ลบ</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state for readOnly */}
      {readOnly && attachments.length === 0 && (
        <div style={{ color: "#475569", fontStyle: "italic", fontSize: 13 }}>ไม่มีไฟล์แนบ</div>
      )}
    </div>
  );
}

// ─── Card wrapper ───
function Card({ children, style = {} }) {
  return (
    <div style={{ background: "rgba(30,34,54,0.7)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 24, backdropFilter: "blur(8px)", ...style }}>
      {children}
    </div>
  );
}

// ─── Dashboard ───
function Dashboard({ records, setView, setFilterStatus }) {
  const open = records.filter((r) => r.status === "open").length;
  const investigating = records.filter((r) => r.status === "investigating").length;
  const resolved = records.filter((r) => r.status === "resolved").length;
  const ncrCount = records.filter((r) => r.ncrIssued).length;
  const critical = records.filter((r) => r.severity === "critical" && r.status !== "closed" && r.status !== "resolved").length;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthRecords = records.filter((r) => r.reportedAt.slice(0, 7) === thisMonth);

  const catCount = {};
  records.forEach((r) => { catCount[r.category] = (catCount[r.category] || 0) + 1; });
  const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = topCats.length ? topCats[0][1] : 1;

  const lineCount = {};
  records.forEach((r) => { lineCount[r.line] = (lineCount[r.line] || 0) + 1; });
  const topLines = Object.entries(lineCount).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxLine = topLines.length ? topLines[0][1] : 1;

  const statCards = [
    { label: "Open", value: open, color: "#DC2626", status: "open" },
    { label: "Investigating", value: investigating, color: "#D97706", status: "investigating" },
    { label: "Resolved", value: resolved, color: "#059669", status: "resolved" },
    { label: "NCR Issued", value: ncrCount, color: "#DB2777", status: "ncr_issued" },
  ];

  return (
    <div>
      {/* Critical Alert */}
      {critical > 0 && (
        <div style={{ background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>⚠</span>
          <span style={{ color: "#FCA5A5", fontWeight: 600 }}>Critical Issues: {critical} รายการที่ยังไม่ได้แก้ไข</span>
        </div>
      )}

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
        {statCards.map((s) => (
          <div key={s.label} onClick={() => { setFilterStatus(s.status); setView("list"); }}
            style={{ background: "rgba(30,34,54,0.7)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "20px", cursor: "pointer", transition: "all 0.2s", borderLeft: `3px solid ${s.color}` }}>
            <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "1px", marginBottom: 8, textTransform: "uppercase" }}>{s.label}</div>
            <div style={{ fontSize: 36, fontWeight: 700, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Top Categories */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "#CBD5E1" }}>ปัญหายอดนิยม (Top Categories)</div>
          {topCats.map(([cat, count]) => (
            <div key={cat} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "#94A3B8" }}>{cat}</span>
                <span style={{ color: "#A5B4FC", fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${(count / maxCat) * 100}%`, background: "linear-gradient(90deg, #6366F1, #06B6D4)", transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Top Lines */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "#CBD5E1" }}>สายการผลิตที่มีปัญหามากสุด</div>
          {topLines.map(([line, count]) => (
            <div key={line} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "#94A3B8" }}>{line}</span>
                <span style={{ color: "#A5B4FC", fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${(count / maxLine) * 100}%`, background: "linear-gradient(90deg, #F59E0B, #EF4444)", transition: "width 0.5s" }} />
              </div>
            </div>
          ))}
        </Card>

        {/* Recent Activity */}
        <Card style={{ gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: "#CBD5E1" }}>รายการล่าสุด</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {records.slice(0, 6).map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: SEVERITY_MAP[r.severity]?.color, fontSize: 16 }}>{SEVERITY_MAP[r.severity]?.icon}</span>
                <span style={{ fontSize: 12, color: "#64748B", fontFamily: "'JetBrains Mono', monospace", minWidth: 100 }}>{r.id}</span>
                <span style={{ fontSize: 13, color: "#CBD5E1", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.what}</span>
                <StatusBadge status={r.status} />
                <span style={{ fontSize: 11, color: "#475569", minWidth: 80 }}>{fmtDate(r.reportedAt)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* This month summary */}
      <Card style={{ marginTop: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: "#CBD5E1" }}>สรุปเดือนนี้</div>
        <div style={{ display: "flex", gap: 32, fontSize: 13, color: "#94A3B8" }}>
          <span>แจ้งปัญหาทั้งหมด: <strong style={{ color: "#A5B4FC" }}>{monthRecords.length}</strong> ครั้ง</span>
          <span>แก้ไขแล้ว: <strong style={{ color: "#34D399" }}>{monthRecords.filter(r => r.status === "resolved" || r.status === "closed").length}</strong></span>
          <span>ยังไม่แก้ไข: <strong style={{ color: "#FCA5A5" }}>{monthRecords.filter(r => r.status === "open" || r.status === "investigating").length}</strong></span>
        </div>
      </Card>
    </div>
  );
}

// ─── Status Badge ───
function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.open;
  return (
    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, background: s.bg + "22", color: s.text, border: `1px solid ${s.text}33`, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

// ─── List View ───
function ListView({ records, filterStatus, setFilterStatus, filterLine, setFilterLine, filterMonth, setFilterMonth, searchText, setSearchText, onSelect }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#F1F5F9" }}>รายการปัญหาทั้งหมด ({records.length})</div>
      </div>

      {/* Filters */}
      <Card style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <FilterSelect label="สถานะ" value={filterStatus} onChange={setFilterStatus} options={[{ v: "all", l: "ทั้งหมด" }, ...Object.entries(STATUS_COLORS).map(([k, v]) => ({ v: k, l: v.label }))]} />
          <FilterSelect label="สายการผลิต" value={filterLine} onChange={setFilterLine} options={[{ v: "all", l: "ทั้งหมด" }, ...LINES.map(l => ({ v: l, l }))]} />
          <div>
            <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>เดือน</div>
            <input type="month" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#CBD5E1", fontSize: 13, fontFamily: "'Sarabun', sans-serif" }} />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>ค้นหา</div>
            <input placeholder="Search ID, description, reporter..." value={searchText} onChange={(e) => setSearchText(e.target.value)}
              style={{ width: "100%", padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#CBD5E1", fontSize: 13, fontFamily: "'Sarabun', sans-serif", outline: "none" }} />
          </div>
          {(filterStatus !== "all" || filterLine !== "all" || filterMonth || searchText) && (
            <button onClick={() => { setFilterStatus("all"); setFilterLine("all"); setFilterMonth(""); setSearchText(""); }}
              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94A3B8", fontSize: 12, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", alignSelf: "flex-end" }}>
              ล้างตัวกรอง
            </button>
          )}
        </div>
      </Card>

      {/* Table */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["ID", "ระดับ", "หมวดหมู่", "ปัญหา", "สายผลิต", "กะ", "ผู้แจ้ง", "วันที่", "สถานะ", "📎", "NCR"].map((h) => (
                  <th key={h} style={{ padding: "12px 14px", textAlign: "left", color: "#64748B", fontSize: 11, fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id} onClick={() => onSelect(r.id)}
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(99,102,241,0.06)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "10px 14px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#A5B4FC" }}>{r.id}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ color: SEVERITY_MAP[r.severity]?.color }}>{SEVERITY_MAP[r.severity]?.icon} {SEVERITY_MAP[r.severity]?.label}</span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#94A3B8" }}>{r.category}</td>
                  <td style={{ padding: "10px 14px", color: "#CBD5E1", maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.what}</td>
                  <td style={{ padding: "10px 14px", color: "#94A3B8" }}>{r.line}</td>
                  <td style={{ padding: "10px 14px", color: "#94A3B8" }}>{r.shift}</td>
                  <td style={{ padding: "10px 14px", color: "#94A3B8" }}>{r.reportedBy}</td>
                  <td style={{ padding: "10px 14px", color: "#64748B", fontSize: 12 }}>{fmtDate(r.reportedAt)}</td>
                  <td style={{ padding: "10px 14px" }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: "10px 14px", color: "#64748B", fontSize: 12 }}>{(r.attachments || []).length > 0 && <span title={`${r.attachments.length} ไฟล์`}>📎{r.attachments.length}</span>}</td>
                  <td style={{ padding: "10px 14px" }}>{r.ncrIssued && <span style={{ color: "#DB2777", fontSize: 12, fontWeight: 600 }}>📋 {r.ncrNumber}</span>}</td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={11} style={{ padding: 40, textAlign: "center", color: "#475569" }}>ไม่พบรายการ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: "#64748B", marginBottom: 4 }}>{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#CBD5E1", fontSize: 13, fontFamily: "'Sarabun', sans-serif" }}>
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

// ─── Record Form (5W1H) ───
function RecordForm({ record, onSave, onCancel }) {
  const isEdit = !!record;
  const [form, setForm] = useState(record || {
    id: genId(), status: "open", severity: "minor", category: "Machine Breakdown",
    line: "Line 1", shift: "Day", reportedBy: "", reportedAt: new Date().toISOString().slice(0, 16),
    what: "", who: "", when: "", where: "", why: "", how: "",
    correctiveAction: "", preventiveAction: "", resolvedAt: "", resolvedBy: "",
    ncrIssued: false, ncrNumber: "", attachments: [], comments: [],
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.what || !form.reportedBy) {
      alert("กรุณากรอกข้อมูลที่จำเป็น: ปัญหา (What) และ ผู้แจ้ง");
      return;
    }
    onSave(form);
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 14, fontFamily: "'Sarabun', sans-serif",
    outline: "none", transition: "border-color 0.2s", boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 6, display: "block", letterSpacing: "0.3px" };
  const sectionTitle = (icon, text) => (
    <div style={{ fontSize: 15, fontWeight: 700, color: "#A5B4FC", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid rgba(99,102,241,0.2)", display: "flex", alignItems: "center", gap: 8 }}>
      <span>{icon}</span> {text}
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9", marginBottom: 24 }}>
        {isEdit ? `แก้ไขรายการ ${form.id}` : "แจ้งปัญหาใหม่"}
      </div>

      {/* Basic Info */}
      <Card style={{ marginBottom: 20 }}>
        {sectionTitle("📋", "ข้อมูลพื้นฐาน")}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>รหัส (ID)</label>
            <input value={form.id} disabled style={{ ...inputStyle, opacity: 0.5 }} />
          </div>
          <div>
            <label style={labelStyle}>ผู้แจ้ง *</label>
            <input value={form.reportedBy} onChange={(e) => set("reportedBy", e.target.value)} style={inputStyle} placeholder="ชื่อผู้แจ้ง" />
          </div>
          <div>
            <label style={labelStyle}>วันเวลาที่แจ้ง</label>
            <input type="datetime-local" value={form.reportedAt} onChange={(e) => set("reportedAt", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>สายการผลิต</label>
            <select value={form.line} onChange={(e) => set("line", e.target.value)} style={inputStyle}>
              {LINES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>กะ (Shift)</label>
            <select value={form.shift} onChange={(e) => set("shift", e.target.value)} style={inputStyle}>
              {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>หมวดหมู่ปัญหา</label>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} style={inputStyle}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>ระดับความรุนแรง</label>
            <select value={form.severity} onChange={(e) => set("severity", e.target.value)} style={inputStyle}>
              {Object.entries(SEVERITY_MAP).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>สถานะ</label>
            <select value={form.status} onChange={(e) => set("status", e.target.value)} style={inputStyle}>
              {Object.entries(STATUS_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* 5W1H */}
      <Card style={{ marginBottom: 20 }}>
        {sectionTitle("🔍", "5W1H Analysis")}
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", alignItems: "start", gap: 12 }}>
            <div style={{ background: "rgba(220,38,38,0.15)", color: "#FCA5A5", padding: "8px 0", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 700 }}>What</div>
            <div>
              <label style={labelStyle}>เกิดอะไรขึ้น? (ปัญหาคืออะไร) *</label>
              <textarea value={form.what} onChange={(e) => set("what", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="อธิบายปัญหาที่เกิดขึ้นโดยละเอียด..." />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", alignItems: "start", gap: 12 }}>
            <div style={{ background: "rgba(234,88,12,0.15)", color: "#FDBA74", padding: "8px 0", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 700 }}>Who</div>
            <div>
              <label style={labelStyle}>ใครเกี่ยวข้อง? (ผู้พบปัญหา/ผู้รับผิดชอบ)</label>
              <input value={form.who} onChange={(e) => set("who", e.target.value)} style={inputStyle} placeholder="ชื่อผู้พบปัญหา ตำแหน่ง" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", alignItems: "start", gap: 12 }}>
            <div style={{ background: "rgba(202,138,4,0.15)", color: "#FDE047", padding: "8px 0", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 700 }}>When</div>
            <div>
              <label style={labelStyle}>เกิดขึ้นเมื่อไหร่?</label>
              <input value={form.when} onChange={(e) => set("when", e.target.value)} style={inputStyle} placeholder="วันที่ เวลา สถานการณ์ที่เกิด" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", alignItems: "start", gap: 12 }}>
            <div style={{ background: "rgba(5,150,105,0.15)", color: "#6EE7B7", padding: "8px 0", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 700 }}>Where</div>
            <div>
              <label style={labelStyle}>เกิดที่ไหน? (ตำแหน่ง/สถานี)</label>
              <input value={form.where} onChange={(e) => set("where", e.target.value)} style={inputStyle} placeholder="สายผลิต สถานี เครื่องจักร" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", alignItems: "start", gap: 12 }}>
            <div style={{ background: "rgba(99,102,241,0.15)", color: "#A5B4FC", padding: "8px 0", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 700 }}>Why</div>
            <div>
              <label style={labelStyle}>ทำไมถึงเกิด? (สาเหตุ)</label>
              <textarea value={form.why} onChange={(e) => set("why", e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="วิเคราะห์สาเหตุของปัญหา" />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", alignItems: "start", gap: 12 }}>
            <div style={{ background: "rgba(6,182,212,0.15)", color: "#67E8F9", padding: "8px 0", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 700 }}>How</div>
            <div>
              <label style={labelStyle}>เกิดขึ้นอย่างไร? (กระบวนการ)</label>
              <textarea value={form.how} onChange={(e) => set("how", e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="อธิบายกระบวนการที่นำไปสู่ปัญหา" />
            </div>
          </div>
        </div>
      </Card>

      {/* Corrective & Preventive Actions */}
      <Card style={{ marginBottom: 20 }}>
        {sectionTitle("🛠", "การแก้ไขและป้องกัน")}
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label style={labelStyle}>Corrective Action (การแก้ไข)</label>
            <textarea value={form.correctiveAction} onChange={(e) => set("correctiveAction", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="ดำเนินการแก้ไขอย่างไร..." />
          </div>
          <div>
            <label style={labelStyle}>Preventive Action (การป้องกัน)</label>
            <textarea value={form.preventiveAction} onChange={(e) => set("preventiveAction", e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="มาตรการป้องกันไม่ให้เกิดซ้ำ..." />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>ผู้แก้ไข</label>
              <input value={form.resolvedBy} onChange={(e) => set("resolvedBy", e.target.value)} style={inputStyle} placeholder="ชื่อผู้แก้ไข" />
            </div>
            <div>
              <label style={labelStyle}>วันเวลาที่แก้ไข</label>
              <input type="datetime-local" value={form.resolvedAt} onChange={(e) => set("resolvedAt", e.target.value)} style={inputStyle} />
            </div>
          </div>
        </div>
      </Card>

      {/* NCR Section */}
      <Card style={{ marginBottom: 20 }}>
        {sectionTitle("📄", "Non-Conforming Report (NCR)")}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: "#CBD5E1" }}>
            <input type="checkbox" checked={form.ncrIssued} onChange={(e) => set("ncrIssued", e.target.checked)} />
            ออกเอกสาร NCR
          </label>
          {form.ncrIssued && (
            <div style={{ flex: 1 }}>
              <input value={form.ncrNumber} onChange={(e) => set("ncrNumber", e.target.value)} style={inputStyle} placeholder="เลขที่ NCR เช่น NCR-2603-001" />
            </div>
          )}
        </div>
      </Card>

      {/* Attachments */}
      <Card style={{ marginBottom: 20 }}>
        {sectionTitle("📎", "แนบไฟล์ (รูปภาพ / เอกสาร)")}
        <FileAttachment
          attachments={form.attachments || []}
          onChange={(atts) => set("attachments", atts)}
        />
      </Card>

      {/* Buttons */}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button onClick={onCancel} style={{ padding: "10px 24px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94A3B8", fontSize: 14, cursor: "pointer", fontFamily: "'Sarabun', sans-serif" }}>
          ยกเลิก
        </button>
        <button onClick={handleSave} style={{ padding: "10px 32px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #6366F1, #06B6D4)", color: "#FFF", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Sarabun', sans-serif" }}>
          {isEdit ? "บันทึกการแก้ไข" : "บันทึกปัญหา"}
        </button>
      </div>
    </div>
  );
}

// ─── Detail View ───
function DetailView({ record, onEdit, onDelete, onSave, onBack }) {
  const [newComment, setNewComment] = useState("");
  const [commentBy, setCommentBy] = useState("");

  const addComment = () => {
    if (!newComment || !commentBy) return;
    const updated = {
      ...record,
      comments: [...(record.comments || []), { by: commentBy, at: new Date().toISOString(), text: newComment }],
    };
    onSave(updated);
    setNewComment("");
  };

  const sev = SEVERITY_MAP[record.severity];
  const w1h = [
    { key: "What", color: "#FCA5A5", bg: "rgba(220,38,38,0.1)", value: record.what },
    { key: "Who", color: "#FDBA74", bg: "rgba(234,88,12,0.1)", value: record.who },
    { key: "When", color: "#FDE047", bg: "rgba(202,138,4,0.1)", value: record.when },
    { key: "Where", color: "#6EE7B7", bg: "rgba(5,150,105,0.1)", value: record.where },
    { key: "Why", color: "#A5B4FC", bg: "rgba(99,102,241,0.1)", value: record.why },
    { key: "How", color: "#67E8F9", bg: "rgba(6,182,212,0.1)", value: record.how },
  ];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={onBack} style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "transparent", color: "#94A3B8", fontSize: 13, cursor: "pointer", fontFamily: "'Sarabun', sans-serif" }}>← กลับ</button>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9" }}>{record.id}</div>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <StatusBadge status={record.status} />
              <span style={{ fontSize: 12, color: sev?.color, fontWeight: 600 }}>{sev?.icon} {sev?.label}</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onEdit} style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.1)", color: "#A5B4FC", fontSize: 13, cursor: "pointer", fontFamily: "'Sarabun', sans-serif" }}>แก้ไข</button>
          <button onClick={() => { if (confirm("ลบรายการนี้?")) onDelete(record.id); }}
            style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.4)", background: "rgba(220,38,38,0.1)", color: "#FCA5A5", fontSize: 13, cursor: "pointer", fontFamily: "'Sarabun', sans-serif" }}>ลบ</button>
        </div>
      </div>

      {/* Info Bar */}
      <Card style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
          <div><span style={{ color: "#64748B" }}>สายผลิต:</span> <span style={{ color: "#CBD5E1", fontWeight: 600 }}>{record.line}</span></div>
          <div><span style={{ color: "#64748B" }}>กะ:</span> <span style={{ color: "#CBD5E1" }}>{record.shift}</span></div>
          <div><span style={{ color: "#64748B" }}>หมวดหมู่:</span> <span style={{ color: "#CBD5E1" }}>{record.category}</span></div>
          <div><span style={{ color: "#64748B" }}>ผู้แจ้ง:</span> <span style={{ color: "#CBD5E1" }}>{record.reportedBy}</span></div>
          <div><span style={{ color: "#64748B" }}>วันที่แจ้ง:</span> <span style={{ color: "#CBD5E1" }}>{fmtDateTime(record.reportedAt)}</span></div>
          {record.ncrIssued && <div><span style={{ color: "#DB2777", fontWeight: 700 }}>📋 NCR: {record.ncrNumber}</span></div>}
        </div>
      </Card>

      {/* 5W1H */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#A5B4FC", marginBottom: 16 }}>🔍 5W1H Analysis</div>
        <div style={{ display: "grid", gap: 12 }}>
          {w1h.map((item) => (
            <div key={item.key} style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: 12 }}>
              <div style={{ background: item.bg, color: item.color, padding: "8px 0", borderRadius: 8, textAlign: "center", fontSize: 13, fontWeight: 700 }}>{item.key}</div>
              <div style={{ padding: "8px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, color: "#CBD5E1", fontSize: 14, lineHeight: 1.6, border: "1px solid rgba(255,255,255,0.04)" }}>
                {item.value || <span style={{ color: "#475569", fontStyle: "italic" }}>ยังไม่ระบุ</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      {(record.correctiveAction || record.preventiveAction) && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#A5B4FC", marginBottom: 16 }}>🛠 การแก้ไขและป้องกัน</div>
          {record.correctiveAction && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: 600 }}>Corrective Action</div>
              <div style={{ padding: "10px 14px", background: "rgba(5,150,105,0.06)", borderRadius: 8, color: "#A7F3D0", fontSize: 14, lineHeight: 1.6, borderLeft: "3px solid #059669" }}>{record.correctiveAction}</div>
            </div>
          )}
          {record.preventiveAction && (
            <div>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 4, fontWeight: 600 }}>Preventive Action</div>
              <div style={{ padding: "10px 14px", background: "rgba(99,102,241,0.06)", borderRadius: 8, color: "#C7D2FE", fontSize: 14, lineHeight: 1.6, borderLeft: "3px solid #6366F1" }}>{record.preventiveAction}</div>
            </div>
          )}
          {record.resolvedBy && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#64748B" }}>
              แก้ไขโดย: <strong style={{ color: "#94A3B8" }}>{record.resolvedBy}</strong> — {fmtDateTime(record.resolvedAt)}
            </div>
          )}
        </Card>
      )}

      {/* Attachments */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#A5B4FC", marginBottom: 16 }}>📎 ไฟล์แนบ ({(record.attachments || []).length})</div>
        <FileAttachment
          attachments={record.attachments || []}
          onChange={(atts) => onSave({ ...record, attachments: atts })}
          readOnly={false}
        />
      </Card>

      {/* Comments / Timeline */}
      <Card>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#A5B4FC", marginBottom: 16 }}>💬 ความคิดเห็น / Timeline</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {(record.comments || []).map((c, i) => (
            <div key={i} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 10, borderLeft: "3px solid #4F46E5" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#A5B4FC" }}>{c.by}</span>
                <span style={{ fontSize: 11, color: "#475569" }}>{fmtDateTime(c.at)}</span>
              </div>
              <div style={{ fontSize: 14, color: "#CBD5E1", lineHeight: 1.5 }}>{c.text}</div>
            </div>
          ))}
          {(!record.comments || record.comments.length === 0) && (
            <div style={{ color: "#475569", fontStyle: "italic", fontSize: 13 }}>ยังไม่มีความคิดเห็น</div>
          )}
        </div>

        {/* Add Comment */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            <input placeholder="ชื่อผู้แสดงความคิดเห็น" value={commentBy} onChange={(e) => setCommentBy(e.target.value)}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 13, fontFamily: "'Sarabun', sans-serif", outline: "none" }} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <textarea placeholder="เพิ่มความคิดเห็น..." value={newComment} onChange={(e) => setNewComment(e.target.value)} rows={2}
              style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)", color: "#E2E8F0", fontSize: 13, fontFamily: "'Sarabun', sans-serif", outline: "none", resize: "vertical" }} />
            <button onClick={addComment} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #6366F1, #06B6D4)", color: "#FFF", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Sarabun', sans-serif", alignSelf: "flex-end" }}>ส่ง</button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Monthly Summary ───
function MonthlySummary({ records }) {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const monthRecords = records.filter((r) => r.reportedAt.slice(0, 7) === month);

  const total = monthRecords.length;
  const byStatus = {};
  Object.keys(STATUS_COLORS).forEach((s) => { byStatus[s] = monthRecords.filter((r) => r.status === s).length; });

  const bySeverity = {};
  Object.keys(SEVERITY_MAP).forEach((s) => { bySeverity[s] = monthRecords.filter((r) => r.severity === s).length; });

  const byCategory = {};
  monthRecords.forEach((r) => { byCategory[r.category] = (byCategory[r.category] || 0) + 1; });

  const byLine = {};
  monthRecords.forEach((r) => { byLine[r.line] = (byLine[r.line] || 0) + 1; });

  const ncrList = monthRecords.filter((r) => r.ncrIssued);
  const resolvedCount = monthRecords.filter((r) => r.status === "resolved" || r.status === "closed").length;
  const resolutionRate = total > 0 ? ((resolvedCount / total) * 100).toFixed(1) : 0;

  const inputStyle = { padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#CBD5E1", fontSize: 14, fontFamily: "'Sarabun', sans-serif" };

  const maxCat = Math.max(...Object.values(byCategory), 1);
  const maxLine = Math.max(...Object.values(byLine), 1);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: "#F1F5F9" }}>สรุปรายเดือน</div>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} style={inputStyle} />
      </div>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "1px", marginBottom: 8 }}>ปัญหาทั้งหมด</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#A5B4FC", fontFamily: "'JetBrains Mono', monospace" }}>{total}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>ครั้ง</div>
        </Card>
        <Card style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "1px", marginBottom: 8 }}>แก้ไขแล้ว</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#34D399", fontFamily: "'JetBrains Mono', monospace" }}>{resolvedCount}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>ครั้ง</div>
        </Card>
        <Card style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "1px", marginBottom: 8 }}>อัตราการแก้ไข</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#FBBF24", fontFamily: "'JetBrains Mono', monospace" }}>{resolutionRate}%</div>
        </Card>
        <Card style={{ textAlign: "center", padding: 20 }}>
          <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "1px", marginBottom: 8 }}>NCR ที่ออก</div>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#F472B6", fontFamily: "'JetBrains Mono', monospace" }}>{ncrList.length}</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>ฉบับ</div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* By Status */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#CBD5E1", marginBottom: 16 }}>จำแนกตามสถานะ</div>
          {Object.entries(byStatus).filter(([, v]) => v > 0).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <StatusBadge status={k} />
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: "100%", borderRadius: 4, width: `${(v / Math.max(total, 1)) * 100}%`, background: STATUS_COLORS[k].text, transition: "width 0.5s" }} />
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#94A3B8", minWidth: 30, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </Card>

        {/* By Severity */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#CBD5E1", marginBottom: 16 }}>จำแนกตามความรุนแรง</div>
          {Object.entries(bySeverity).filter(([, v]) => v > 0).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ color: SEVERITY_MAP[k].color, fontSize: 13, fontWeight: 600, minWidth: 90 }}>{SEVERITY_MAP[k].icon} {SEVERITY_MAP[k].label}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: "100%", borderRadius: 4, width: `${(v / Math.max(total, 1)) * 100}%`, background: SEVERITY_MAP[k].color, transition: "width 0.5s" }} />
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#94A3B8", minWidth: 30, textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </Card>

        {/* By Category */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#CBD5E1", marginBottom: 16 }}>จำแนกตามหมวดหมู่</div>
          {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "#94A3B8" }}>{k}</span>
                <span style={{ color: "#A5B4FC", fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${(v / maxCat) * 100}%`, background: "linear-gradient(90deg, #6366F1, #06B6D4)" }} />
              </div>
            </div>
          ))}
          {Object.keys(byCategory).length === 0 && <div style={{ color: "#475569", fontStyle: "italic", fontSize: 13 }}>ไม่มีข้อมูล</div>}
        </Card>

        {/* By Line */}
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#CBD5E1", marginBottom: 16 }}>จำแนกตามสายการผลิต</div>
          {Object.entries(byLine).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: "#94A3B8" }}>{k}</span>
                <span style={{ color: "#A5B4FC", fontFamily: "'JetBrains Mono', monospace" }}>{v}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)" }}>
                <div style={{ height: "100%", borderRadius: 3, width: `${(v / maxLine) * 100}%`, background: "linear-gradient(90deg, #F59E0B, #EF4444)" }} />
              </div>
            </div>
          ))}
          {Object.keys(byLine).length === 0 && <div style={{ color: "#475569", fontStyle: "italic", fontSize: 13 }}>ไม่มีข้อมูล</div>}
        </Card>
      </div>

      {/* NCR List */}
      {ncrList.length > 0 && (
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#CBD5E1", marginBottom: 16 }}>📋 รายการ NCR ในเดือนนี้</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {ncrList.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, background: "rgba(219,39,119,0.06)", border: "1px solid rgba(219,39,119,0.15)" }}>
                <span style={{ color: "#F472B6", fontWeight: 700, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{r.ncrNumber}</span>
                <span style={{ color: "#94A3B8", fontSize: 12 }}>—</span>
                <span style={{ color: "#CBD5E1", fontSize: 13, flex: 1 }}>{r.what}</span>
                <span style={{ color: SEVERITY_MAP[r.severity]?.color, fontSize: 12 }}>{SEVERITY_MAP[r.severity]?.label}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Detail Table */}
      <Card style={{ marginTop: 20, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#CBD5E1" }}>รายละเอียดปัญหาทั้งหมดในเดือน</div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["ID", "ปัญหา", "สายผลิต", "ระดับ", "การแก้ไข", "สถานะ"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#64748B", fontSize: 11, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthRecords.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                  <td style={{ padding: "8px 14px", fontFamily: "'JetBrains Mono', monospace", color: "#A5B4FC" }}>{r.id}</td>
                  <td style={{ padding: "8px 14px", color: "#CBD5E1", maxWidth: 300 }}>{r.what}</td>
                  <td style={{ padding: "8px 14px", color: "#94A3B8" }}>{r.line}</td>
                  <td style={{ padding: "8px 14px", color: SEVERITY_MAP[r.severity]?.color }}>{SEVERITY_MAP[r.severity]?.label}</td>
                  <td style={{ padding: "8px 14px", color: "#94A3B8", maxWidth: 250 }}>{r.correctiveAction || "-"}</td>
                  <td style={{ padding: "8px 14px" }}><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {monthRecords.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 30, textAlign: "center", color: "#475569" }}>ไม่มีข้อมูลในเดือนที่เลือก</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}