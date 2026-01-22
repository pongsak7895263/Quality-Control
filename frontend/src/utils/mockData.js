// utils/mockData.js
// Mock data และ JIS Standards สำหรับระบบ

// JIS Standards สำหรับการทดสอบทางเคมี
export const JIS_STANDARDS = {
    G4051: {
      name: 'S45C',
      description: 'Carbon steels for machine structural use',
      chemicalLimits: {
        carbon: { max: 0.60 },
        silicon: { max: 0.35 },
        manganese: { max: 1.35 },
        phosphorus: { max: 0.040 },
        sulfur: { max: 0.040 },
        chromium: { max: 0.25 },
        nickel: { max: 0.25 },
        molybdenum: { max: 0.08 },
        copper: { max: 0.25 },
        aluminum: { max: 0.050 }
      }
    },
    G4052: {
      name: 'SCM415',
      description: 'Alloy steels for machine structural use',
      chemicalLimits: {
        carbon: { min: 0.10, max: 0.60 },
        silicon: { max: 0.60 },
        manganese: { max: 1.50 },
        phosphorus: { max: 0.030 },
        sulfur: { max: 0.030 },
        chromium: { max: 3.50 },
        nickel: { max: 3.50 },
        molybdenum: { max: 1.20 },
        copper: { max: 0.30 },
        aluminum: { max: 0.050 },
        vanadium: { max: 0.30 },
        titanium: { max: 0.050 }
      }
    },
    G4053: {
      name: 'JIS G4053',
      description: 'Stainless steels',
      chemicalLimits: {
        carbon: { max: 0.15 },
        silicon: { max: 1.00 },
        manganese: { max: 2.00 },
        phosphorus: { max: 0.045 },
        sulfur: { max: 0.030 },
        chromium: { min: 10.50, max: 30.00 },
        nickel: { max: 22.00 },
        molybdenum: { max: 6.00 },
        nitrogen: { max: 0.25 },
        titanium: { max: 0.70 },
        niobium: { max: 1.00 }
      }
    }
  };
  
  // Steel Grades ตามมาตรฐาน JIS
  export const STEEL_GRADES = {
    G4051: [
      'S10C', 'S15C', 'S20C', 'S25C', 'S30C', 'S35C', 'S40C', 'S45C', 'S50C', 'S55C',
      'S15CK', 'S20CK', 'S25CK', 'S30CK', 'S35CK', 'S40CK', 'S45CK', 'S50CK', 'S55CK'
    ],
    G4052: [
      'SCr415', 'SCr420', 'SCr440', 'SCM415', 'SCM420', 'SCM435', 'SCM440',
      'SNC415', 'SNC815', 'SNCM220', 'SNCM415', 'SNCM420', 'SNCM439', 'SNCM815'
    ],
    G4053: [
      'SUS304', 'SUS316', 'SUS316L', 'SUS310S', 'SUS321', 'SUS347',
      'SUS430', 'SUS410', 'SUS420J2', 'SUS440C'
    ]
  };
  
  // Suppliers list
  export const SUPPLIERS = [
    'บริษัท เหล็กกล้าไทย จำกัด',
    'บริษัท ไทยสตีล จำกัด',
    'บริษัท เอ็นเค เสตอเรจ จำกัด',
    'บริษัท สยามยามาโตะ สตีล จำกัด',
    'บริษัท ไทยคาวาซากิ สตีล จำกัด',
    'บริษัท จี สตีล จำกัด (มหาชน)',
    'บริษัท ทาอิชิ เอสเทค จำกัด',
    'บริษัท เจเอฟอี สตีล จำกัด'
  ];
  
  // Mock Material Inspections
  export const MOCK_MATERIAL_INSPECTIONS = [
    {
      id: 1,
      inspectionId: 'MAT-2025-001',
      receivedDate: '2025-01-15',
      approvalDate: '2025-01-16',
      lotNumber: 'LOT2501001',
      heatNumber: 'HT250115A',
      supplier: 'บริษัท เหล็กกล้าไทย จำกัด',
      materialType: 'steel_pipe',
      grade: 'SCM440',
      certificationNumber: 'CERT-2025-001',
      outerDiameter: '25.4',
      length: '6000',
      quantity: '100',
      samplesInspected: 4,
      measurementTool: 'vernier',
      measuringTape: true,
      dimensionalCheck: {
        odMeasurements: ['25.38', '25.41', '25.39', '25.40'],
        lengthMeasurements: ['5998', '6001', '5999', '6000'],
        results: 'pass'
      },
      visualInspection: {
        generalAppearance: 'good',
        noCracks: true,
        noFissures: true,
        packaging: 'good',
        notes: 'ผ่านการตรวจสอบเรียบร้อย'
      },
      status: 'approved',
      inspectedBy: 'นาย สมชาย ใจดี',
      approvedBy: 'นาง สุมาลี อนุรักษ์',
      remarks: 'คุณภาพดี ผ่านมาตรฐาน',
      qrCode: 'data:image/png;base64,mock-qr-code-1',
      lastModified: '2025-01-16T10:30:00Z'
    },
    {
      id: 2,
      inspectionId: 'MAT-2025-002',
      receivedDate: '2025-01-16',
      approvalDate: '',
      lotNumber: 'LOT2501002',
      heatNumber: 'HT250116B',
      supplier: 'บริษัท ไทยสตีล จำกัด',
      materialType: 'steel_bar',
      grade: 'S45C',
      certificationNumber: 'CERT-2025-002',
      outerDiameter: '16.0',
      length: '4000',
      quantity: '200',
      samplesInspected: 4,
      measurementTool: 'micrometer',
      measuringTape: false,
      dimensionalCheck: {
        odMeasurements: ['15.98', '16.01', '15.99', '16.00'],
        lengthMeasurements: ['3998', '4001', '3999', '4002'],
        results: 'pending'
      },
      visualInspection: {
        generalAppearance: 'good',
        noCracks: true,
        noFissures: true,
        packaging: 'good',
        notes: ''
      },
      status: 'pending',
      inspectedBy: 'นาง วิมลพร สุขใส',
      approvedBy: '',
      remarks: '',
      qrCode: 'data:image/png;base64,mock-qr-code-2',
      lastModified: '2025-01-16T14:20:00Z'
    }
  ];
  
  // Mock Chemical Tests
  export const MOCK_CHEMICAL_TESTS = [
    {
      id: 1,
      testId: 'CHM-2025-001',
      testDate: '2025-01-15',
      lotNumber: 'LOT2501001',
      heatNumber: 'HT250115A',
      grade: 'SCM440',
      jisStandard: 'G4052',
      outerDiameter: '25.4',
      sampleCount: 1,
      certificationNumber: 'CERT-2025-001',
      supplier: 'บริษัท เหล็กกล้าไทย จำกัด',
      chemicalComposition: {
        carbon: '0.38',
        silicon: '0.28',
        manganese: '0.85',
        phosphorus: '0.018',
        sulfur: '0.012',
        chromium: '1.05',
        nickel: '0.08',
        molybdenum: '0.18',
        copper: '0.12',
        aluminum: '0.025',
        vanadium: '',
        titanium: '',
        boron: '',
        tin: '',
        arsenic: '',
        lead: '',
        antimony: '',
        nitrogen: ''
      },
      testResults: {
        conformsToStandard: true,
        deviations: [],
        notes: 'ผลการทดสอบเป็นไปตามมาตรฐาน JIS G4052'
      },
      status: 'approved',
      testedBy: 'นาย ประสิทธิ์ วิทยาการ',
      verifiedBy: 'ดร. อนุชา รักษาคุณ',
      approvedBy: 'นาง สุมาลี อนุรักษ์',
      approvalDate: '2025-01-16',
      remarks: 'ผ่านการทดสอบตามมาตรฐาน',
      qrCode: 'data:image/png;base64,mock-qr-code-chem-1',
      lastModified: '2025-01-16T11:00:00Z'
    },
    {
      id: 2,
      testId: 'CHM-2025-002',
      testDate: '2025-01-16',
      lotNumber: 'LOT2501002',
      heatNumber: 'HT250116B',
      grade: 'S45C',
      jisStandard: 'G4051',
      outerDiameter: '16.0',
      sampleCount: 1,
      certificationNumber: 'CERT-2025-002',
      supplier: 'บริษัท ไทยสตีล จำกัด',
      chemicalComposition: {
        carbon: '0.45',
        silicon: '0.22',
        manganese: '0.75',
        phosphorus: '0.025',
        sulfur: '0.018',
        chromium: '0.15',
        nickel: '0.12',
        molybdenum: '',
        copper: '0.18',
        aluminum: '0.035',
        vanadium: '',
        titanium: '',
        boron: '',
        tin: '',
        arsenic: '',
        lead: '',
        antimony: '',
        nitrogen: ''
      },
      testResults: {
        conformsToStandard: null,
        deviations: [],
        notes: ''
      },
      status: 'completed',
      testedBy: 'นาง ปริยา วิเคราะห์',
      verifiedBy: '',
      approvedBy: '',
      approvalDate: '',
      remarks: '',
      qrCode: 'data:image/png;base64,mock-qr-code-chem-2',
      lastModified: '2025-01-16T16:30:00Z'
    }
  ];
  
  // Test Equipment และ Tools
  export const MEASUREMENT_TOOLS = [
    { value: 'vernier', label: 'เวอร์เนียร์', accuracy: '±0.02 mm' },
    { value: 'micrometer', label: 'ไมโครมิเตอร์', accuracy: '±0.01 mm' },
    { value: 'gauge', label: 'เกจวัด', accuracy: '±0.005 mm' },
    { value: 'dial_gauge', label: 'ไดอัลเกจ', accuracy: '±0.01 mm' },
    { value: 'height_gauge', label: 'ไฮท์เกจ', accuracy: '±0.02 mm' }
  ];
  
  // Chemical Analysis Equipment
  export const CHEMICAL_ANALYSIS_EQUIPMENT = [
    { value: 'xrf', label: 'XRF Spectrometer', model: 'Bruker EDS' },
    { value: 'oes', label: 'Optical Emission Spectrometer', model: 'SPECTRO MAXx' },
    { value: 'carbon_sulfur', label: 'Carbon Sulfur Analyzer', model: 'LECO CS844' },
    { value: 'nitrogen_oxygen', label: 'Nitrogen Oxygen Analyzer', model: 'LECO ONH836' }
  ];
  
  // Quality Control Standards
  export const QC_STANDARDS = {
    dimensional: {
      tolerance: {
        od_class_1: '±0.1 mm',
        od_class_2: '±0.2 mm',
        length_class_1: '±5 mm',
        length_class_2: '±10 mm'
      },
      measurement_uncertainty: '±0.05 mm'
    },
    visual: {
      surface_finish: ['Ra 3.2', 'Ra 6.3', 'Ra 12.5'],
      defect_acceptance: {
        scratches: 'Max depth 0.5mm',
        dents: 'Max depth 1.0mm',
        discoloration: 'Light discoloration acceptable'
      }
    },
    chemical: {
      sample_preparation: 'According to JIS Z2615',
      test_methods: {
        carbon: 'Combustion method',
        other_elements: 'Optical emission spectrometry'
      }
    }
  };
  
  // User Roles และ Permissions
  export const USER_ROLES = {
    inspector: {
      name: 'ผู้ตรวจสอบ',
      permissions: {
        canInspect: true,
        canCreateTests: true,
        canEditOwnTests: true,
        canApprove: false,
        canExport: false,
        canViewReports: true
      }
    },
    supervisor: {
      name: 'หัวหน้างาน',
      permissions: {
        canInspect: true,
        canCreateTests: true,
        canEditAllTests: true,
        canApprove: true,
        canExport: true,
        canViewReports: true,
        canManageUsers: false
      }
    },
    admin: {
      name: 'ผู้ดูแลระบบ',
      permissions: {
        canInspect: true,
        canCreateTests: true,
        canEditAllTests: true,
        canApprove: true,
        canExport: true,
        canViewReports: true,
        canManageUsers: true,
        canManageSystem: true
      }
    }
  };
  
  // Status ต่างๆ ในระบบ
  export const STATUS_OPTIONS = {
    material_inspection: [
      { value: 'pending', label: 'รอตรวจสอบ', color: '#FF9800' },
      { value: 'approved', label: 'อนุมัติแล้ว', color: '#4CAF50' },
      { value: 'rejected', label: 'ไม่อนุมัติ', color: '#F44336' }
    ],
    chemical_test: [
      { value: 'pending', label: 'รอผลทดสอบ', color: '#FF9800' },
      { value: 'completed', label: 'เสร็จสิ้น', color: '#2196F3' },
      { value: 'approved', label: 'อนุมัติแล้ว', color: '#4CAF50' },
      { value: 'rejected', label: 'ไม่อนุมัติ', color: '#F44336' }
    ]
  };
  
  // Report Templates
  export const REPORT_TEMPLATES = {
    material_inspection: {
      title: 'ใบตรวจรับวัตถุดิบ',
      sections: [
        'basic_info',
        'dimensional_check',
        'visual_inspection',
        'approval'
      ]
    },
    chemical_test: {
      title: 'รายงานการทดสอบทางเคมี',
      sections: [
        'test_info',
        'chemical_composition',
        'test_results',
        'verification_approval'
      ]
    }
  };
  
  // Dashboard Configuration
  export const DASHBOARD_CONFIG = {
    refreshInterval: 30000, // 30 seconds
    charts: {
      approvalRate: {
        type: 'doughnut',
        colors: ['#4CAF50', '#FF9800', '#F44336']
      },
      monthlyTrend: {
        type: 'line',
        colors: ['#2196F3', '#4CAF50']
      }
    },
    kpis: [
      'total_inspections',
      'approval_rate',
      'pending_approvals',
      'monthly_growth'
    ]
  };
  
  // Export all mock data for easy import
  export const MOCK_DATA = {
    materialInspections: MOCK_MATERIAL_INSPECTIONS,
    chemicalTests: MOCK_CHEMICAL_TESTS,
    jisStandards: JIS_STANDARDS,
    steelGrades: STEEL_GRADES,
    suppliers: SUPPLIERS,
    measurementTools: MEASUREMENT_TOOLS,
    chemicalAnalysisEquipment: CHEMICAL_ANALYSIS_EQUIPMENT,
    qcStandards: QC_STANDARDS,
    userRoles: USER_ROLES,
    statusOptions: STATUS_OPTIONS,
    reportTemplates: REPORT_TEMPLATES,
    dashboardConfig: DASHBOARD_CONFIG
  };