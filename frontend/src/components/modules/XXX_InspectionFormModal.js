import React, { useState, useEffect, useMemo } from "react";

// --- Helper Functions (ย้ายมาไว้ในไฟล์นี้เพื่อความสมบูรณ์) ---
const createInitialBarInspections = (data = [], count = 4) => {
  if (data && data.length > 0.0) {
    return data.map((item, i) => ({
      barNumber: item.barNumber || item.bar_number || i + 1,
      odMeasurement: item.odMeasurement || item.od_measurement || "",
      lengthMeasurement:
        item.lengthMeasurement || item.length_measurement || "",
      surfaceCondition:
        item.surfaceCondition || item.surface_condition || "excellent",
    }));
  }
  return Array.from({ length: count }, (_, i) => ({
    barNumber: i + 1,
    odMeasurement: "",
    lengthMeasurement: "",
    surfaceCondition: "excellent",
  }));
};

const createInitialRodInspections = (data = [], count = 4) => {
  if (data && data.length > 0) {
    return data.map((item, i) => ({
      rodNumber: item.rodNumber || item.rod_number || i + 1,
      diameter: item.diameter || "",
      length: item.length || "",
      weight: item.weight || "",
    }));
  }
  return Array.from({ length: count }, (_, i) => ({
    rodNumber: i + 1,
    diameter: "",
    length: "",
    weight: "",
  }));
};

const InspectionFormModal = ({ show, onClose, onSave, initialData }) => {
  const isEditing = !!initialData;

  // --- State Management is now fully inside the Modal ---
  const initialFormState = useMemo(
    () => ({
      material_type: "",
      material_grade: "",
      batch_number: "",
      supplier_name: "",
      invoice_number: "",
      cer_number: "",
      inspector: "",
      inspection_quantity: "",
      notes: "",
      overall_result: "pending",
      attached_images: [],
      attached_files: [],
      barInspections: createInitialBarInspections([], 4),
      rodInspections: createInitialRodInspections([], 4),
    }),
    []
  );

  const [formData, setFormData] = useState(initialFormState);
  const [saving, setSaving] = useState(false);

  // Effect to populate form when editing
  useEffect(() => {
    if (isEditing && initialData) {
      setFormData({
        material_type: initialData.materialType || "",
        material_grade: initialData.materialGrade || "",
        batch_number: initialData.batchNumber || "",
        supplier_name: initialData.supplierName || "",
        invoice_number: initialData.invoiceNumber || "",
        cer_number: initialData.cerNumber || "",
        inspector: initialData.inspector || "",
        inspection_quantity: initialData.inspectionQuantity || "",
        notes: initialData.notes || "",
        overall_result: initialData.overallResult || "pending",
        attached_images: [], // Files are not re-loaded for editing
        attached_files: [],
        barInspections: createInitialBarInspections(
          initialData.barInspections || []
        ),
        rodInspections: createInitialRodInspections(
          initialData.rodInspections || []
        ),
      });
    } else {
      setFormData(initialFormState);
    }
  }, [isEditing, initialData, initialFormState]);

  // --- Input Handlers ---
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newState = { ...prev, [name]: value };
      if (name === "material_type") {
        newState.barInspections = createInitialBarInspections([], 4);
        newState.rodInspections = createInitialRodInspections([], 4);
      }
      return newState;
    });
  };
  const handleBarInputChange = (index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      barInspections: prev.barInspections.map((item, i) =>
        i === index ? { ...item, [name]: value } : item
      ),
    }));
  };
  const handleRodInputChange = (index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      rodInspections: prev.rodInspections.map((item, i) =>
        i === index ? { ...item, [name]: value } : item
      ),
    }));
  };
  const handleFileUpload = (e, fileType) => {
    const files = Array.from(e.target.files);
    if (fileType === "attached_images")
      setFormData((prev) => ({
        ...prev,
        attached_images: [...prev.attached_images, ...files],
      }));
    else if (fileType === "attached_files")
      setFormData((prev) => ({
        ...prev,
        attached_files: [...prev.attached_files, ...files],
      }));
  };
  const removeFile = (index, fileType) => {
    if (fileType === "attached_images")
      setFormData((prev) => ({
        ...prev,
        attached_images: prev.attached_images.filter((_, i) => i !== index),
      }));
    else if (fileType === "attached_files")
      setFormData((prev) => ({
        ...prev,
        attached_files: prev.attached_files.filter((_, i) => i !== index),
      }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  if (!show) return null;

  // --- Dropdown Options ---
  const materialTypeOptions = [
    { value: "", label: "กรุณาเลือกประเภทเหล็ก" },
    { value: "bar", label: "📏 เหล็กเส้น (Steel Bar)" },
    { value: "rod", label: "📏 เหล็กท่อน (Steel Rod)" },
  ];
  const materialGradeOptions = [
    { value: "", label: "กรุณาเลือกเกรดวัตถุดิบ" },
      { value: "S10C", label: "S10C" },
      { value: "S20C", label: "S20C" },
      { value: "S35C", label: "S35C" },
      { value: "S45C", label: "S45C" },
      { value: "S48C", label: "S48C" },
      { value: "S50C", label: "S50C" },
      { value: "S53C", label: "S53C" },
      { value: "SCM415", label: "SCM415" },
      { value: "SCM415H", label: "SCM415H" },
      { value: "SCM415HV", label: "SCM415HV" },
      { value: "SCM435", label: "SCM435" },
      { value: "SCM435H", label: "SCM435H" },
      { value: "SCM440", label: "SCM440" },
      { value: "SCM420H", label: "SCM420H" },
      { value: "SCM420HV", label: "SCM420HV" },
  ];

  // --- JSX ---
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content inspection-form-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{isEditing ? "แก้ไขการตรวจสอบ" : "สร้างการตรวจสอบใหม่"}</h2>
          <button onClick={onClose} className="close-btn">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="inspection-form">
          {/* --- General Info Section --- */}
          <div className="form-section">
            <div className="section-header">
              <h3>📋 ข้อมูลทั่วไป</h3>
              <div className="section-divider"></div>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>
                  ประเภทเหล็ก<span className="required">*</span>
                </label>
                <select
                  name="material_type"
                  value={formData.material_type}
                  onChange={handleInputChange}
                  required
                  disabled={isEditing}
                >
                  {materialTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>
                  เกรดวัตถุดิบ<span className="required">*</span>
                </label>
                <select
                  name="material_grade"
                  value={formData.material_grade}
                  onChange={handleInputChange}
                  required
                >
                  {materialGradeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>
                  Batch Number<span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="batch_number"
                  value={formData.batch_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  Supplier<span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="supplier_name"
                  value={formData.supplier_name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  Invoice No.<span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="invoice_number"
                  value={formData.invoice_number}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>
                  Inspector<span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="inspector"
                  value={formData.inspector}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* --- Measurement Section --- */}
          <div className="form-section">
            <div className="section-header">
              <h3>📏 การวัดขนาดและคุณภาพ</h3>
              <div className="section-divider"></div>
            </div>
            {formData.material_type === "bar" && (
              <div className="bars-container">
                {formData.barInspections.map((bar, index) => (
                  <div key={index} className="bar-inspection-card">
                    <div className="bar-header">
                      <h4 className="bar-title">📏 เส้นที่ {bar.barNumber}</h4>
                    </div>
                    <div className="bar-measurements">
                      <div className="measurement-group">
                        <label>OD (mm)</label>
                        <input
                          type="number"
                          name="odMeasurement"
                          value={bar.odMeasurement}
                          onChange={(e) => handleBarInputChange(index, e)}
                          step="0.01"
                        />
                      </div>
                      <div className="measurement-group">
                        <label>Length (mm)</label>
                        <input
                          type="number"
                          name="lengthMeasurement"
                          value={bar.lengthMeasurement}
                          onChange={(e) => handleBarInputChange(index, e)}
                        />
                      </div>
                      <div className="measurement-group">
                        <label>สภาพผิว</label>
                        <select
                          name="surfaceCondition"
                          value={bar.surfaceCondition}
                          onChange={(e) => handleBarInputChange(index, e)}
                        >
                          <option value="excellent">ดีเยี่ยม</option>
                          <option value="good">ดี</option>
                          <option value="fair">พอใช้</option>
                          <option value="poor">ไม่ดี</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {formData.material_type === "rod" && (
              <div className="rods-container">
                {formData.rodInspections.map((rod, index) => (
                  <div key={index} className="bar-inspection-card">
                    <div className="bar-header">
                      <h4 className="bar-title">📏 ท่อนที่ {rod.rodNumber}</h4>
                    </div>
                    <div className="rod-inspection-grid">
                      <div className="form-group">
                        <label>OD (mm)</label>
                        <input
                          type="number"
                          name="diameter"
                          value={rod.diameter}
                          onChange={(e) => handleRodInputChange(index, e)}
                          step="0.01"
                        />
                      </div>
                      <div className="form-group">
                        <label>Length (mm)</label>
                        <input
                          type="number"
                          name="length"
                          value={rod.length}
                          onChange={(e) => handleRodInputChange(index, e)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Weight (kg)</label>
                        <input
                          type="number"
                          name="weight"
                          value={rod.weight}
                          onChange={(e) => handleRodInputChange(index, e)}
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!formData.material_type && (
              <div className="warning-box">
                <p>กรุณาเลือกประเภทเหล็กก่อน</p>
              </div>
            )}
          </div>

          {/* --- File Upload Section --- */}
          {!isEditing && (
            <div className="form-section">
              <div className="section-header">
                <h3>📎 เอกสารแนบ</h3>
                <div className="section-divider"></div>
              </div>
              <div className="upload-group">
                <label className="form-label">📷 รูปภาพ</label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleFileUpload(e, "attached_images")}
                />
                {formData.attached_images.length > 0 && (
                  <div>{formData.attached_images.length} รูปภาพที่เลือก</div>
                )}
              </div>
              <div className="upload-group">
                <label className="form-label">📄 ไฟล์ PDF</label>
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  onChange={(e) => handleFileUpload(e, "attached_files")}
                />
                {formData.attached_files.length > 0 && (
                  <div>{formData.attached_files.length} ไฟล์ที่เลือก</div>
                )}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              ยกเลิก
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "กำลังบันทึก..." : "บันทึก"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InspectionFormModal;
