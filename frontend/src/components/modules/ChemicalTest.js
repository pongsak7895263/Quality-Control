import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Beaker, ClipboardCheck, History, BarChart3, Search, Printer, FileDown, Save,
  AlertCircle, CheckCircle2, XCircle, FlaskConical, Factory, WifiOff, RefreshCw,
  User, FileText, Upload, Edit, Trash2, ChevronLeft, ChevronRight, X,
  TrendingUp, PieChart, Activity, Calendar, Award, Layers, Filter, RotateCcw,
} from "lucide-react";

// --- Auth Hook Integration ---
import useAuth from "../../hooks/useAuth";
import { API_BASE_URL } from '../../config';

const API_BASE = `${API_BASE_URL}/api/chemical`;

// ============================================================
// Constants
// ============================================================
const DEBOUNCE_DELAY = 400; // milliseconds
const DEFAULT_PAGE_SIZE = 10;

// ============================================================
// Mini Chart Components (Pure SVG)
// ============================================================

const DonutChart = ({ data, size = 180, strokeWidth = 28 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>No Data</div>;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {data.map((d, i) => {
        const pct = d.value / total;
        const dashArray = `${pct * circumference} ${circumference}`;
        const rotation = (offset / total) * 360 - 90;
        offset += d.value;
        return (
          <circle
            key={i}
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={d.color} strokeWidth={strokeWidth}
            strokeDasharray={dashArray}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        );
      })}
      <text x="50%" y="46%" textAnchor="middle" fontSize="1.8rem" fontWeight="700" fill="#1e293b">{total}</text>
      <text x="50%" y="60%" textAnchor="middle" fontSize="0.7rem" fill="#94a3b8" fontWeight="500">TOTAL</text>
    </svg>
  );
};

const BarChartSVG = ({ data, width = 400, height = 200 }) => {
  if (!data || data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Data</div>;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(36, (width - 60) / data.length - 8);
  const chartH = height - 40;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
        <g key={i}>
          <line x1="40" y1={chartH - pct * chartH + 10} x2={width - 10} y2={chartH - pct * chartH + 10} stroke="#f1f5f9" strokeWidth="1" />
          <text x="35" y={chartH - pct * chartH + 14} textAnchor="end" fontSize="10" fill="#94a3b8">{Math.round(maxVal * pct)}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = 50 + i * ((width - 60) / data.length);
        return (
          <g key={i}>
            <defs>
              <linearGradient id={`bar-grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={d.color || '#3b82f6'} stopOpacity="1" />
                <stop offset="100%" stopColor={d.color || '#3b82f6'} stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <rect
              x={x} y={chartH - barH + 10}
              width={barWidth} height={barH}
              rx="4" fill={`url(#bar-grad-${i})`}
              style={{ transition: 'height 0.5s ease, y 0.5s ease' }}
            />
            <text x={x + barWidth / 2} y={chartH - barH + 4} textAnchor="middle" fontSize="10" fontWeight="600" fill={d.color || '#3b82f6'}>{d.value}</text>
            <text x={x + barWidth / 2} y={height - 4} textAnchor="middle" fontSize="9" fill="#64748b">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

const TrendLineSVG = ({ data, width = 400, height = 160, color = "#3b82f6" }) => {
  if (!data || data.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>Not enough data</div>;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const minVal = 0;
  const padX = 45, padY = 20;
  const chartW = width - padX - 10;
  const chartH = height - padY * 2;

  const points = data.map((d, i) => {
    const x = padX + (i / (data.length - 1)) * chartW;
    const y = padY + chartH - ((d.value - minVal) / (maxVal - minVal || 1)) * chartH;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1].x} ${padY + chartH} L ${points[0].x} ${padY + chartH} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.5, 1].map((pct, i) => (
        <g key={i}>
          <line x1={padX} y1={padY + chartH - pct * chartH} x2={width - 10} y2={padY + chartH - pct * chartH} stroke="#f1f5f9" strokeWidth="1" />
          <text x={padX - 5} y={padY + chartH - pct * chartH + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{Math.round(maxVal * pct)}</text>
        </g>
      ))}
      <path d={areaD} fill="url(#area-fill)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" fill="white" stroke={color} strokeWidth="2" />
          <text x={p.x} y={height - 4} textAnchor="middle" fontSize="8" fill="#64748b">{p.label}</text>
        </g>
      ))}
    </svg>
  );
};

const HorizontalBarChart = ({ data, height: totalHeight = 200 }) => {
  if (!data || data.length === 0) return <div style={{ height: totalHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No Data</div>;
  const maxVal = Math.max(...data.map(d => d.value), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', width: '90px', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.label}>{d.label}</span>
          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '6px', height: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{
              width: `${(d.value / maxVal) * 100}%`,
              height: '100%',
              background: `linear-gradient(90deg, ${d.color || '#3b82f6'}, ${d.color || '#3b82f6'}aa)`,
              borderRadius: '6px',
              transition: 'width 0.6s ease',
              minWidth: d.value > 0 ? '24px' : '0',
            }} />
            <span style={{ position: 'absolute', right: '8px', top: '3px', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>{d.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

const GaugeChart = ({ value, size = 140 }) => {
  const pct = Math.min(100, Math.max(0, value));
  const radius = (size - 20) / 2;
  const circumference = Math.PI * radius;
  const filled = (pct / 100) * circumference;
  const gaugeColor = pct >= 90 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
      <path
        d={`M 10 ${size / 2 + 5} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 5}`}
        fill="none" stroke="#f1f5f9" strokeWidth="12" strokeLinecap="round"
      />
      <path
        d={`M 10 ${size / 2 + 5} A ${radius} ${radius} 0 0 1 ${size - 10} ${size / 2 + 5}`}
        fill="none" stroke={gaugeColor} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x="50%" y={size / 2 - 2} textAnchor="middle" fontSize="1.5rem" fontWeight="700" fill="#1e293b">{pct.toFixed(1)}%</text>
      <text x="50%" y={size / 2 + 18} textAnchor="middle" fontSize="0.65rem" fill="#94a3b8" fontWeight="500">PASS RATE</text>
    </svg>
  );
};


// ============================================================
// Main Component
// ============================================================
const ChemicalTest = () => {
  const { user } = useAuth();

  const MANUFACTURERS = [
    "SHIJIAZHUANG IRON & STEEL CO., LTD",
    "CHAINA STEEL CORRORATION",
    "NIPPON STEEL CORPORATION",
    "JFE STEEL CORPORATION",
    "SEAH BESTEEL",
    "DAIDO STEEL CO.,LTD",
    "FENG HSIN STEEL CO.,LTD",
    "JIANGSU LIHUAI STEEL IRON and STEEL CO.,LTD",
    "Nakayama Steel Works LTD",
    "HUAIGANG",
    "Growellth",
    "OTHER",
  ];

  const steelSpecifications = useMemo(
    () => ({
      S10C: { name: "เหล็กกล้าคาร์บอนแมงกานีส S10C", standard: "JIS G4051", elements: { C: { min: 0.08, max: 0.13 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.3, max: 0.6 }, P: { min: 0, max: 0.03 }, S: { min: 0, max: 0.035 }, Cu: { min: 0, max: 0.3 }, Ni: { min: 0, max: 0.25 }, Cr: { min: 0.0, max: 0.2 } } },
      S15C: { name: "เหล็กกล้าคาร์บอนแมงกานีส S15C", standard: "JIS G4051", elements: { C: { min: 0.13, max: 0.18 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.3, max: 0.6 }, P: { min: 0, max: 0.03 }, S: { min: 0, max: 0.035 }, Cu: { min: 0, max: 0.3 }, Ni: { min: 0, max: 0.25 }, Cr: { min: 0.0, max: 0.2 } } },
      S20C: { name: "เหล็กกล้าคาร์บอนแมงกานีส S20C", standard: "JIS G4051", elements: { C: { min: 0.18, max: 0.23 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.3, max: 0.6 }, P: { min: 0, max: 0.03 }, S: { min: 0, max: 0.035 }, Cu: { min: 0, max: 0.3 }, Ni: { min: 0, max: 0.25 }, Cr: { min: 0.0, max: 0.2 } } },
      S35C: { name: "เหล็กกล้าคาร์บอนแมงกานีส S35C", standard: "JIS G4051", elements: { C: { min: 0.32, max: 0.38 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.6, max: 0.9 }, P: { min: 0, max: 0.03 }, S: { min: 0, max: 0.035 }, Cu: { min: 0, max: 0.3 }, Ni: { min: 0, max: 0.25 }, Cr: { min: 0.0, max: 0.2 }, Mo: { min: 0.0, max: 0.1 } } },
      S43C: { name: "เหล็กกล้าคาร์บอนแมงกานีส S43C", standard: "JIS G4051", elements: { C: { min: 0.4, max: 0.46 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.6, max: 0.9 }, P: { min: 0, max: 0.03 },S: { min: 0, max: 0.035 }, Cu: { min: 0, max: 0.3 }, Ni: { min: 0, max: 0.25 }, Cr: { min: 0.0, max: 0.2 }, }, },
      S45C: { name: "เหล็กกล้าคาร์บอน S45C", standard: "JIS G4051", elements: { C: { min: 0.42, max: 0.48 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.6, max: 0.9 }, P: { min: 0, max: 0.03 }, S: { min: 0, max: 0.03 }, Cu: { min: 0, max: 0.3 }, Ni: { min: 0, max: 0.2 }, Cr: { min: 0, max: 0.2 }, SP1: { min: 0, max: 0.2 } } },
      S48C: { name: 'เหล็กกล้าคาร์บอน S48C', standard: 'JIS G4051', elements: { C: { min: 0.45, max: 0.51 }, 'Si': { min: 0.15, max: 0.35 }, 'Mn': { min: 0.60, max: 0.90 }, 'P': { min: 0, max: 0.030 }, 'S': { min: 0, max: 0.035 }, 'Cr': { min: 0, max: 0.20 }, 'Ni': { min: 0, max: 0.20 }, 'Cu': { min: 0, max: 0.30 } } },
      S50C: { name: "เหล็กกล้าคาร์บอน S50C", standard: "JIS G4051", elements: { C: { min: 0.47, max: 0.53 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.6, max: 0.9 }, P: { min: 0, max: 0.03 }, S: { min: 0, max: 0.035 }, Cu: { min: 0, max: 0.3 }, Ni: { min: 0, max: 0.2 }, Cr: { min: 0, max: 0.2 } } },
      SS400: { name:" เหล็กกล้าคาร์บอนแมงกานีส SS400", standard: "JIS G3101", elements: { C: { min: 0.05, max: 0.25 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.3, max: 0.6 }, P: { min: 0, max: 0.050 }, S: { min: 0, max: 0.050 }, Cu: { min: 0, max: 0.20 }, Ni: { min: 0, max: 0.20 }, Cr: { min: 0., max: 1.0 }, } },
      SCM415:{ name: "เหล็กกล้าคาร์บอนแมงกานีส SCM415", standard: "JIS G4053", elements: { C: { min: 0.13, max: 0.18 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.60, max: 0.85 }, P: { min: 0, max: 0.030 }, S: { min: 0, max: 0.030 }, Cu: { min: 0, max: 0.30 }, Ni: { min: 0, max: 0.25 }, Cr: { min: 0.90, max: 1.20 } } },
      SCM420H: { name: "เหล็กกล้าคาร์บอนแมงกานีส SCM420H", standard: "JIS G4053", elements: { C: { min: 0.17, max: 0.23 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.55, max: 0.95 }, P: { min: 0, max: 0.03 }, S: { min: 0, max: 0.03 }, Cu: { min: 0, max: 0.30 }, Ni: { min: 0, max: 0.25 }, Cr: { min: 0.90, max: 1.20 }, Mo: { min: 0.15, max: 0.3 } } },
      SCM420HV: { name: "เหล็กกล้าคาร์บอนแมงกานีส SCM420HV", standard: "JIS G4053", elements: { C: { min: 0.17, max: 0.23 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.55, max: 0.95 }, P: { min: 0, max: 0.03 }, S: { min: 0.01, max: 0.03 }, Cu: { min: 0, max: 0.30 }, Ni: { min: 0, max: 0.025 }, Cr: { min: 0.85, max: 1.25 }, Mo: { min: 0.1, max: 0.25 } } },
      SCM415H:{ name: "เหล็กกล้าคาร์บอนแมงกานีส SCM415H", standard: "JIS G4053", elements: { C: { min: 0.12, max: 0.18 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.55, max: 0.90 }, P: { min: 0, max: 0.03 }, S: { min: 0, max: 0.03 }, Cu: { min: 0, max: 0.30 }, Ni: { min: 0, max: 0.25 }, Cr: { min: 0.85, max: 1.25 }, Mo: { min: 0.15, max: 0.35 } } },
      SCM415HV: { name: "เหล็กกล้าคาร์บอนแมงกานีส SCM415HV", standard: "JIS G4053", elements: { C: { min: 0.12, max: 0.18 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.55, max: 0.90 }, P: { min: 0, max: 0.03 }, S: { min: 0, max: 0.03 }, Cu: { min: 0, max: 0.30 }, Ni: { min: 0, max: 0.25 }, Cr: { min: 0.85, max: 1.25 }, Mo: { min: 0.10, max: 0.25 } }},
      SCM435: { name: "เหล็กกล้าคาร์บอนแมงกานีส SCM435", standard: "JIS G4053", elements: { C: { min: 0.33, max: 0.38 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.6, max: 0.85 }, P: { min: 0, max: 0.03 }, S: { min: 0, max: 0.03 }, Cu: { min: 0, max: 0.30 }, Ni: { min: 0, max: 0.25 }, Cr: { min: 0.9, max: 1.2 }, Mo: { min: 0.15, max: 0.35 } } },
      SCM440: { name: "เหล็กกล้าคาร์บอนแมงกานีส SCM440", standard: "JIS G4053", elements: { C: { min: 0.38, max: 0.43 }, Si: { min: 0.15, max: 0.35 }, Mn: { min: 0.6, max: 0.85 }, P: { min: 0, max: 0.03 }, S: { min: 0, max: 0.03 }, Cu: { min: 0, max: 0.30 }, Ni: { min: 0, max: 0.25 }, Cr: { min: 0.9, max: 1.2 }, Mo: { min: 0.15, max: 0.35 } } },
      SCR420H: {name:"เหล็กกล้าคาร์บอนแมงกานีส SCR420H", standard:"JIS G4052", elements:{ C:{ min:0.17, max:0.23 }, Si:{ min:0.15, max:0.35 }, Mn:{ min:0.55, max:0.90 }, P:{ min:0, max:0.03 }, S:{ min:0, max:0.03 }, Cu:{ min:0, max:0.30 }, Ni:{ min:0, max:0.25 }, Cr:{ min:0.85, max:1.25 }, Mo:{ min:0.10, max:0.25 } } },
      SAES460: { name: "SteelShot SAE-S-460", standard: "SAE J403", elements: { C: { min: 0.85, max: 0.95 }, Si: { min: 0.60, max: 0.90 }, Mn: { min: 0.60, max: 0.90 }, P: { min: 0.01, max: 0.03 }, S: { min: 0.01, max: 0.05 }, Cu: { min: 0, max: 0.3 }, Ni: { min: 0, max: 0.2 }, Cr: { min: 0, max: 0.2 } } },
    }),
    []
  );

  const ALL_ELEMENTS = ["C", "Si", "Mn", "P", "S", "Cu", "Ni", "Cr", "Mo", "SP1"];

  const initialFormState = {
    id: null,
    inspectionDate: new Date().toISOString().split("T")[0],
    inspector: "",
    certNo: "",
    heatNo: "",
    materialGrade: "",
    approvedBy: "",
    manufacturer: "",
    supplier: "",
    standard: "",
    customStandard: "",
    testValues: {},
    remarks: "",
    pdfFile: null,
    pdfName: "",
  };

  // --- State ---
  const [activeTab, setActiveTab] = useState("inspection");
  const [formData, setFormData] = useState(initialFormState);
  const [testResults, setTestResults] = useState([]);
  const [allResults, setAllResults] = useState([]);
  const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0 });
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const fileInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);

  // ✅ แยก searchInput (สำหรับแสดงใน UI) และ searchTerm (สำหรับ query)
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [filters, setFilters] = useState({
    grade: "all",
    result: "all",
  });

  const [pagination, setPagination] = useState({
    page: 1,
    limit: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0
  });

  // --- Helper: Get Auth Headers ---
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("authToken");
    return token ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } : { "Content-Type": "application/json" };
  }, []);

  // --- API Functions ---
  const fetchInspections = useCallback(async (page = 1) => {
    setIsLoading(true);
    setConnectionError(false);

    // ✅ Validate page number
    const validPage = typeof page === 'number' && page >= 1 ? page : 1;
    const limit = pagination.limit || DEFAULT_PAGE_SIZE;

    try {
      // ✅ Build query params
      const queryParams = new URLSearchParams({
        page: validPage.toString(),
        limit: limit.toString(),
      });

      // เพิ่ม search term ถ้ามี
      if (searchTerm.trim()) {
        queryParams.append("search", searchTerm.trim());
      }

      // เพิ่ม filters
      if (filters.grade && filters.grade !== 'all') {
        queryParams.append("grade", filters.grade);
      }
      if (filters.result && filters.result !== 'all') {
        queryParams.append("result", filters.result);
      }

      console.log("🔍 Fetching:", `${API_BASE}?${queryParams.toString()}`);

      const response = await fetch(`${API_BASE}?${queryParams.toString()}`, {
        method: "GET",
        headers: getAuthHeaders()
      });

      if (response.status === 401) {
        alert("Session หมดอายุ กรุณา Login ใหม่");
        return;
      }

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      
      // ✅ Parse response data
      let fetchedData = [];
      let serverPagination = null;

      if (result.success !== false) {
        if (Array.isArray(result)) {
          fetchedData = result;
        } else if (result.data) {
          fetchedData = Array.isArray(result.data) ? result.data : (result.data.tests || []);
          serverPagination = result.data?.pagination || result.pagination || null;
        } else if (result.rows) {
          fetchedData = result.rows;
          serverPagination = result.pagination || null;
        }

        setTestResults(Array.isArray(fetchedData) ? fetchedData : []);

        // ✅ Update pagination
        const totalFromServer = serverPagination?.total || result.total || result.count || fetchedData.length;
        setPagination(prev => ({
          ...prev,
          page: serverPagination?.page || validPage,
          limit: serverPagination?.limit || limit,
          total: totalFromServer,
          totalPages: serverPagination?.totalPages || Math.ceil(totalFromServer / limit) || 1,
        }));
      }

      // Fetch Stats
      try {
        const statsResponse = await fetch(`${API_BASE}/stats`, { headers: getAuthHeaders() });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }
      } catch (statsErr) {
        console.warn("Stats fetch failed:", statsErr);
      }

    } catch (error) {
      console.error("❌ Fetch Error:", error);
      setConnectionError(true);
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [getAuthHeaders, pagination.limit, searchTerm, filters]);

  // Fetch ALL results for reports
  const fetchAllForReports = useCallback(async () => {
    try {
      const queryParams = new URLSearchParams({ page: "1", limit: "1000" });
      const response = await fetch(`${API_BASE}?${queryParams.toString()}`, {
        method: "GET",
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const result = await response.json();
        let data = [];
        if (Array.isArray(result)) data = result;
        else if (result.data) data = Array.isArray(result.data) ? result.data : (result.data.tests || []);
        else if (result.rows) data = result.rows;
        setAllResults(data);
      }
    } catch (e) {
      console.error("Fetch all for reports error:", e);
    }
  }, [getAuthHeaders]);

  // ============================================================
  // ✅ useEffect - Load Data (แก้ไขใหม่)
  // ============================================================

  // Initial load เมื่อเปลี่ยน tab
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    if (activeTab === "history") {
      // ✅ เรียก fetch เฉพาะครั้งแรกหรือเมื่อเปลี่ยน tab
      if (isInitialMount.current) {
        isInitialMount.current = false;
        fetchInspections(1);
      }
    } else if (activeTab === "reports") {
      fetchAllForReports();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Fetch เมื่อ filters หรือ searchTerm เปลี่ยน (แต่ไม่ใช่ครั้งแรก)
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || isInitialMount.current) return;

    if (activeTab === "history") {
      fetchInspections(1); // Reset to page 1 when filters change
    }
  }, [searchTerm, filters.grade, filters.result]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ Fetch เมื่อเปลี่ยน limit (จำนวนต่อหน้า)
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || isInitialMount.current) return;

    if (activeTab === "history") {
      fetchInspections(1);
    }
  }, [pagination.limit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup debounce timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Auto-fill Inspector Name
  useEffect(() => {
    if (user && !formData.inspector && !formData.id) {
      let inspectorName = "";
      if (user.firstname && user.lastname)
        inspectorName = `${user.firstname} ${user.lastname}`;
      else if (user.name) inspectorName = user.name;
      else if (user.username) inspectorName = user.username;

      if (inspectorName)
        setFormData((prev) => ({ ...prev, inspector: inspectorName }));
    }
  }, [user, formData.id, formData.inspector]);

  // --- Logic Helpers ---
  const isWithinSpec = useCallback((element, value) => {
    if (!selectedSpec || value === "" || value === undefined) return null;
    const spec = selectedSpec.elements[element];
    if (!spec) return null;
    const numValue = parseFloat(value);
    return numValue >= spec.min && numValue <= spec.max;
  }, [selectedSpec]);

  const calculateStatus = useCallback((currentValues, spec) => {
    if (!spec || Object.keys(currentValues).length === 0) return "PENDING";
    const requiredElements = Object.keys(spec.elements);
    const testedElements = Object.keys(currentValues);

    const hasFailure = testedElements.some((el) => {
      const val = currentValues[el];
      if (val === "" || val === undefined) return false;
      const specEl = spec.elements[el];
      if (!specEl) return false;
      const numValue = parseFloat(val);
      return numValue < specEl.min || numValue > specEl.max;
    });
    if (hasFailure) return "FAIL";

    const isComplete = requiredElements.every(
      (el) => testedElements.includes(el) && currentValues[el] !== ""
    );
    return isComplete ? "PASS" : "PENDING";
  }, []);

  const currentStatus = useMemo(
    () => calculateStatus(formData.testValues, selectedSpec),
    [formData.testValues, selectedSpec, calculateStatus]
  );

  // ============================================================
  // Report Analytics
  // ============================================================
  const reportData = useMemo(() => {
    const data = allResults.length > 0 ? allResults : testResults;
    const gradeCount = {};
    const gradeColors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
    data.forEach(r => {
      gradeCount[r.materialGrade] = (gradeCount[r.materialGrade] || 0) + 1;
    });
    const gradeDistribution = Object.entries(gradeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, color: gradeColors[i % gradeColors.length] }));

    const monthlyMap = {};
    data.forEach(r => {
      const d = new Date(r.inspectionDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyMap[key]) monthlyMap[key] = { total: 0, pass: 0, fail: 0 };
      monthlyMap[key].total++;
      if (r.testResult === 'PASS') monthlyMap[key].pass++;
      if (r.testResult === 'FAIL') monthlyMap[key].fail++;
    });
    const monthKeys = Object.keys(monthlyMap).sort();
    const monthlyTrend = monthKeys.map(k => {
      const parts = k.split('-');
      const shortLabel = `${parts[1]}/${parts[0].slice(2)}`;
      return { label: shortLabel, value: monthlyMap[k].total, pass: monthlyMap[k].pass, fail: monthlyMap[k].fail };
    });

    const mfgCount = {};
    data.forEach(r => {
      const mfg = r.manufacturer || 'Unknown';
      mfgCount[mfg] = (mfgCount[mfg] || 0) + 1;
    });
    const mfgDistribution = Object.entries(mfgCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value], i) => {
        const shortLabel = label.length > 20 ? label.substring(0, 18) + '...' : label;
        return { label: shortLabel, fullLabel: label, value, color: gradeColors[i % gradeColors.length] };
      });

    let passCount = 0, failCount = 0, pendingCount = 0;
    data.forEach(r => {
      if (r.testResult === 'PASS') passCount++;
      else if (r.testResult === 'FAIL') failCount++;
      else pendingCount++;
    });

    const gradePassRate = {};
    data.forEach(r => {
      if (!gradePassRate[r.materialGrade]) gradePassRate[r.materialGrade] = { pass: 0, total: 0 };
      gradePassRate[r.materialGrade].total++;
      if (r.testResult === 'PASS') gradePassRate[r.materialGrade].pass++;
    });
    const passRateByGrade = Object.entries(gradePassRate)
      .filter(([, v]) => v.total >= 1)
      .sort((a, b) => (b[1].pass / b[1].total) - (a[1].pass / a[1].total))
      .map(([label, v]) => ({
        label,
        value: Math.round((v.pass / v.total) * 100),
        color: (v.pass / v.total) >= 0.9 ? '#10b981' : (v.pass / v.total) >= 0.7 ? '#f59e0b' : '#ef4444',
      }));

    const inspMap = {};
    data.forEach(r => {
      const insp = r.inspector || 'Unknown';
      if (!inspMap[insp]) inspMap[insp] = 0;
      inspMap[insp]++;
    });
    const inspectorBoard = Object.entries(inspMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], i) => ({ label, value, color: gradeColors[i % gradeColors.length] }));

    const totalRecords = data.length;
    const passRate = totalRecords > 0 ? (passCount / totalRecords) * 100 : 0;

    return {
      totalRecords, passCount, failCount, pendingCount, passRate,
      gradeDistribution, monthlyTrend, mfgDistribution, passRateByGrade, inspectorBoard
    };
  }, [allResults, testResults]);

  // ============================================================
  // ✅ Search Handlers (แก้ไขใหม่)
  // ============================================================

  /**
   * Handle search input change with debounce
   */
  const handleSearchInputChange = (value) => {
    setSearchInput(value);
    setIsSearching(true);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce: รอ 400ms ก่อน search จริง
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
    }, DEBOUNCE_DELAY);
  };

  /**
   * Handle search on Enter key
   */
  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Clear timeout และ search ทันที
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      setSearchTerm(searchInput);
    }
  };

  /**
   * Clear search
   */
  const handleClearSearch = () => {
    setSearchInput("");
    setSearchTerm("");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  /**
   * Clear all filters
   */
  const handleClearAllFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setFilters({ grade: "all", result: "all" });
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  /**
   * Handle filter change
   */
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  /**
   * Handle page change
   */
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchInspections(newPage);
    }
  };

  /**
   * Handle limit change
   */
  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: parseInt(newLimit), page: 1 }));
  };

  // Check if any filter is active
  const hasActiveFilters = searchTerm || filters.grade !== 'all' || filters.result !== 'all';

  // --- Form Handlers ---
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "materialGrade") {
      const spec = steelSpecifications[value];
      setSelectedSpec(spec);
      setFormData((prev) => ({
        ...prev,
        materialGrade: value,
        standard: spec ? spec.standard : prev.standard || "",
        testValues: prev.id && prev.materialGrade === value ? prev.testValues : {},
      }));
    }
  };

  const handleTestValueChange = (element, value) => {
    setFormData((prev) => ({
      ...prev,
      testValues: { ...prev.testValues, [element]: value },
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("ไฟล์มีขนาดใหญ่เกินไป (Max 2MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          pdfFile: reader.result,
          pdfName: file.name,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = () => {
    setFormData((prev) => ({ ...prev, pdfFile: null, pdfName: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleEdit = (record) => {
    setFormData({
      id: record.id,
      inspectionDate: record.inspectionDate
        ? record.inspectionDate.split("T")[0]
        : new Date().toISOString().split("T")[0],
      inspector: record.inspector,
      certNo: record.certNo,
      heatNo: record.heatNo,
      materialGrade: record.materialGrade,
      approvedBy: record.approvedBy || "",
      manufacturer: record.manufacturer || "",
      supplier: record.supplier || "",
      standard: record.standard || "",
      customStandard: "",
      testValues: record.testValues || {},
      remarks: record.remarks || "",
      pdfFile: record.pdfFile || null,
      pdfName: record.pdfName || "",
    });

    const spec = steelSpecifications[record.materialGrade];
    setSelectedSpec(spec);

    setActiveTab("inspection");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("ยืนยันการลบข้อมูล? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;

    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const result = await response.json();

      if (response.ok && result.success) {
        alert("ลบข้อมูลสำเร็จ");
        fetchInspections(pagination.page);
      } else {
        alert(`ลบไม่สำเร็จ: ${result.message}`);
      }
    } catch (error) {
      console.error("Delete Error:", error);
      alert("เกิดข้อผิดพลาดในการลบ");
    }
  };

  const handleCancelEdit = () => {
    if (window.confirm("ยกเลิกการแก้ไข? ข้อมูลที่กรอกจะหายไป")) {
      setFormData({
        ...initialFormState,
        inspector: user ? `${user.firstname} ${user.lastname}` : "",
      });
      setSelectedSpec(null);
    }
  };

  const handleSubmit = async () => {
    if (!formData.inspector || !formData.certNo || !formData.heatNo || !formData.materialGrade) {
      alert("กรุณากรอกข้อมูลสำคัญให้ครบถ้วน");
      return;
    }

    if (formData.inspector.includes("undefined")) {
      if (!window.confirm("ชื่อผู้ตรวจสอบดูไม่ถูกต้อง (มีคำว่า undefined) ต้องการบันทึกหรือไม่?")) return;
    }

    const newRecord = { ...formData, testResult: currentStatus };
    const isEdit = !!formData.id;
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `${API_BASE}/${formData.id}` : API_BASE;

    try {
      const response = await fetch(url, {
        method: method,
        headers: getAuthHeaders(),
        body: JSON.stringify(newRecord),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(isEdit ? "✅ แก้ไขข้อมูลสำเร็จ" : "✅ บันทึกข้อมูลสำเร็จ");

        const inspectorName = user ? `${user.firstname} ${user.lastname}` : "";
        setFormData({ ...initialFormState, inspector: inspectorName });
        setSelectedSpec(null);
        setActiveTab("history");
        isInitialMount.current = false; // ให้ fetch ใหม่
        fetchInspections(1);
      } else {
        alert(`❌ เกิดข้อผิดพลาด: ${result.message || "Unknown Error"}`);
      }
    } catch (error) {
      console.error("Save Error:", error);
      alert("❌ ไม่สามารถเชื่อมต่อ Server ได้");
    }
  };

  // --- Export ---
  const handlePrint = () => window.print();

  const exportCSV = () => {
    const elementHeaders = ALL_ELEMENTS.join(",");
    const headers = `Date,Cert No,Heat No,Grade,Result,Inspector,Manufacturer,PDF Linked,${elementHeaders}`;

    const rows = testResults.map((r) => {
      const elementsData = ALL_ELEMENTS.map((el) => {
        const val = r.testValues && r.testValues[el];
        return val !== undefined && val !== null ? val : "";
      }).join(",");

      return [
        r.inspectionDate,
        `"${r.certNo}"`,
        `"${r.heatNo}"`,
        r.materialGrade,
        r.testResult,
        `"${r.inspector}"`,
        `"${r.manufacturer || ""}"`,
        r.pdfFile ? "Yes" : "No",
        elementsData,
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `qc_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const StatusBadge = ({ status }) => {
    const config = {
      PASS: { className: "pass", icon: CheckCircle2, text: "PASS" },
      FAIL: { className: "fail", icon: XCircle, text: "FAIL" },
      PENDING: { className: "pending", icon: AlertCircle, text: "PENDING" },
    };
    const { className, icon: Icon, text } = config[status] || config["PENDING"];
    return (
      <span className={`qc-badge ${className}`}>
        <Icon size={14} /> {text}
      </span>
    );
  };

  return (
    <div className="qc-system-container">
      <style>{styles}</style>

      {/* Header */}
      <header className="qc-header">
        <div className="qc-title-group">
          <div className="qc-icon-box">
            <Beaker size={24} />
          </div>
          <div>
            <h1 className="qc-title">QC Lab System</h1>
            <p className="qc-subtitle">Chemical Composition Analysis</p>
          </div>
        </div>
        <nav className="qc-nav">
          {[
            { id: "inspection", label: formData.id ? "แก้ไขข้อมูล" : "ตรวจสอบใหม่", icon: formData.id ? Edit : FlaskConical },
            { id: "history", label: "ประวัติ", icon: History },
            { id: "reports", label: "รายงาน", icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === "history") {
                  isInitialMount.current = false;
                  fetchInspections(1);
                }
              }}
              className={`qc-nav-btn ${activeTab === tab.id ? "active" : ""}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {connectionError && (
        <div className="qc-error-banner print-hidden">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <WifiOff size={20} />
            <span>เชื่อมต่อ Server ไม่ได้ (Offline Mode)</span>
          </div>
          <button onClick={() => fetchInspections(1)} className="qc-retry-btn">
            <RefreshCw size={14} style={{ marginRight: "5px" }} /> ลองใหม่
          </button>
        </div>
      )}

      <main>
        {/* --- TAB: INSPECTION --- */}
        {activeTab === "inspection" && (
          <div className="qc-grid">
            <div className="qc-col-left print-hidden">
              <div className="qc-card">
                <div className="qc-card-header">
                  <h2 className="qc-card-title">
                    {formData.id ? <Edit size={20} className="text-orange-600" /> : <ClipboardCheck size={20} className="text-blue-600" />}
                    {formData.id ? `แก้ไขข้อมูล (ID: ${formData.id})` : "ข้อมูลทั่วไป"}
                  </h2>
                  {formData.id && (
                    <button onClick={handleCancelEdit} className="qc-btn-xs bg-red-light" style={{ color: "#dc2626" }}>
                      <X size={14} /> ยกเลิก
                    </button>
                  )}
                </div>

                <div className="qc-form-group">
                  <div className="qc-form-row">
                    <div>
                      <label className="qc-label">วันที่ตรวจสอบ</label>
                      <input type="date" className="qc-input" value={formData.inspectionDate} onChange={(e) => handleInputChange("inspectionDate", e.target.value)} />
                    </div>
                    <div>
                      <label className="qc-label">ผู้ตรวจสอบ *</label>
                      <div style={{ position: "relative" }}>
                        <input type="text" className="qc-input" style={{ paddingLeft: "35px" }} placeholder="ระบุชื่อ" value={formData.inspector} onChange={(e) => handleInputChange("inspector", e.target.value)} />
                        <User size={16} style={{ position: "absolute", left: "10px", top: "12px", color: "#64748b" }} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="qc-form-group">
                  <div className="qc-form-row">
                    <div>
                      <label className="qc-label">Cert No. *</label>
                      <input type="text" className="qc-input" value={formData.certNo} onChange={(e) => handleInputChange("certNo", e.target.value)} />
                    </div>
                    <div>
                      <label className="qc-label">Heat No. *</label>
                      <input type="text" className="qc-input" value={formData.heatNo} onChange={(e) => handleInputChange("heatNo", e.target.value)} />
                    </div>
                  </div>
                </div>
                <div className="qc-form-group">
                  <label className="qc-label">เกรดวัสดุ (Grade) *</label>
                  <select className="qc-select" value={formData.materialGrade} onChange={(e) => handleInputChange("materialGrade", e.target.value)}>
                    <option value="">-- เลือกเกรด --</option>
                    {Object.keys(steelSpecifications).map((g) => (<option key={g} value={g}>{g}</option>))}
                  </select>
                </div>
                <div className="qc-form-group">
                  <div className="qc-form-row">
                     <div>
                       <label className="qc-label">ผู้อนุมัติ</label>
                       <select className="qc-select" value={formData.approvedBy} onChange={(e) => handleInputChange("approvedBy", e.target.value)}>
                         <option value="">-- เลือกผู้อนุมัติ --</option>
                         <option value="Pongsak">Pongsak</option>
                         <option value="Roengrit">Roengrit</option>
                       </select>
                     </div>
                     <div><label className="qc-label">มาตรฐาน</label><input type="text" className="qc-input readonly" value={formData.standard} readOnly /></div>
                  </div>
                </div>
                <div className="qc-form-group">
                  <label className="qc-label">ผู้ผลิต (Manufacturer)</label>
                  <select className="qc-select" value={formData.manufacturer} onChange={(e) => handleInputChange("manufacturer", e.target.value)}>
                    <option value="">-- เลือกผู้ผลิต --</option>
                    {MANUFACTURERS.map((m, index) => (<option key={index} value={m}>{m}</option>))}
                  </select>
                </div>

                <div className="qc-form-group" style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", border: "1px dashed #cbd5e1" }}>
                    <label className="qc-label" style={{ display: "flex", alignItems: "center", gap: "8px" }}><FileText size={16} /> แนบไฟล์ PDF (ใบรับรอง/ผล Lab)</label>
                    <input type="file" accept="application/pdf" ref={fileInputRef} onChange={handleFileChange} style={{ display: "none" }} />
                    {!formData.pdfFile ? (
                        <button type="button" onClick={() => fileInputRef.current.click()} className="qc-btn-outline" style={{ width: "100%", justifyContent: "center" }}><Upload size={16} /> เลือกไฟล์ PDF</button>
                    ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", padding: "8px", borderRadius: "4px", border: "1px solid #e2e8f0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}><FileText size={20} color="#dc2626" /><span style={{ fontSize: "0.85rem", textOverflow: "ellipsis", whiteSpace: "nowrap", overflow: "hidden" }}>{formData.pdfName}</span></div>
                            <button type="button" onClick={removeFile} style={{ border: "none", background: "none", cursor: "pointer", color: "#94a3b8" }}><Trash2 size={16} /></button>
                        </div>
                    )}
                </div>

                <button onClick={handleSubmit} className={`qc-btn ${formData.id ? "qc-btn-warning" : "qc-btn-primary"}`} disabled={connectionError}>
                  <Save size={18} /> {formData.id ? "บันทึกการแก้ไข" : "บันทึกผลการตรวจสอบ"}
                </button>
              </div>
            </div>

            <div className="qc-col-right">
              <div className="qc-card">
                <div className="qc-card-header">
                  <div>
                    <h2 className="qc-card-title"><Beaker size={20} className="text-indigo-600" /> ผลวิเคราะห์เคมี</h2>
                    {selectedSpec && <p className="qc-subtitle" style={{ marginTop: "5px" }}>{selectedSpec.name}</p>}
                  </div>
                  <div className="print-hidden"><StatusBadge status={currentStatus} /></div>
                </div>

                {!selectedSpec ? (
                  <div className="qc-empty-state">
                    <Factory size={48} style={{ margin: "0 auto 15px", color: "#cbd5e1" }} />
                    <p>กรุณาเลือกเกรดวัสดุทางซ้ายมือ</p>
                  </div>
                ) : (
                  <div>
                    <div className="print-show" style={{ display: "none", marginBottom: "20px", fontSize: "10pt" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "10px" }}>
                            <tbody>
                                <tr>
                                    <td style={{ border: "none", padding: "4px", fontWeight: "bold" }}>Date:</td>
                                    <td style={{ border: "none", padding: "4px" }}>{new Date(formData.inspectionDate).toLocaleDateString("th-TH")}</td>
                                    <td style={{ border: "none", padding: "4px", fontWeight: "bold" }}>Cert No:</td>
                                    <td style={{ border: "none", padding: "4px" }}>{formData.certNo}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: "none", padding: "4px", fontWeight: "bold" }}>Grade:</td>
                                    <td style={{ border: "none", padding: "4px" }}>{formData.materialGrade}</td>
                                    <td style={{ border: "none", padding: "4px", fontWeight: "bold" }}>Heat No:</td>
                                    <td style={{ border: "none", padding: "4px" }}>{formData.heatNo}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: "none", padding: "4px", fontWeight: "bold" }}>Manufacturer:</td>
                                    <td style={{ border: "none", padding: "4px" }}>{formData.manufacturer}</td>
                                    <td style={{ border: "none", padding: "4px", fontWeight: "bold" }}>Standard:</td>
                                    <td style={{ border: "none", padding: "4px" }}>{formData.standard}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="qc-table-wrapper">
                      <table className="qc-table">
                        <thead>
                          <tr><th>Element</th><th>Min</th><th>Max</th><th>Actual (%)</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedSpec.elements).map(([el, range]) => {
                            const val = formData.testValues[el];
                            const isValid = isWithinSpec(el, val);
                            return (
                              <tr key={el}>
                                <td><strong>{el}</strong></td>
                                <td style={{ textAlign: "center" }}>{range.min}</td>
                                <td style={{ textAlign: "center" }}>{range.max}</td>
                                <td>
                                  <input type="number" step="0.001" className={`qc-table-input ${val !== undefined && val !== "" ? (isValid ? "pass" : "fail") : ""}`} value={val || ""} onChange={(e) => handleTestValueChange(el, e.target.value)} placeholder="0.000" />
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  {val !== undefined && val !== "" && (isValid ? <CheckCircle2 size={18} color="#16a34a" /> : <XCircle size={18} color="#dc2626" />)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="qc-form-group" style={{ marginTop: "20px" }}>
                      <label className="qc-label">หมายเหตุ (Remarks)</label>
                      <textarea className="qc-textarea" rows="3" value={formData.remarks} onChange={(e) => handleInputChange("remarks", e.target.value)} placeholder="รายละเอียดเพิ่มเติม..." />
                    </div>

                    <div className="print-show">
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "50px", width: "100%" }}>
                            <div style={{ textAlign: "center", width: "40%" }}>
                                <div style={{ borderBottom: "1px solid #000", height: "40px", marginBottom: "10px" }}></div>
                                <p>ผู้ตรวจสอบ ({formData.inspector})</p>
                            </div>
                            <div style={{ textAlign: "center", width: "40%" }}>
                                <div style={{ borderBottom: "1px solid #000", height: "40px", marginBottom: "10px" }}></div>
                                <p>ผู้อนุมัติ ({formData.approvedBy})</p>
                            </div>
                        </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: HISTORY (✅ แก้ไขใหม่) --- */}
        {activeTab === "history" && (
          <div>
            {/* ✅ Search & Filter Toolbar (ปรับปรุงใหม่) */}
            <div className="qc-toolbar">
              <div className="qc-search-group">
                {/* Search Input */}
                <div className="search-input-container">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    placeholder="ค้นหา Cert No, Heat No, Grade..."
                    className="qc-input search-input"
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                  />
                  {searchInput && (
                    <button className="search-clear-btn" onClick={handleClearSearch}>
                      <X size={14} />
                    </button>
                  )}
                  {isSearching && (
                    <div className="search-loading">
                      <RefreshCw size={14} className="spin" />
                    </div>
                  )}
                </div>

                {/* Grade Filter */}
                <select
                  className="qc-select filter-select"
                  value={filters.grade}
                  onChange={(e) => handleFilterChange('grade', e.target.value)}
                >
                  <option value="all">ทุกเกรด</option>
                  {Object.keys(steelSpecifications).map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>

                {/* Result Filter */}
                <select
                  className="qc-select filter-select"
                  value={filters.result}
                  onChange={(e) => handleFilterChange('result', e.target.value)}
                >
                  <option value="all">ทุกผลลัพธ์</option>
                  <option value="PASS">✅ PASS</option>
                  <option value="FAIL">❌ FAIL</option>
                  <option value="PENDING">⏳ PENDING</option>
                </select>

                {/* Items per page */}
                <select
                  className="qc-select filter-select"
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(e.target.value)}
                >
                  <option value={10}>10 / หน้า</option>
                  <option value={25}>25 / หน้า</option>
                  <option value={50}>50 / หน้า</option>
                  <option value={100}>100 / หน้า</option>
                </select>

                {/* Clear All Filters Button */}
                {hasActiveFilters && (
                  <button
                    className="qc-btn-outline clear-filters-btn"
                    onClick={handleClearAllFilters}
                    title="ล้างตัวกรองทั้งหมด"
                  >
                    <RotateCcw size={14} />
                    <span>ล้างตัวกรอง</span>
                  </button>
                )}
              </div>

              {/* Export Buttons */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={exportCSV} className="qc-btn qc-btn-success" style={{ width: "auto" }}>
                  <FileDown size={16} /> CSV
                </button>
                <button onClick={handlePrint} className="qc-btn qc-btn-secondary" style={{ width: "auto" }}>
                  <Printer size={16} /> Print
                </button>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="active-filters-bar">
                <Filter size={14} />
                <span>กำลังกรอง:</span>
                {searchTerm && (
                  <span className="filter-tag">
                    🔍 "{searchTerm}"
                    <button onClick={handleClearSearch}><X size={12} /></button>
                  </span>
                )}
                {filters.grade !== 'all' && (
                  <span className="filter-tag">
                    เกรด: {filters.grade}
                    <button onClick={() => handleFilterChange('grade', 'all')}><X size={12} /></button>
                  </span>
                )}
                {filters.result !== 'all' && (
                  <span className="filter-tag">
                    ผลลัพธ์: {filters.result}
                    <button onClick={() => handleFilterChange('result', 'all')}><X size={12} /></button>
                  </span>
                )}
              </div>
            )}

            {/* Table */}
            <div className="qc-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="qc-table-wrapper" style={{ border: "none", borderRadius: 0 }}>
                <table className="qc-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Cert No.</th>
                      <th>Heat No.</th>
                      <th>Grade</th>
                      <th>Standard</th>
                      <th>Manufacturer</th>
                      <th>Approved By</th>
                      <th style={{ textAlign: "center" }}>Result</th>
                      <th className="print-hidden" style={{ textAlign: "center" }}>PDF</th>
                      {ALL_ELEMENTS.map((el) => (
                        <th key={el} style={{ textAlign: "center", background: "#f1f5f9", fontSize: "0.75rem" }}>{el}</th>
                      ))}
                      <th className="print-hidden" style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={10 + ALL_ELEMENTS.length} style={{ textAlign: "center", padding: "40px" }}>
                          <RefreshCw size={24} className="spin" style={{ marginBottom: "10px" }} />
                          <p style={{ color: "#64748b" }}>กำลังโหลดข้อมูล...</p>
                        </td>
                      </tr>
                    ) : testResults.length === 0 ? (
                      <tr>
                        <td colSpan={10 + ALL_ELEMENTS.length} style={{ textAlign: "center", padding: "60px", color: "#94a3b8" }}>
                          <Search size={40} style={{ marginBottom: "10px", opacity: 0.5 }} />
                          <p style={{ fontSize: "1rem", marginBottom: "5px" }}>ไม่พบข้อมูล</p>
                          {hasActiveFilters && (
                            <p style={{ fontSize: "0.85rem" }}>ลองปรับตัวกรองหรือคำค้นหาใหม่</p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      testResults.map((record) => {
                        const displayStandard = record.standard || (steelSpecifications[record.materialGrade] ? steelSpecifications[record.materialGrade].standard : "-");
                        return (
                          <tr key={record.id}>
                            <td>{new Date(record.inspectionDate).toLocaleDateString("th-TH")}</td>
                            <td><strong>{record.certNo}</strong></td>
                            <td>{record.heatNo}</td>
                            <td><span style={{ padding: "2px 6px", background: "#f1f5f9", borderRadius: "4px", fontSize: "0.8rem" }}>{record.materialGrade}</span></td>
                            <td style={{ fontSize: "0.8rem" }}>{displayStandard}</td>
                            <td style={{ fontSize: "0.8rem" }}>{record.manufacturer || "-"}</td>
                            <td style={{ fontSize: "0.8rem" }}>{record.approvedBy || "-"}</td>
                            <td style={{ textAlign: "center" }}><StatusBadge status={record.testResult} /></td>
                            <td className="print-hidden" style={{ textAlign: "center" }}>
                              {record.pdfFile ? (
                                <a href={record.pdfFile} download={record.pdfName || "report.pdf"} title={record.pdfName} style={{ color: "#dc2626", display: "inline-flex" }}>
                                  <FileText size={18} />
                                </a>
                              ) : <span style={{ color: "#cbd5e1" }}>-</span>}
                            </td>
                            {ALL_ELEMENTS.map((el) => (
                              <td key={el} style={{ textAlign: "center", fontSize: "0.8rem", padding: "4px" }}>
                                {record.testValues && record.testValues[el] ? record.testValues[el] : "-"}
                              </td>
                            ))}
                            <td className="print-hidden" style={{ textAlign: "right" }}>
                              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                                <button onClick={() => handleEdit(record)} style={{ border: "none", background: "none", cursor: "pointer", color: "#2563eb" }} title="Edit">
                                  <Edit size={16} />
                                </button>
                                <button onClick={() => handleDelete(record.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626" }} title="Delete">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* ✅ Pagination Footer (ปรับปรุงใหม่) */}
              <div className="print-hidden pagination-footer">
                <span className="pagination-info">
                  แสดง {testResults.length} รายการ
                  {pagination.total > 0 && ` จากทั้งหมด ${pagination.total}`}
                </span>
                
                {pagination.totalPages > 1 && (
                  <div className="pagination-controls">
                    <button
                      className="pagination-btn"
                      disabled={pagination.page <= 1 || isLoading}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      <ChevronLeft size={16} />
                      <span>ก่อนหน้า</span>
                    </button>

                    {/* Page Numbers */}
                    <div className="pagination-pages">
                      {(() => {
                        const totalPages = pagination.totalPages;
                        const currentPage = pagination.page;
                        const pages = [];
                        const showPages = new Set();

                        showPages.add(1);
                        if (totalPages > 0) showPages.add(totalPages);
                        for (let i = Math.max(1, currentPage - 1); i <= Math.min(totalPages, currentPage + 1); i++) {
                          showPages.add(i);
                        }

                        const sorted = [...showPages].sort((a, b) => a - b);
                        sorted.forEach((p, idx) => {
                          if (idx > 0 && p - sorted[idx - 1] > 1) {
                            pages.push(<span key={`dots-${p}`} className="pagination-dots">...</span>);
                          }
                          pages.push(
                            <button
                              key={p}
                              onClick={() => handlePageChange(p)}
                              disabled={isLoading}
                              className={`pagination-page ${p === currentPage ? 'active' : ''}`}
                            >
                              {p}
                            </button>
                          );
                        });
                        return pages;
                      })()}
                    </div>

                    <button
                      className="pagination-btn"
                      disabled={pagination.page >= pagination.totalPages || isLoading}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      <span>ถัดไป</span>
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: REPORTS --- */}
        {activeTab === "reports" && (
          <div className="report-dashboard">
            {/* KPI Cards Row */}
            <div className="report-kpi-row">
              <div className="report-kpi-card kpi-total">
                <div className="kpi-icon-wrap" style={{ background: '#eff6ff' }}><Layers size={22} color="#2563eb" /></div>
                <div className="kpi-content">
                  <span className="kpi-label">Total Inspections</span>
                  <span className="kpi-value">{reportData.totalRecords}</span>
                </div>
              </div>
              <div className="report-kpi-card kpi-pass">
                <div className="kpi-icon-wrap" style={{ background: '#f0fdf4' }}><CheckCircle2 size={22} color="#16a34a" /></div>
                <div className="kpi-content">
                  <span className="kpi-label">Passed</span>
                  <span className="kpi-value" style={{ color: '#16a34a' }}>{reportData.passCount}</span>
                </div>
              </div>
              <div className="report-kpi-card kpi-fail">
                <div className="kpi-icon-wrap" style={{ background: '#fef2f2' }}><XCircle size={22} color="#dc2626" /></div>
                <div className="kpi-content">
                  <span className="kpi-label">Failed</span>
                  <span className="kpi-value" style={{ color: '#dc2626' }}>{reportData.failCount}</span>
                </div>
              </div>
              <div className="report-kpi-card kpi-pending">
                <div className="kpi-icon-wrap" style={{ background: '#fefce8' }}><AlertCircle size={22} color="#ca8a04" /></div>
                <div className="kpi-content">
                  <span className="kpi-label">Pending</span>
                  <span className="kpi-value" style={{ color: '#ca8a04' }}>{reportData.pendingCount}</span>
                </div>
              </div>
            </div>

            {/* Charts Row 1 */}
            <div className="report-charts-row">
              <div className="report-chart-card" style={{ flex: '0 0 320px' }}>
                <div className="chart-card-header">
                  <PieChart size={18} color="#6366f1" />
                  <h3>ผลการตรวจสอบ</h3>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '10px 0' }}>
                  <DonutChart
                    size={170}
                    strokeWidth={26}
                    data={[
                      { value: reportData.passCount, color: '#10b981' },
                      { value: reportData.failCount, color: '#ef4444' },
                      { value: reportData.pendingCount, color: '#f59e0b' },
                    ]}
                  />
                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} /> Pass</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} /> Fail</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} /> Pending</span>
                  </div>
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                    <GaugeChart value={reportData.passRate} size={150} />
                  </div>
                </div>
              </div>

              <div className="report-chart-card" style={{ flex: 1, minWidth: 0 }}>
                <div className="chart-card-header">
                  <TrendingUp size={18} color="#3b82f6" />
                  <h3>แนวโน้มรายเดือน (Monthly Trend)</h3>
                </div>
                <div style={{ padding: '10px 0' }}>
                  <TrendLineSVG data={reportData.monthlyTrend} width={500} height={180} color="#3b82f6" />
                </div>
                {reportData.monthlyTrend.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {reportData.monthlyTrend.slice(-6).map((m, i) => (
                      <div key={i} style={{ background: '#f8fafc', borderRadius: '6px', padding: '6px 10px', fontSize: '0.75rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ color: '#64748b' }}>{m.label}</span>
                        <span style={{ color: '#10b981', fontWeight: 600 }}>P:{m.pass}</span>
                        <span style={{ color: '#ef4444', fontWeight: 600 }}>F:{m.fail}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Charts Row 2 */}
            <div className="report-charts-row">
              <div className="report-chart-card" style={{ flex: 1, minWidth: 0 }}>
                <div className="chart-card-header">
                  <BarChart3 size={18} color="#8b5cf6" />
                  <h3>สัดส่วนตามเกรดวัสดุ (Grade Distribution)</h3>
                </div>
                <div style={{ padding: '10px 0' }}>
                  <BarChartSVG data={reportData.gradeDistribution} width={Math.max(400, reportData.gradeDistribution.length * 55)} height={220} />
                </div>
              </div>

              <div className="report-chart-card" style={{ flex: '0 0 340px' }}>
                <div className="chart-card-header">
                  <Award size={18} color="#10b981" />
                  <h3>Pass Rate ตามเกรด</h3>
                </div>
                <div style={{ padding: '10px 0' }}>
                  {reportData.passRateByGrade.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {reportData.passRateByGrade.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.8rem', width: '80px', fontWeight: 500, color: '#475569', flexShrink: 0 }}>{item.label}</span>
                          <div style={{ flex: 1, background: '#f1f5f9', borderRadius: '10px', height: '20px', overflow: 'hidden', position: 'relative' }}>
                            <div style={{
                              width: `${item.value}%`,
                              height: '100%',
                              background: item.color,
                              borderRadius: '10px',
                              transition: 'width 0.6s ease',
                              opacity: 0.85,
                            }} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: item.color, minWidth: '42px', textAlign: 'right' }}>{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No data available</div>
                  )}
                </div>
              </div>
            </div>

            {/* Charts Row 3 */}
            <div className="report-charts-row">
              <div className="report-chart-card" style={{ flex: 1, minWidth: 0 }}>
                <div className="chart-card-header">
                  <Factory size={18} color="#f59e0b" />
                  <h3>จำนวนตรวจสอบตามผู้ผลิต (Manufacturer)</h3>
                </div>
                <div style={{ padding: '10px 0' }}>
                  <HorizontalBarChart data={reportData.mfgDistribution} height={240} />
                </div>
              </div>

              <div className="report-chart-card" style={{ flex: '0 0 320px' }}>
                <div className="chart-card-header">
                  <User size={18} color="#6366f1" />
                  <h3>ผู้ตรวจสอบ (Top Inspectors)</h3>
                </div>
                <div style={{ padding: '10px 0' }}>
                  {reportData.inspectorBoard.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {reportData.inspectorBoard.map((insp, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: `${insp.color}22`, color: insp.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, fontSize: '0.8rem', flexShrink: 0
                          }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{insp.label}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{insp.value} inspections</div>
                          </div>
                          <div style={{
                            background: `${insp.color}15`, color: insp.color,
                            padding: '4px 10px', borderRadius: '12px',
                            fontSize: '0.8rem', fontWeight: 700,
                          }}>{insp.value}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px' }}>No data available</div>
                  )}
                </div>
              </div>
            </div>

            {/* Export bar */}
            <div className="report-export-bar">
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                <Activity size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                แสดงข้อมูลจากทั้งหมด {reportData.totalRecords} รายการ
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={exportCSV} className="qc-btn qc-btn-success" style={{ width: "auto" }}><FileDown size={16} /> Export CSV</button>
                <button onClick={handlePrint} className="qc-btn qc-btn-secondary" style={{ width: "auto" }}><Printer size={16} /> Print</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
export default ChemicalTest;

const styles = `
  .qc-system-container { font-family: 'Sarabun', sans-serif; color: #334155; background-color: #f8fafc; min-height: 100vh; padding: 20px; box-sizing: border-box; }
  .qc-header { background: white; padding: 15px 20px; border-radius: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; }
  .qc-title-group { display: flex; align-items: center; gap: 12px; }
  .qc-icon-box { background-color: #2563eb; color: white; padding: 8px; border-radius: 8px; }
  .qc-title { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1e293b; }
  .qc-subtitle { margin: 0; font-size: 0.875rem; color: #64748b; }
  .qc-nav { display: flex; gap: 5px; background: #f1f5f9; padding: 4px; border-radius: 8px; }
  .qc-nav-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border: none; background: transparent; color: #64748b; font-weight: 500; cursor: pointer; border-radius: 6px; transition: all 0.2s; font-size: 0.9rem; }
  .qc-nav-btn:hover { color: #1e293b; background: rgba(255,255,255,0.5); }
  .qc-nav-btn.active { background: white; color: #2563eb; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
  .qc-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
  @media (min-width: 1024px) { .qc-grid { grid-template-columns: 400px 1fr; align-items: start; } }
  .qc-card { background: white; border-radius: 10px; border: 1px solid #e2e8f0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); padding: 20px; margin-bottom: 20px; }
  .qc-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #f1f5f9; }
  .qc-card-title { font-size: 1.1rem; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 10px; margin: 0; }
  .qc-form-group { margin-bottom: 15px; }
  .qc-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  .qc-label { display: block; font-size: 0.875rem; font-weight: 500; color: #475569; margin-bottom: 6px; }
  .qc-input, .qc-select, .qc-textarea { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.95rem; background-color: white; box-sizing: border-box; }
  .qc-input:focus, .qc-select:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
  .qc-input.readonly { background-color: #f8fafc; color: #64748b; cursor: not-allowed; }
  .qc-btn { width: 100%; padding: 12px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; font-size: 1rem; transition: background-color 0.2s; }
  .qc-btn:disabled { opacity: 0.7; cursor: not-allowed; }
  .qc-btn-primary { background-color: #2563eb; color: white; }
  .qc-btn-primary:hover:not(:disabled) { background-color: #1d4ed8; }
  .qc-btn-success { background-color: #10b981; color: white; }
  .qc-btn-success:hover:not(:disabled) { background-color: #059669; }
  .qc-btn-warning { background-color: #f59e0b; color: white; }
  .qc-btn-warning:hover:not(:disabled) { background-color: #d97706; }
  .qc-btn-secondary { background-color: #334155; color: white; }
  .qc-btn-secondary:hover:not(:disabled) { background-color: #1e293b; }
  .qc-btn-outline { background: white; border: 1px dashed #cbd5e1; color: #64748b; display: flex; align-items: center; gap: 8px; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; }
  .qc-btn-outline:hover { border-color: #94a3b8; color: #475569; }
  .qc-btn-xs { padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; display: flex; align-items: center; gap: 4px; border: none; cursor: pointer; }
  .qc-table-wrapper { overflow-x: auto; border: 1px solid #e2e8f0; border-radius: 8px; }
  .qc-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .qc-table th { background-color: #f8fafc; color: #475569; font-weight: 600; padding: 12px 16px; text-align: left; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
  .qc-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; color: #334155; white-space: nowrap; }
  .qc-table tbody tr:hover { background-color: #f8fafc; }
  .qc-table-input { width: 100%; padding: 6px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center; box-sizing: border-box; }
  .qc-table-input.pass { border-color: #86efac; background-color: #f0fdf4; color: #166534; }
  .qc-table-input.fail { border-color: #fca5a5; background-color: #fef2f2; color: #991b1b; font-weight: bold; }
  .qc-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; }
  .qc-badge.pass { background-color: #dcfce7; color: #166534; }
  .qc-badge.fail { background-color: #fee2e2; color: #991b1b; }
  .qc-badge.pending { background-color: #fef9c3; color: #854d0e; }
  .qc-empty-state { text-align: center; padding: 40px 20px; background-color: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 8px; color: #64748b; }
  .qc-toolbar { display: flex; flex-wrap: wrap; gap: 15px; justify-content: space-between; align-items: center; margin-bottom: 20px; background: white; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; }
  .qc-search-group { display: flex; gap: 10px; flex: 1; flex-wrap: wrap; align-items: center; }
  .qc-error-banner { background-color: #fee2e2; color: #991b1b; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px; font-weight: 500; }
  .qc-retry-btn { display: flex; align-items: center; background: #991b1b; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
  .qc-retry-btn:hover { background: #7f1d1d; }

  /* ===== SEARCH INPUT STYLES (NEW) ===== */
  .search-input-container {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 280px;
    flex: 1;
    max-width: 400px;
  }
  .search-input-container .search-icon {
    position: absolute;
    left: 12px;
    color: #94a3b8;
    pointer-events: none;
    z-index: 1;
  }
  .search-input-container .search-input {
    padding-left: 38px;
    padding-right: 70px;
  }
  .search-input-container .search-clear-btn {
    position: absolute;
    right: 36px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #94a3b8;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s;
  }
  .search-input-container .search-clear-btn:hover {
    background: #ef4444;
  }
  .search-input-container .search-loading {
    position: absolute;
    right: 10px;
    color: #3b82f6;
  }
  .filter-select {
    min-width: 120px;
    max-width: 150px;
  }
  .clear-filters-btn {
    padding: 8px 12px !important;
    border: 1px solid #e2e8f0 !important;
    background: #fef2f2 !important;
    color: #dc2626 !important;
    font-size: 0.85rem !important;
    white-space: nowrap;
  }
  .clear-filters-btn:hover {
    background: #fee2e2 !important;
    border-color: #fca5a5 !important;
  }

  /* Active Filters Bar */
  .active-filters-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 15px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    margin-bottom: 15px;
    font-size: 0.85rem;
    color: #1e40af;
    flex-wrap: wrap;
  }
  .filter-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: white;
    border: 1px solid #93c5fd;
    border-radius: 20px;
    font-size: 0.8rem;
    color: #1e40af;
  }
  .filter-tag button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    background: #dbeafe;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    color: #1e40af;
    transition: all 0.2s;
  }
  .filter-tag button:hover {
    background: #ef4444;
    color: white;
  }

  /* Pagination Styles (NEW) */
  .pagination-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 20px;
    border-top: 1px solid #f1f5f9;
    background: #fafafa;
    flex-wrap: wrap;
    gap: 12px;
  }
  .pagination-info {
    font-size: 0.85rem;
    color: #64748b;
  }
  .pagination-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pagination-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s;
  }
  .pagination-btn:hover:not(:disabled) {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }
  .pagination-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .pagination-pages {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .pagination-page {
    min-width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 0.85rem;
    font-weight: 500;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s;
  }
  .pagination-page:hover:not(:disabled) {
    background: #eff6ff;
    border-color: #3b82f6;
    color: #2563eb;
  }
  .pagination-page.active {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
    font-weight: 700;
  }
  .pagination-dots {
    padding: 0 6px;
    color: #94a3b8;
  }

  /* Spin animation */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .spin {
    animation: spin 1s linear infinite;
  }

  /* ===== REPORT DASHBOARD STYLES ===== */
  .report-dashboard { display: flex; flex-direction: column; gap: 20px; }

  .report-kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
  }
  @media (max-width: 900px) { .report-kpi-row { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 500px) { .report-kpi-row { grid-template-columns: 1fr; } }

  .report-kpi-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 18px 20px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .report-kpi-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }
  .kpi-icon-wrap {
    width: 44px; height: 44px;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .kpi-content { display: flex; flex-direction: column; }
  .kpi-label { font-size: 0.78rem; color: #94a3b8; font-weight: 500; text-transform: uppercase; letter-spacing: 0.03em; }
  .kpi-value { font-size: 1.6rem; font-weight: 700; color: #1e293b; line-height: 1.2; }

  .report-charts-row {
    display: flex;
    gap: 20px;
    flex-wrap: wrap;
  }
  .report-chart-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    min-width: 0;
  }
  .chart-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f1f5f9;
  }
  .chart-card-header h3 {
    margin: 0;
    font-size: 0.92rem;
    font-weight: 600;
    color: #1e293b;
  }

  .report-export-bar {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 14px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }

  @media print {
    @page { margin: 1cm; size: landscape; }
    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .qc-header, .qc-nav, .qc-toolbar, .print-hidden, .qc-error-banner, .active-filters-bar { display: none !important; }
    .qc-system-container { padding: 0; background: white; min-height: auto; }
    .qc-card { box-shadow: none; border: none; padding: 0; margin: 0; }
    .qc-card-header { border-bottom: 2px solid #000; margin-bottom: 20px; }
    .qc-grid { display: block; }
    .qc-col-left { display: none; }
    .qc-col-right { width: 100%; }
    .qc-table-wrapper { border: none; overflow: visible; }
    .qc-table { font-size: 10pt; width: 100%; border-collapse: collapse; }
    .qc-table th, .qc-table td { padding: 6px; border: 1px solid #ddd; color: black; }
    .qc-table th { background-color: #f0f0f0 !important; font-weight: bold; text-align: center; }
    .qc-table-input { border: none; background: transparent; padding: 0; text-align: center; color: black; font-weight: bold; }
    .qc-input { border: none; background: transparent; padding: 0; }
    .print-show { display: flex !important; margin-top: 40px; page-break-inside: avoid; }
    .qc-badge { border: 1px solid #000; background: transparent !important; color: #000 !important; }
    .report-dashboard { gap: 10px; }
    .report-kpi-card, .report-chart-card { box-shadow: none; border: 1px solid #ddd; page-break-inside: avoid; }
    .report-export-bar { display: none !important; }
  }
  .print-show { display: none; }
`;