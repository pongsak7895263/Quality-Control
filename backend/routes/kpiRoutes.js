/**
 * routes/kpiRoutes.js
 * ====================
 * API Routes สำหรับ KPI Good/Scrap Management
 * 
 * ┌──────────────────────────────────────────────────────────┐
 * │ METHOD │ ENDPOINT                      │ DESCRIPTION     │
 * ├──────────────────────────────────────────────────────────┤
 * │ GET    │ /api/kpi/dashboard            │ Dashboard data  │
 * │ GET    │ /api/kpi/values               │ KPI values      │
 * │ GET    │ /api/kpi/trends               │ Trend data      │
 * │ GET    │ /api/kpi/pareto               │ Pareto analysis │
 * │ GET    │ /api/kpi/master               │ Master data     │
 * │        │                               │                 │
 * │ POST   │ /api/kpi/entries              │ Create entry    │
 * │ GET    │ /api/kpi/entries              │ List entries    │
 * │        │                               │                 │
 * │ GET    │ /api/kpi/andon                │ Andon alerts    │
 * │ PATCH  │ /api/kpi/andon/:id/acknowledge│ Ack alert       │
 * │ PATCH  │ /api/kpi/andon/:id/resolve    │ Resolve alert   │
 * │        │                               │                 │
 * │ GET    │ /api/kpi/machines/status       │ Machine status  │
 * │        │                               │                 │
 * │ POST   │ /api/kpi/claims               │ Create claim    │
 * │ GET    │ /api/kpi/claims               │ List claims     │
 * │        │                               │                 │
 * │ POST   │ /api/kpi/actions              │ Create action   │
 * │ GET    │ /api/kpi/actions              │ List actions    │
 * └──────────────────────────────────────────────────────────┘
 */

const express = require('express');
const router = express.Router();
const kpi = require('../controllers/kpiController');
const prod = require('../controllers/kpiProductionController');

// ─── Dashboard & KPI Values ─────────────────────────────────
router.get('/dashboard',       kpi.getDashboard);
router.get('/values',          kpi.getKpiValues);
router.get('/trends',          kpi.getTrends);
router.get('/pareto',          kpi.getPareto);
router.get('/master',          kpi.getMasterData);

// ─── Production (ระบบบันทึกผลผลิต + รายงาน) ✅ NEW ──────────
router.post('/production',         prod.createProduction);
router.get('/production/report',   prod.getReport);
router.get('/production/export',   prod.exportReport);

// ─── Inspection Entries ─────────────────────────────────────
router.post('/entries',        kpi.createEntry);
router.get('/entries',         kpi.getEntries);

// ─── Andon Alerts ───────────────────────────────────────────
router.get('/andon',                    kpi.getAndonAlerts);
router.patch('/andon/:id/acknowledge',  kpi.acknowledgeAlert);
router.patch('/andon/:id/resolve',      kpi.resolveAlert);

// ─── Machine Status ─────────────────────────────────────────
router.get('/machines/status', kpi.getMachineStatus);

// ─── Customer Claims ────────────────────────────────────────
router.post('/claims',         kpi.createClaim);
router.patch('/claims/:id',    kpi.updateClaim);
router.get('/claims',          kpi.getClaims);

// ─── Action Plans ───────────────────────────────────────────
router.post('/actions',        kpi.createActionPlan);
router.get('/actions',         kpi.getActionPlans);

// ─── Part Master Management ✅ NEW ──────────────────────────
const parts = require('../controllers/partMasterController');
router.get('/parts',                parts.listParts);
router.get('/parts/lookup/:partNumber', parts.lookupPart);
router.get('/parts/:id',           parts.getPart);
router.post('/parts',              parts.createPart);
router.patch('/parts/:id',         parts.updatePart);
router.delete('/parts/:id',        parts.deletePart);

// ─── Edit / แก้ไขข้อมูล ✅ NEW ─────────────────────────────
const edit = require('../controllers/kpiEditController');
router.get('/edit/production',         edit.listProduction);
router.get('/edit/production/:id',     edit.getProduction);
router.patch('/edit/production/:id',   edit.updateProduction);
router.delete('/edit/production/:id',  edit.deleteProduction);
router.patch('/edit/defect/:id',       edit.updateDefect);
router.delete('/edit/defect/:id',      edit.deleteDefect);

// ─── Export / Report (PDF, Excel, JSON) ✅ NEW ─────────────
const exportCtrl = require('../controllers/kpiExportController');
router.get('/export/pdf',      exportCtrl.exportPDF);
router.get('/export/excel',    exportCtrl.exportExcel);
router.get('/export/data',     exportCtrl.exportData);

module.exports = router;