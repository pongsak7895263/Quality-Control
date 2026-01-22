// src/components/inspections/SpecTests/VisualInspection.js
import React, { useState, useEffect } from 'react';
import useAuth from '../../../hooks/useAuth';
import './VisualInspection.css';

const VisualInspection = ({ materialData, onSave, onClose }) => {
  const { user } = useAuth();
  
  const [inspectionData, setInspectionData] = useState({
    // ข้อมูลพื้นฐาน
    materialId: materialData?.id || '',
    materialType: materialData?.materialType || '',
    lotNumber: materialData?.lotNumber || '',
    supplier: materialData?.supplier || '',
    inspectionDate: new Date().toISOString().split('T')[0],
    inspector: user.fullName,
    
    // การตรวจสอบภาพลักษณ์ภายนอก
    externalAppearance: {
      surfaceCondition: '',
      colorUniformity: '',
      coatingCondition: '',
      scratches: 'none',
      dents: 'none',
      corrosion: 'none'
    },
    
    // การตรวจสอบขนาดและรูปร่าง
    dimensionCheck: {
      straightness: '',
      uniformity: '',
      deformation: 'none',
      bending: 'none'
    },
    
    // การตรวจสอบรอยแตกและข้อบกพร่อง
    defectInspection: {
      cracks: 'none',
      voids: 'none',
      inclusions: 'none',
      segregation: 'none',
      porosity: 'none'
    },
    
    // การตรวจสอบการบรรจุและการจัดเก็บ
    packagingInspection: {
      packaging: '',
      labeling: '',
      storage: '',
      handling: ''
    },
    
    // การตรวจสอบเอกสารประกอบ
    documentInspection: {
      certificate: '',
      testReports: '',
      specifications: '',
      traceability: ''
    },
    
    // การประเมินโดยรวม
    overallAssessment: {
      qualityGrade: '',
      acceptability: '',
      recommendations: '',
      remarks: ''
    },
    
    // ภาพถ่ายประกอบ (URLs)
    photos: [],
    
    // ผลการตรวจสอบ
    result: 'pending',
    inspectionStandard: 'JIS',
    environmentalConditions: {
      temperature: '',
      humidity: '',
      lighting: 'adequate'
    }
  });

  const [errors, setErrors] = useState({});
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    if (materialData) {
      setInspectionData(prev => ({
        ...prev,
        materialId: materialData.id,
        materialType: materialData.materialType,
        lotNumber: materialData.lotNumber,
        supplier: materialData.supplier
      }));
    }
  }, [materialData]);

  const handleInputChange = (section, field, value) => {
    setInspectionData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    
    // ลบ error เมื่อผู้ใช้แก้ไข
    if (errors[`${section}.${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: undefined
      }));
    }
  };

  const handleDirectChange = (field, value) => {
    setInspectionData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newPhoto = {
            id: Date.now() + Math.random(),
            url: e.target.result,
            name: file.name,
            description: '',
            timestamp: new Date().toISOString()
          };
          
          setPhotos(prev => [...prev, newPhoto]);
          setInspectionData(prev => ({
            ...prev,
            photos: [...prev.photos, newPhoto]
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
    setInspectionData(prev => ({
      ...prev,
      photos: prev.photos.filter(photo => photo.id !== photoId)
    }));
  };

  const updatePhotoDescription = (photoId, description) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId ? { ...photo, description } : photo
    ));
    setInspectionData(prev => ({
      ...prev,
      photos: prev.photos.map(photo => 
        photo.id === photoId ? { ...photo, description } : photo
      )
    }));
  };

  const calculateOverallResult = () => {
    const { externalAppearance, dimensionCheck, defectInspection, overallAssessment } = inspectionData;
    
    // ตรวจสอบข้อบกพร่องที่สำคัญ
    const criticalDefects = [
      defectInspection.cracks !== 'none',
      defectInspection.voids !== 'none',
      externalAppearance.corrosion !== 'none'
    ];
    
    if (criticalDefects.some(defect => defect)) {
      return 'ไม่ผ่าน';
    }
    
    // ประเมินคุณภาพโดยรวม
    const qualityFactors = [
      externalAppearance.surfaceCondition === 'excellent' || externalAppearance.surfaceCondition === 'good',
      dimensionCheck.straightness === 'excellent' || dimensionCheck.straightness === 'good',
      overallAssessment.acceptability === 'acceptable' || overallAssessment.acceptability === 'good'
    ];
    
    const passCount = qualityFactors.filter(factor => factor).length;
    
    if (passCount >= 2) {
      return 'ผ่าน';
    } else {
      return 'ต้องตรวจสอบเพิ่มเติม';
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!inspectionData.inspector) {
      newErrors.inspector = 'กรุณาระบุชื่อผู้ตรวจสอบ';
    }
    
    if (!inspectionData.inspectionDate) {
      newErrors.inspectionDate = 'กรุณาเลือกวันที่ตรวจสอบ';
    }
    
    // ตรวจสอบการกรอกข้อมูลที่สำคัญ
    if (!inspectionData.externalAppearance.surfaceCondition) {
      newErrors['externalAppearance.surfaceCondition'] = 'กรุณาประเมินสภาพผิวหน้า';
    }
    
    if (!inspectionData.dimensionCheck.straightness) {
      newErrors['dimensionCheck.straightness'] = 'กรุณาประเมินความตรง';
    }
    
    if (!inspectionData.overallAssessment.acceptability) {
      newErrors['overallAssessment.acceptability'] = 'กรุณาประเมินความเหมาะสม';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const finalResult = calculateOverallResult();
    const finalData = {
      ...inspectionData,
      result: finalResult,
      completedAt: new Date().toISOString()
    };
    
    onSave(finalData);
  };

  return (
    <div className="visual-inspection">
      <div className="inspection-header">
        <h2>การตรวจสอบภาพลักษณ์ทั่วไป (Visual Inspection)</h2>
        <p>การตรวจสอบด้วยสายตาตามมาตรฐาน JIS</p>
      </div>

      <form onSubmit={handleSubmit} className="inspection-form">
        
        {/* ข้อมูลพื้นฐาน */}
        <div className="form-section">
          <h3>ข้อมูลพื้นฐาน</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>ประเภทวัตถุดิบ</label>
              <input
                type="text"
                value={inspectionData.materialType}
                readOnly
                className="readonly"
              />
            </div>
            
            <div className="form-group">
              <label>หมายเลข Lot</label>
              <input
                type="text"
                value={inspectionData.lotNumber}
                readOnly
                className="readonly"
              />
            </div>
            
            <div className="form-group">
              <label>ผู้จำหน่าย</label>
              <input
                type="text"
                value={inspectionData.supplier}
                readOnly
                className="readonly"
              />
            </div>
            
            <div className="form-group">
              <label>วันที่ตรวจสอบ *</label>
              <input
                type="date"
                value={inspectionData.inspectionDate}
                onChange={(e) => handleDirectChange('inspectionDate', e.target.value)}
                className={errors.inspectionDate ? 'error' : ''}
              />
              {errors.inspectionDate && <span className="error-text">{errors.inspectionDate}</span>}
            </div>
            
            <div className="form-group">
              <label>ผู้ตรวจสอบ *</label>
              <input
                type="text"
                value={inspectionData.inspector}
                onChange={(e) => handleDirectChange('inspector', e.target.value)}
                className={errors.inspector ? 'error' : ''}
              />
              {errors.inspector && <span className="error-text">{errors.inspector}</span>}
            </div>
            
            <div className="form-group">
              <label>มาตรฐานที่ใช้</label>
              <select
                value={inspectionData.inspectionStandard}
                onChange={(e) => handleDirectChange('inspectionStandard', e.target.value)}
              >
                <option value="JIS">JIS (Japanese Industrial Standards)</option>
                <option value="ASTM">ASTM International</option>
                <option value="ISO">ISO Standards</option>
                <option value="COMPANY">มาตรฐานบริษัท</option>
              </select>
            </div>
          </div>
        </div>

        {/* สภาพแวดล้อมการตรวจสอบ */}
        <div className="form-section">
          <h3>สภาพแวดล้อมการตรวจสอบ</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>อุณหภูมิ (°C)</label>
              <input
                type="number"
                value={inspectionData.environmentalConditions.temperature}
                onChange={(e) => handleInputChange('environmentalConditions', 'temperature', e.target.value)}
                placeholder="เช่น 25"
              />
            </div>
            
            <div className="form-group">
              <label>ความชื้น (%)</label>
              <input
                type="number"
                value={inspectionData.environmentalConditions.humidity}
                onChange={(e) => handleInputChange('environmentalConditions', 'humidity', e.target.value)}
                placeholder="เช่น 60"
              />
            </div>
            
            <div className="form-group">
              <label>แสงสว่าง</label>
              <select
                value={inspectionData.environmentalConditions.lighting}
                onChange={(e) => handleInputChange('environmentalConditions', 'lighting', e.target.value)}
              >
                <option value="excellent">ดีเยี่ยม</option>
                <option value="adequate">เพียงพอ</option>
                <option value="poor">ไม่เพียงพอ</option>
              </select>
            </div>
          </div>
        </div>

        {/* การตรวจสอบภาพลักษณ์ภายนอก */}
        <div className="form-section">
          <h3>การตรวจสอบภาพลักษณ์ภายนอก</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>สภาพผิวหน้า *</label>
              <select
                value={inspectionData.externalAppearance.surfaceCondition}
                onChange={(e) => handleInputChange('externalAppearance', 'surfaceCondition', e.target.value)}
                className={errors['externalAppearance.surfaceCondition'] ? 'error' : ''}
              >
                <option value="">เลือกสภาพผิวหน้า</option>
                <option value="excellent">ดีเยี่ยม (ไม่มีรอยตำหนิ)</option>
                <option value="good">ดี (มีรอยตำหนิเล็กน้อย)</option>
                <option value="acceptable">ยอมรับได้ (มีรอยตำหนิบางส่วน)</option>
                <option value="poor">ไม่ดี (มีรอยตำหนิมาก)</option>
              </select>
              {errors['externalAppearance.surfaceCondition'] && 
                <span className="error-text">{errors['externalAppearance.surfaceCondition']}</span>}
            </div>
            
            <div className="form-group">
              <label>ความสม่ำเสมอของสี</label>
              <select
                value={inspectionData.externalAppearance.colorUniformity}
                onChange={(e) => handleInputChange('externalAppearance', 'colorUniformity', e.target.value)}
              >
                <option value="">เลือกความสม่ำเสมอ</option>
                <option value="uniform">สม่ำเสมอ</option>
                <option value="slight-variation">แตกต่างเล็กน้อย</option>
                <option value="noticeable-variation">แตกต่างเห็นได้ชัด</option>
                <option value="poor">ไม่สม่ำเสมอ</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>สภาพการชุบ/เคลือบ</label>
              <select
                value={inspectionData.externalAppearance.coatingCondition}
                onChange={(e) => handleInputChange('externalAppearance', 'coatingCondition', e.target.value)}
              >
                <option value="">เลือกสภาพการชุบ</option>
                <option value="excellent">ดีเยี่ยม</option>
                <option value="good">ดี</option>
                <option value="acceptable">ยอมรับได้</option>
                <option value="poor">ไม่ดี</option>
                <option value="none">ไม่มีการชุบ</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>รอยขีดข่วน</label>
              <select
                value={inspectionData.externalAppearance.scratches}
                onChange={(e) => handleInputChange('externalAppearance', 'scratches', e.target.value)}
              >
                <option value="none">ไม่มี</option>
                <option value="minor">เล็กน้อย</option>
                <option value="moderate">ปานกลาง</option>
                <option value="severe">รุนแรง</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>รอยบุบ/รอยกด</label>
              <select
                value={inspectionData.externalAppearance.dents}
                onChange={(e) => handleInputChange('externalAppearance', 'dents', e.target.value)}
              >
                <option value="none">ไม่มี</option>
                <option value="minor">เล็กน้อย</option>
                <option value="moderate">ปานกลาง</option>
                <option value="severe">รุนแรง</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>สภาพการกัดกร่อน</label>
              <select
                value={inspectionData.externalAppearance.corrosion}
                onChange={(e) => handleInputChange('externalAppearance', 'corrosion', e.target.value)}
              >
                <option value="none">ไม่มี</option>
                <option value="surface">ผิวหน้าเท่านั้น</option>
                <option value="localized">บางจุด</option>
                <option value="extensive">กว้างขวาง</option>
              </select>
            </div>
          </div>
        </div>

        {/* การตรวจสอบขนาดและรูปร่าง */}
        <div className="form-section">
          <h3>การตรวจสอบขนาดและรูปร่าง</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>ความตรง *</label>
              <select
                value={inspectionData.dimensionCheck.straightness}
                onChange={(e) => handleInputChange('dimensionCheck', 'straightness', e.target.value)}
                className={errors['dimensionCheck.straightness'] ? 'error' : ''}
              >
                <option value="">เลือกความตรง</option>
                <option value="excellent">ตรงมาก</option>
                <option value="good">ตรงดี</option>
                <option value="acceptable">ยอมรับได้</option>
                <option value="poor">ไม่ตรง</option>
              </select>
              {errors['dimensionCheck.straightness'] && 
                <span className="error-text">{errors['dimensionCheck.straightness']}</span>}
            </div>
            
            <div className="form-group">
              <label>ความสม่ำเสมอของขนาด</label>
              <select
                value={inspectionData.dimensionCheck.uniformity}
                onChange={(e) => handleInputChange('dimensionCheck', 'uniformity', e.target.value)}
              >
                <option value="">เลือกความสม่ำเสมอ</option>
                <option value="excellent">สม่ำเสมอมาก</option>
                <option value="good">สม่ำเสมอดี</option>
                <option value="acceptable">ยอมรับได้</option>
                <option value="poor">ไม่สม่ำเสมอ</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>การผิดรูป</label>
              <select
                value={inspectionData.dimensionCheck.deformation}
                onChange={(e) => handleInputChange('dimensionCheck', 'deformation', e.target.value)}
              >
                <option value="none">ไม่มี</option>
                <option value="minor">เล็กน้อย</option>
                <option value="moderate">ปานกลาง</option>
                <option value="severe">รุนแรง</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>การโค้งงอ</label>
              <select
                value={inspectionData.dimensionCheck.bending}
                onChange={(e) => handleInputChange('dimensionCheck', 'bending', e.target.value)}
              >
                <option value="none">ไม่มี</option>
                <option value="slight">เล็กน้อย</option>
                <option value="moderate">ปานกลาง</option>
                <option value="severe">รุนแรง</option>
              </select>
            </div>
          </div>
        </div>

        {/* การตรวจสอบรอยแตกและข้อบกพร่อง */}
        <div className="form-section">
          <h3>การตรวจสอบรอยแตกและข้อบกพร่อง</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>รอยแตก</label>
              <select
                value={inspectionData.defectInspection.cracks}
                onChange={(e) => handleInputChange('defectInspection', 'cracks', e.target.value)}
              >
                <option value="none">ไม่พบ</option>
                <option value="micro">รอยแตกเล็ก</option>
                <option value="visible">รอยแตกเห็นได้</option>
                <option value="major">รอยแตกใหญ่</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>โพรงอากาศ</label>
              <select
                value={inspectionData.defectInspection.voids}
                onChange={(e) => handleInputChange('defectInspection', 'voids', e.target.value)}
              >
                <option value="none">ไม่พบ</option>
                <option value="minor">เล็กน้อย</option>
                <option value="moderate">ปานกลาง</option>
                <option value="extensive">มาก</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>สิ่งเจือปน</label>
              <select
                value={inspectionData.defectInspection.inclusions}
                onChange={(e) => handleInputChange('defectInspection', 'inclusions', e.target.value)}
              >
                <option value="none">ไม่พบ</option>
                <option value="minor">เล็กน้อย</option>
                <option value="moderate">ปานกลาง</option>
                <option value="extensive">มาก</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>การแยกชั้น</label>
              <select
                value={inspectionData.defectInspection.segregation}
                onChange={(e) => handleInputChange('defectInspection', 'segregation', e.target.value)}
              >
                <option value="none">ไม่พบ</option>
                <option value="slight">เล็กน้อย</option>
                <option value="moderate">ปานกลาง</option>
                <option value="severe">รุนแรง</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>ความพรุน</label>
              <select
                value={inspectionData.defectInspection.porosity}
                onChange={(e) => handleInputChange('defectInspection', 'porosity', e.target.value)}
              >
                <option value="none">ไม่พบ</option>
                <option value="low">ต่ำ</option>
                <option value="moderate">ปานกลาง</option>
                <option value="high">สูง</option>
              </select>
            </div>
          </div>
        </div>

        {/* การตรวจสอบการบรรจุและเอกสาร */}
        <div className="form-section">
          <h3>การตรวจสอบการบรรจุและเอกสาร</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>การบรรจุหีบห่อ</label>
              <select
                value={inspectionData.packagingInspection.packaging}
                onChange={(e) => handleInputChange('packagingInspection', 'packaging', e.target.value)}
              >
                <option value="">เลือกสภาพการบรรจุ</option>
                <option value="excellent">ดีเยี่ยม</option>
                <option value="good">ดี</option>
                <option value="acceptable">ยอมรับได้</option>
                <option value="poor">ไม่เหมาะสม</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>การติดป้ายฉลาก</label>
              <select
                value={inspectionData.packagingInspection.labeling}
                onChange={(e) => handleInputChange('packagingInspection', 'labeling', e.target.value)}
              >
                <option value="">เลือกสภาพฉลาก</option>
                <option value="complete">ครบถ้วน</option>
                <option value="incomplete">ไม่ครบถ้วน</option>
                <option value="unclear">ไม่ชัดเจน</option>
                <option value="missing">ไม่มี</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>ใบรับรองคุณภาพ</label>
              <select
                value={inspectionData.documentInspection.certificate}
                onChange={(e) => handleInputChange('documentInspection', 'certificate', e.target.value)}
              >
                <option value="">เลือกสถานะ</option>
                <option value="available">มี</option>
                <option value="incomplete">ไม่ครบถ้วน</option>
                <option value="missing">ไม่มี</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>รายงานการทดสอบ</label>
              <select
                value={inspectionData.documentInspection.testReports}
                onChange={(e) => handleInputChange('documentInspection', 'testReports', e.target.value)}
              >
                <option value="">เลือกสถานะ</option>
                <option value="available">มี</option>
                <option value="incomplete">ไม่ครบถ้วน</option>
                <option value="missing">ไม่มี</option>
              </select>
            </div>
          </div>
        </div>

        {/* การประเมินโดยรวม */}
        <div className="form-section">
          <h3>การประเมินโดยรวม</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>เกรดคุณภาพ</label>
              <select
                value={inspectionData.overallAssessment.qualityGrade}
                onChange={(e) => handleInputChange('overallAssessment', 'qualityGrade', e.target.value)}
              >
                <option value="">เลือกเกรด</option>
                <option value="A">A (ดีเยี่ยม - 90-100%)</option>
                <option value="B">B (ดี - 80-89%)</option>
                <option value="C">C (ยอมรับได้ - 70-79%)</option>
                <option value="D">D (ไม่ดี - &lt;70%)</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>ความเหมาะสมในการใช้งาน *</label>
              <select
                value={inspectionData.overallAssessment.acceptability}
                onChange={(e) => handleInputChange('overallAssessment', 'acceptability', e.target.value)}
                className={errors['overallAssessment.acceptability'] ? 'error' : ''}
              >
                <option value="">เลือกความเหมาะสม</option>
                <option value="acceptable">เหมาะสม</option>
                <option value="conditional">เหมาะสมแบบมีเงื่อนไข</option>
                <option value="not-acceptable">ไม่เหมาะสม</option>
              </select>
              {errors['overallAssessment.acceptability'] && 
                <span className="error-text">{errors['overallAssessment.acceptability']}</span>}
            </div>
          </div>
          
          <div className="form-group">
            <label>ข้อเสนอแนะ</label>
            <textarea
              value={inspectionData.overallAssessment.recommendations}
              onChange={(e) => handleInputChange('overallAssessment', 'recommendations', e.target.value)}
              rows={3}
              placeholder="ระบุข้อเสนอแนะหรือข้อควรระวัง..."
            />
          </div>
          
          <div className="form-group">
            <label>หมายเหตุเพิ่มเติม</label>
            <textarea
              value={inspectionData.overallAssessment.remarks}
              onChange={(e) => handleInputChange('overallAssessment', 'remarks', e.target.value)}
              rows={3}
              placeholder="ระบุหมายเหตุเพิ่มเติม..."
            />
          </div>
        </div>

        {/* การแนบภาพถ่าย */}
        <div className="form-section">
          <h3>ภาพถ่ายประกอบ</h3>
          
          <div className="photo-upload">
            <label className="upload-btn">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoUpload}
                style={{ display: 'none' }}
              />
              📷 เพิ่มรูปภาพ
            </label>
            <p className="upload-info">อัพโหลดรูปภาพประกอบการตรวจสอบ (PNG, JPG, JPEG)</p>
          </div>
          
          {photos.length > 0 && (
            <div className="photo-gallery">
              {photos.map(photo => (
                <div key={photo.id} className="photo-item">
                  <img src={photo.url} alt={photo.name} />
                  <div className="photo-controls">
                    <input
                      type="text"
                      placeholder="คำอธิบายภาพ..."
                      value={photo.description}
                      onChange={(e) => updatePhotoDescription(photo.id, e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => removePhoto(photo.id)}
                    >
                      ลบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ผลการประเมิน */}
        <div className="form-section">
          <h3>ผลการประเมิน</h3>
          <div className="result-display">
            <div className={`result-badge ${calculateOverallResult() === 'ผ่าน' ? 'pass' : 'fail'}`}>
              ผลการตรวจสอบ: {calculateOverallResult()}
            </div>
          </div>
        </div>

        {/* ปุ่มดำเนินการ */}
        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            ยกเลิก
          </button>
          <button type="submit" className="btn btn-primary">
            บันทึกผลการตรวจสอบ
          </button>
        </div>
      </form>
    </div>
  );
};

export default VisualInspection;