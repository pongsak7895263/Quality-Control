import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Beaker,
  ClipboardCheck,
  History,
  BarChart3,
  Search,
  Printer,
  FileDown,
  Save,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FlaskConical,
  Factory,
  WifiOff,
  RefreshCw,
  User,
  FileText,
  Upload,
  Edit,
  Trash2,
  X,
} from "lucide-react";

// --- Auth Hook Integration ---
import useAuth from "../../hooks/useAuth";
import { API_BASE_URL } from '../../config';

// ✅ FIX 1: ประกาศ API_BASE ให้ใช้งานได้ทั้ง handleDelete และ handleSubmit
//const API_BASE = "http://192.168.0.26:5000/api/v1/inspections/chemical";
const API_BASE = `${API_BASE_URL}/api/v1/inspections/chemical`;
const App = () => {
  // --- Configuration ---
  const { user } = useAuth();

  // --- Lists & Masters ---
  const MANUFACTURERS = [
    "SHIJIAZHUANG IRON & STEEL CO., LTD",
    "CHAINA STEEL CORRORATION",
    "NIPPON STEEL CORPORATION",
    "JFE STEEL CORPORATION",
    "SEAH BESTEEL",
    "DAIDO STEEL CO.,LTD",
    "FENG HSIN STEEL CO.,LTD",
    "HUAIGANG",
    "NIPPON STEEL CORPORATION",
    "OTHER",
  ];

  // --- Specifications Database ---
  const steelSpecifications = useMemo(
    () => ({
      S10C: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส S10C",
        standard: "JIS G4051",
        elements: {
          C: { min: 0.08, max: 0.13 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.3, max: 0.6 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.035 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.0, max: 0.2 },
        },
      },
      S15C: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส S15C",
        standard: "JIS G4051",
        elements: {
          C: { min: 0.13, max: 0.18 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.3, max: 0.6 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.035 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.0, max: 0.2 },
        },
      },
      S20C: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส S20C",
        standard: "JIS G4051",
        elements: {
          C: { min: 0.18, max: 0.23 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.3, max: 0.6 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.035 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.0, max: 0.2 },
        },
      },
      S35C: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส S35C",
        standard: "JIS G4051",
        elements: {
          C: { min: 0.32, max: 0.38 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.6, max: 0.9 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.035 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.0, max: 0.2 },
          Mo: { min: 0.0, max: 0.1 },
        },
      },
      S43C: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส S43C",
        standard: "JIS G4051",
        elements: {
          C: { min: 0.4, max: 0.46 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.6, max: 0.9 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.035 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.0, max: 0.2 },
        },
      },
      S45C: {
        name: "เหล็กกล้าคาร์บอน S45C",
        standard: "JIS G4051",
        elements: {
          C: { min: 0.42, max: 0.48 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.6, max: 0.9 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.03 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.2 },
          Cr: { min: 0, max: 0.2 },
        },
      },
      S48C: {
        name: "เหล็กกล้าคาร์บอน S48C",
        standard: "JIS G4051",
        elements: {
          C: { min: 0.45, max: 0.51 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.6, max: 0.9 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.035 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.2 },
          Cr: { min: 0, max: 0.2 },
        },
      },
      S53C: {
        name: "เหล็กกล้าคาร์บอน S53C",
        standard: "JIS G4051",
        elements: {
          C: { min: 0.5, max: 0.56 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.6, max: 0.9 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.035 },
          Ni: { min: 0, max: 0.2 },
          Cu: { min: 0, max: 0.3 },
          Cr: { min: 0, max: 0.2 },
        },
      },
      S55C: {
        name: "เหล็กกล้าคาร์บอน S55C",
        standard: "JIS G4051",
        elements: {
          C: { min: 0.52, max: 0.58 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.6, max: 0.9 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.035 },
          Ni: { min: 0, max: 0.2 },
          Cu: { min: 0, max: 0.3 },
          Cr: { min: 0, max: 0.2 },
        },
      },
      SCM415: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส SCM415",
        standard: "JIS G4053",
        elements: {
          C: { min: 0.13, max: 0.18 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.6, max: 0.85 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.03 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.9, max: 1.2 },
          Mo: { min: 0.15, max: 0.25 },
        },
      },
      SCM415H: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส SCM415H",
        standard: "JIS G4053",
        elements: {
          C: { min: 0.12, max: 0.18 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.55, max: 0.9 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.03 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.85, max: 1.25 },
          Mo: { min: 0.15, max: 0.30 },
        },
      },
      SCM415HV: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส SCM415HV",
        standard: "JIS G4052",
        elements: {
          C: { min: 0.12, max: 0.18 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.55, max: 0.9 },
          P: { min: 0, max: 0.03 },
          S: { min: 0.01, max: 0.03 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.85, max: 1.25 },
          Mo: { min: 0.15, max: 0.25 },
        },
      },
      SCM420: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส SCM420",
        standard: "JIS G4051/G4105",
        elements: {
          C: { min: 0.18, max: 0.23 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.60, max: 0.85 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.03 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.90, max: 1.20 },
          Mo: { min: 0.15, max: 0.30 },
        },
      },
      SCM420H: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส SCM420H",
        standard: "JIS G4053",
        elements: {
          C: { min: 0.17, max: 0.23 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.55, max: 0.95 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.03 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.85, max: 1.25 },
          Mo: { min: 0.15, max: 0.3 },
        },
      },
      SCM420HV: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส SCM420HV",
        standard: "JIS G4053",
        elements: {
          C: { min: 0.17, max: 0.23 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.55, max: 0.95 },
          P: { min: 0, max: 0.03 },
          S: { min: 0.01, max: 0.03 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.85, max: 1.25 },
          Mo: { min: 0.1, max: 0.25 },
        },
      },
      SCM435: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส SCM435",
        standard: "JIS G4053",
        elements: {
          C: { min: 0.33, max: 0.38 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.6, max: 0.85 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.03 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.9, max: 1.2 },
          Mo: { min: 0.15, max: 0.3 },
        },
      },
      SCM435H: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส SCM435H",
        standard: "JIS G4052",
        elements: {
          C: { min: 0.32, max: 0.39 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.55, max: 0.9 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.03 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.85, max: 1.25 },
          Mo: { min: 0.15, max: 0.35 },
        },
      },
      SCM440H: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส SCM440H",
        standard: "JIS G4052",
        elements: {
          C: { min: 0.37, max: 0.44 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.55, max: 0.9 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.03 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.85, max: 1.25 },
          Mo: { min: 0.15, max: 0.35 },
        },
      },
      SCM443H: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส SCM443H",
        standard: "JIS G4052",
        elements: {
          C: { min: 0.39, max: 0.46 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 1.3, max: 1.7 },
          P: { min: 0, max: 0.03 },
          S: { min: 0, max: 0.03 },
          Cu: { min: 0, max: 0.3 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0, max: 0.35 },
        },
      },
      SCR420H: {
        name: "เหล็กกล้าคาร์บอนแมงกานีส SCR420H",
        standard: "JIS G4052",
        elements: {
          C: { min: 0.17, max: 0.23 },
          Si: { min: 0.15, max: 0.35 },
          Mn: { min: 0.55, max: 0.95 },
          P: { min: 0, max: 0.03 },
          S: { min: 0.01, max: 0.03 },
          Cu: { min: 0, max: 0.30 },
          Ni: { min: 0, max: 0.25 },
          Cr: { min: 0.85, max: 1.25 },
        },
      },
    }),
    []
  );

  // รายชื่อธาตุทั้งหมดที่จะแสดงในตารางประวัติ
  const ALL_ELEMENTS = [
    "C",
    "Si",
    "Mn",
    "P",
    "S",
    "Cu",
    "Ni",
    "Cr",
    "Mo",
    "SP1",
  ];

  const initialFormState = {
    id: null, // เพิ่ม ID สำหรับเช็คสถานะ Edit
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
    pdfFile: null, // เก็บข้อมูลไฟล์ Base64
    pdfName: "", // เก็บชื่อไฟล์
  };

  // --- State ---
  const [activeTab, setActiveTab] = useState("inspection");
  const [formData, setFormData] = useState(initialFormState);
  const [testResults, setTestResults] = useState([]);
  const [selectedSpec, setSelectedSpec] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const fileInputRef = useRef(null); // Ref สำหรับ input file

  const [filters, setFilters] = useState({
    search: "",
    grade: "all",
    result: "all",
  });

  // --- Functions ---
  // ✅ FIX 2: ลบ API_URL ออกจาก dependency array เพราะเป็น constant
  const fetchInspections = useCallback(async () => {
    setIsLoading(true);
    setConnectionError(false);
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      setTestResults(data);
    } catch (error) {
      console.error("Connection Error:", error);
      setConnectionError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  // Auto-fill Inspector Name
  useEffect(() => {
    if (user && !formData.inspector && !formData.id) {
      // Only auto-fill if not editing
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
  const isWithinSpec = useCallback(
    (element, value) => {
      if (!selectedSpec || value === "" || value === undefined) return null;
      const spec = selectedSpec.elements[element];
      if (!spec) return null;
      const numValue = parseFloat(value);
      return numValue >= spec.min && numValue <= spec.max;
    },
    [selectedSpec]
  );

  const calculateStatus = useCallback(
    (currentValues, spec) => {
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
    },
    []
  );

  const currentStatus = useMemo(
    () => calculateStatus(formData.testValues, selectedSpec),
    [formData.testValues, selectedSpec, calculateStatus]
  );

  // --- Handlers ---
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "materialGrade") {
      const spec = steelSpecifications[value];
      setSelectedSpec(spec);
      setFormData((prev) => ({
        ...prev,
        materialGrade: value,
        standard: spec ? spec.standard : prev.standard || "",
        // Don't reset testValues if editing and grade hasn't actually changed
        testValues:
          prev.id && prev.materialGrade === value ? prev.testValues : {},
      }));
    }
  };

  const handleTestValueChange = (element, value) => {
    setFormData((prev) => ({
      ...prev,
      testValues: { ...prev.testValues, [element]: value },
    }));
  };

  // ✅ PDF File Handling: แปลงไฟล์เป็น Base64
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // Limit 2MB
        alert("ไฟล์มีขนาดใหญ่เกินไป (Max 2MB)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          pdfFile: reader.result, // Base64 string
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

  // ✅ Edit Logic: โหลดข้อมูลกลับมาใส่ฟอร์ม
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

    // Set Spec
    const spec = steelSpecifications[record.materialGrade];
    setSelectedSpec(spec);

    // Switch tab
    setActiveTab("inspection");

    // Scroll top
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ✅ FIX 3: แก้ไข handleDelete ให้ใช้ API_BASE ที่ประกาศแล้ว
  const handleDelete = async (id) => {
    if (
      !window.confirm("ยืนยันการลบข้อมูล? การกระทำนี้ไม่สามารถย้อนกลับได้")
    )
      return;

    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (response.ok && result.success) {
        alert("ลบข้อมูลสำเร็จ");
        fetchInspections();
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

  // ✅ FIX 4: แก้ไข handleSubmit ให้ใช้ตัวแปร method และ url ที่ถูกต้อง
  const handleSubmit = async () => {
    if (
      !formData.inspector ||
      !formData.certNo ||
      !formData.heatNo ||
      !formData.materialGrade
    ) {
      alert("กรุณากรอกข้อมูลสำคัญให้ครบถ้วน");
      return;
    }

    if (formData.inspector.includes("undefined")) {
      if (
        !window.confirm(
          "ชื่อผู้ตรวจสอบดูไม่ถูกต้อง (มีคำว่า undefined) ต้องการบันทึกหรือไม่?"
        )
      )
        return;
    }

    const newRecord = { ...formData, testResult: currentStatus };
    const isEdit = !!formData.id;

    // Determine Method and URL
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `${API_BASE}/${formData.id}` : API_BASE;

    try {
      // ✅ FIX: ใช้ตัวแปร url และ method ที่คำนวณไว้
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecord),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(isEdit ? "✅ แก้ไขข้อมูลสำเร็จ" : "✅ บันทึกข้อมูลสำเร็จ");
        fetchInspections();

        // Reset form
        const inspectorName = user ? `${user.firstname} ${user.lastname}` : "";
        setFormData({ ...initialFormState, inspector: inspectorName });
        setSelectedSpec(null);
        setActiveTab("history");
      } else {
        alert(`❌ เกิดข้อผิดพลาด: ${result.message || "Unknown Error"}`);
      }
    } catch (error) {
      console.error("Save Error:", error);
      alert("❌ ไม่สามารถเชื่อมต่อ Server ได้");
    }
  };

  // --- Filter & Export ---
  const filteredHistory = useMemo(() => {
    return testResults.filter((item) => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        (item.heatNo || "").toLowerCase().includes(searchLower) ||
        (item.certNo || "").toLowerCase().includes(searchLower);
      const matchesGrade =
        filters.grade === "all" || item.materialGrade === filters.grade;
      const matchesResult =
        filters.result === "all" || item.testResult === filters.result;
      return matchesSearch && matchesGrade && matchesResult;
    });
  }, [testResults, filters]);

  const handlePrint = () => window.print();

  const exportCSV = () => {
    const elementHeaders = ALL_ELEMENTS.join(",");
    const headers = `Date,Cert No,Heat No,Grade,Result,Inspector,Manufacturer,PDF Linked,${elementHeaders}`;

    const rows = filteredHistory.map((r) => {
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

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `qc_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link); // ✅ เพิ่ม: cleanup หลัง click
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
            {
              id: "inspection",
              label: formData.id ? "แก้ไขข้อมูล" : "ตรวจสอบใหม่",
              icon: formData.id ? Edit : FlaskConical,
            },
            { id: "history", label: "ประวัติ", icon: History },
            { id: "reports", label: "รายงาน", icon: BarChart3 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(
                  tab.id === "inspection" && !formData.id
                    ? "inspection"
                    : tab.id
                )
              }
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
          <button onClick={fetchInspections} className="qc-retry-btn">
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
                    {formData.id ? (
                      <Edit size={20} className="text-orange-600" />
                    ) : (
                      <ClipboardCheck size={20} className="text-blue-600" />
                    )}
                    {formData.id
                      ? `แก้ไขข้อมูล (ID: ${formData.id})`
                      : "ข้อมูลทั่วไป"}
                  </h2>
                  {formData.id && (
                    <button
                      onClick={handleCancelEdit}
                      className="qc-btn-xs bg-red-light"
                      style={{ color: "#dc2626" }}
                    >
                      <X size={14} /> ยกเลิก
                    </button>
                  )}
                </div>

                {/* Form Fields */}
                <div className="qc-form-group">
                  <div className="qc-form-row">
                    <div>
                      <label className="qc-label">วันที่ตรวจสอบ</label>
                      <input
                        type="date"
                        className="qc-input"
                        value={formData.inspectionDate}
                        onChange={(e) =>
                          handleInputChange("inspectionDate", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="qc-label">ผู้ตรวจสอบ *</label>
                      <div style={{ position: "relative" }}>
                        <input
                          type="text"
                          className="qc-input"
                          style={{ paddingLeft: "35px" }}
                          placeholder="ระบุชื่อ"
                          value={formData.inspector}
                          onChange={(e) =>
                            handleInputChange("inspector", e.target.value)
                          }
                        />
                        <User
                          size={16}
                          style={{
                            position: "absolute",
                            left: "10px",
                            top: "12px",
                            color: "#64748b",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="qc-form-group">
                  <div className="qc-form-row">
                    <div>
                      <label className="qc-label">Cert No. *</label>
                      <input
                        type="text"
                        className="qc-input"
                        value={formData.certNo}
                        onChange={(e) =>
                          handleInputChange("certNo", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="qc-label">Heat No. *</label>
                      <input
                        type="text"
                        className="qc-input"
                        value={formData.heatNo}
                        onChange={(e) =>
                          handleInputChange("heatNo", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="qc-form-group">
                  <label className="qc-label">เกรดวัสดุ (Grade) *</label>
                  <select
                    className="qc-select"
                    value={formData.materialGrade}
                    onChange={(e) =>
                      handleInputChange("materialGrade", e.target.value)
                    }
                  >
                    <option value="">-- เลือกเกรด --</option>
                    {Object.keys(steelSpecifications).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="qc-form-group">
                  <div className="qc-form-row">
                    <div>
                      <label className="qc-label">ผู้อนุมัติ</label>
                      <input
                        type="text"
                        className="qc-input"
                        value={formData.approvedBy}
                        onChange={(e) =>
                          handleInputChange("approvedBy", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="qc-label">มาตรฐาน</label>
                      <input
                        type="text"
                        className="qc-input readonly"
                        value={formData.standard}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                <div className="qc-form-group">
                  <label className="qc-label">ผู้ผลิต (Manufacturer)</label>
                  <select
                    className="qc-select"
                    value={formData.manufacturer}
                    onChange={(e) =>
                      handleInputChange("manufacturer", e.target.value)
                    }
                  >
                    <option value="">-- เลือกผู้ผลิต --</option>
                    {MANUFACTURERS.map((m, index) => (
                      <option key={index} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ✅ PDF Upload Section */}
                <div
                  className="qc-form-group"
                  style={{
                    background: "#f8fafc",
                    padding: "15px",
                    borderRadius: "8px",
                    border: "1px dashed #cbd5e1",
                  }}
                >
                  <label
                    className="qc-label"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FileText size={16} /> แนบไฟล์ PDF (ใบรับรอง/ผล Lab)
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    id="pdf-upload"
                  />
                  {!formData.pdfFile ? (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current.click()}
                      className="qc-btn-outline"
                      style={{ width: "100%", justifyContent: "center" }}
                    >
                      <Upload size={16} /> เลือกไฟล์ PDF
                    </button>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "white",
                        padding: "8px",
                        borderRadius: "4px",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          overflow: "hidden",
                        }}
                      >
                        <FileText size={20} color="#dc2626" />
                        <span
                          style={{
                            fontSize: "0.85rem",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                          }}
                        >
                          {formData.pdfName}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={removeFile}
                        style={{
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          color: "#94a3b8",
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleSubmit}
                  className={`qc-btn ${formData.id ? "qc-btn-warning" : "qc-btn-primary"
                    }`}
                  disabled={connectionError}
                >
                  <Save size={18} />{" "}
                  {formData.id ? "บันทึกการแก้ไข" : "บันทึกผลการตรวจสอบ"}
                </button>
              </div>
            </div>

            <div className="qc-col-right">
              <div className="qc-card">
                <div className="qc-card-header">
                  <div>
                    <h2 className="qc-card-title">
                      <Beaker size={20} className="text-indigo-600" />{" "}
                      ผลวิเคราะห์เคมี
                    </h2>
                    {selectedSpec && (
                      <p className="qc-subtitle" style={{ marginTop: "5px" }}>
                        {selectedSpec.name}
                      </p>
                    )}
                  </div>
                  <div className="print-hidden">
                    <StatusBadge status={currentStatus} />
                  </div>
                </div>

                {!selectedSpec ? (
                  <div className="qc-empty-state">
                    <Factory
                      size={48}
                      style={{ margin: "0 auto 15px", color: "#cbd5e1" }}
                    />
                    <p>กรุณาเลือกเกรดวัสดุทางซ้ายมือ</p>
                  </div>
                ) : (
                  <div>
                    <div className="qc-table-wrapper">
                      <table className="qc-table">
                        <thead>
                          <tr>
                            <th>Element</th>
                            <th>Min</th>
                            <th>Max</th>
                            <th>Actual (%)</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(selectedSpec.elements).map(
                            ([el, range]) => {
                              const val = formData.testValues[el];
                              const isValid = isWithinSpec(el, val);
                              return (
                                <tr key={el}>
                                  <td>
                                    <strong>{el}</strong>
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    {range.min}
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    {range.max}
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      step="0.001"
                                      className={`qc-table-input ${val !== undefined && val !== ""
                                        ? isValid
                                          ? "pass"
                                          : "fail"
                                        : ""
                                        }`}
                                      value={val || ""}
                                      onChange={(e) =>
                                        handleTestValueChange(
                                          el,
                                          e.target.value
                                        )
                                      }
                                      placeholder="0.000"
                                    />
                                  </td>
                                  <td style={{ textAlign: "center" }}>
                                    {val !== undefined &&
                                      val !== "" &&
                                      (isValid ? (
                                        <CheckCircle2
                                          size={18}
                                          color="#16a34a"
                                        />
                                      ) : (
                                        <XCircle size={18} color="#dc2626" />
                                      ))}
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                    <div
                      className="qc-form-group"
                      style={{ marginTop: "20px" }}
                    >
                      <label className="qc-label">หมายเหตุ (Remarks)</label>
                      <textarea
                        className="qc-textarea"
                        rows="3"
                        value={formData.remarks}
                        onChange={(e) =>
                          handleInputChange("remarks", e.target.value)
                        }
                        placeholder="รายละเอียดเพิ่มเติม..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: HISTORY --- */}
        {(activeTab === "history" || activeTab === "reports") && (
          <div>
            <div className="qc-toolbar">
              <div className="qc-search-group">
                <input
                  type="text"
                  placeholder="Search..."
                  className="qc-input"
                  style={{ maxWidth: "200px" }}
                  value={filters.search}
                  onChange={(e) =>
                    setFilters({ ...filters, search: e.target.value })
                  }
                />
                <select
                  className="qc-select"
                  style={{ maxWidth: "120px" }}
                  value={filters.grade}
                  onChange={(e) =>
                    setFilters({ ...filters, grade: e.target.value })
                  }
                >
                  <option value="all">ทุกเกรด</option>
                  {Object.keys(steelSpecifications).map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                <select
                  className="qc-select"
                  style={{ maxWidth: "120px" }}
                  value={filters.result}
                  onChange={(e) =>
                    setFilters({ ...filters, result: e.target.value })
                  }
                >
                  <option value="all">ทุกผลลัพธ์</option>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={exportCSV}
                  className="qc-btn qc-btn-success"
                  style={{ width: "auto" }}
                >
                  <FileDown size={16} /> CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="qc-btn qc-btn-secondary"
                  style={{ width: "auto" }}
                >
                  <Printer size={16} /> Print
                </button>
              </div>
            </div>

            <div className="qc-card" style={{ padding: 0, overflow: "hidden" }}>
              <div
                className="qc-table-wrapper"
                style={{ border: "none", borderRadius: 0 }}
              >
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
                      <th style={{ textAlign: "center" }}>PDF</th>
                      {ALL_ELEMENTS.map((el) => (
                        <th
                          key={el}
                          style={{
                            textAlign: "center",
                            background: "#f1f5f9",
                            fontSize: "0.75rem",
                          }}
                        >
                          {el}
                        </th>
                      ))}
                      <th
                        className="print-hidden"
                        style={{ textAlign: "right" }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td
                          colSpan={10 + ALL_ELEMENTS.length}
                          style={{ textAlign: "center", padding: "20px" }}
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : filteredHistory.length === 0 ? (
                      <tr>
                        <td
                          colSpan={10 + ALL_ELEMENTS.length}
                          style={{
                            textAlign: "center",
                            padding: "40px",
                            color: "#94a3b8",
                          }}
                        >
                          No records found
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((record) => {
                        const displayStandard =
                          record.standard ||
                          (steelSpecifications[record.materialGrade]
                            ? steelSpecifications[record.materialGrade].standard
                            : "-");
                        return (
                          <tr key={record.id}>
                            <td>
                              {new Date(
                                record.inspectionDate
                              ).toLocaleDateString("th-TH")}
                            </td>
                            <td>
                              <strong>{record.certNo}</strong>
                            </td>
                            <td>{record.heatNo}</td>
                            <td>
                              <span
                                style={{
                                  padding: "2px 6px",
                                  background: "#f1f5f9",
                                  borderRadius: "4px",
                                  fontSize: "0.8rem",
                                }}
                              >
                                {record.materialGrade}
                              </span>
                            </td>
                            <td style={{ fontSize: "0.8rem" }}>
                              {displayStandard}
                            </td>
                            <td style={{ fontSize: "0.8rem" }}>
                              {record.manufacturer || "-"}
                            </td>
                            <td style={{ fontSize: "0.8rem" }}>
                              {record.approvedBy || "-"}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <span
                                className={`qc-badge ${record.testResult === "PASS"
                                  ? "pass"
                                  : record.testResult === "FAIL"
                                    ? "fail"
                                    : "pending"
                                  }`}
                              >
                                {record.testResult}
                              </span>
                            </td>

                            {/* PDF Column */}
                            <td style={{ textAlign: "center" }}>
                              {record.pdfFile ? (
                                <a
                                  href={record.pdfFile}
                                  download={record.pdfName || "report.pdf"}
                                  title={record.pdfName}
                                  style={{
                                    color: "#dc2626",
                                    display: "inline-flex",
                                  }}
                                >
                                  <FileText size={18} />
                                </a>
                              ) : (
                                <span style={{ color: "#cbd5e1" }}>-</span>
                              )}
                            </td>

                            {/* Elements Data */}
                            {ALL_ELEMENTS.map((el) => (
                              <td
                                key={el}
                                style={{
                                  textAlign: "center",
                                  fontSize: "0.8rem",
                                  padding: "4px",
                                }}
                              >
                                {record.testValues && record.testValues[el]
                                  ? record.testValues[el]
                                  : "-"}
                              </td>
                            ))}

                            {/* Action: Edit & Delete Buttons */}
                            <td
                              className="print-hidden"
                              style={{
                                textAlign: "right",
                                display: "flex",
                                gap: "8px",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                onClick={() => handleEdit(record)}
                                style={{
                                  border: "none",
                                  background: "none",
                                  cursor: "pointer",
                                  color: "#2563eb",
                                }}
                                title="แก้ไข"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(record.id)}
                                style={{
                                  border: "none",
                                  background: "none",
                                  cursor: "pointer",
                                  color: "#dc2626",
                                }}
                                title="ลบ"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;

// --- Styles ---
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
  .qc-search-group { display: flex; gap: 10px; flex: 1; flex-wrap: wrap; }
  .qc-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-top: 20px; }
  .qc-stat-card { padding: 20px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.05); }
  .qc-stat-card h3 { margin: 0 0 10px 0; font-size: 0.9rem; opacity: 0.8; }
  .qc-stat-card p { margin: 0; font-size: 2rem; font-weight: 700; }
  .bg-blue-light { background-color: #eff6ff; color: #1e40af; }
  .bg-green-light { background-color: #f0fdf4; color: #166534; }
  .bg-red-light { background-color: #fef2f2; color: #991b1b; }
  .qc-error-banner { background-color: #fee2e2; color: #991b1b; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px; font-weight: 500; }
  .qc-retry-btn { background: #991b1b; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 0.85rem; display: flex; align-items: center; }
  .qc-retry-btn:hover { background: #7f1d1d; }
  @media print {
    @page { margin: 1cm; size: landscape; }
    body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .qc-header, .qc-nav, .qc-toolbar, .print-hidden, .qc-stats-grid, .qc-error-banner { display: none !important; }
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
  }
  .print-show { display: none; }
`;