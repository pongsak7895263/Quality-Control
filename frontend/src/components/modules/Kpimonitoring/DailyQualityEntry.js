// src/components/modules/Kpimonitoring/DailyQualityEntry.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { calculatePPM, calculatePercent } from '../../../utils/calculations';

const DailyQualityEntry = () => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [formData, setFormData] = useState({
        log_date: new Date().toISOString().split('T')[0],
        product_id: '',
        total_produced: 0,
        total_shipped: 0,
        rework_qty: 0,
        scrap_qty: 0,
        claim_qty: 0
    });

    useEffect(() => {
        // ดึงรายชื่อสินค้าที่ลงทะเบียนไว้พร้อมเป้าหมาย KPI
        api.get('/kpi/products').then(res => setProducts(res.data));
    }, []);

    const handleProductChange = (e) => {
        const prodId = e.target.value;
        const prod = products.find(p => p.product_id === parseInt(prodId));
        setSelectedProduct(prod);
        setFormData({ ...formData, product_id: prodId });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/kpi/daily-logs', formData);
            alert('บันทึกข้อมูลคุณภาพรายวันสำเร็จ');
            // รีเซ็ตยอด แต่คงวันที่และเครื่องจักรไว้เพื่อความต่อเนื่อง
            setFormData({ ...formData, total_produced: 0, total_shipped: 0, rework_qty: 0, scrap_qty: 0, claim_qty: 0 });
        } catch (err) {
            console.error("Save error:", err);
        }
    };

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold mb-6 text-blue-900">บันทึกข้อมูลคุณภาพรายวัน (Daily Quality Record)</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ฝั่ง Form กรอกข้อมูล */}
                <form onSubmit={handleSubmit} className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">วันที่ผลิต</label>
                            <input type="date" className="mt-1 block w-full border rounded-md p-2" 
                                value={formData.log_date} onChange={e => setFormData({...formData, log_date: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">เลือกผลิตภัณฑ์</label>
                            <select className="mt-1 block w-full border rounded-md p-2" 
                                onChange={handleProductChange} required>
                                <option value="">-- ค้นหาสินค้า / Part Number --</option>
                                {products.map(p => (
                                    <option key={p.product_id} value={p.product_id}>{p.product_code} - {p.product_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t pt-4">
                        <div className="bg-blue-50 p-3 rounded-lg">
                            <label className="text-xs font-bold text-blue-800 uppercase">ยอดผลิตรวม (Produced)</label>
                            <input type="number" className="w-full text-lg font-bold p-1 bg-transparent border-b border-blue-200"
                                value={formData.total_produced} onChange={e => setFormData({...formData, total_produced: e.target.value})} />
                        </div>
                        <div className="bg-green-50 p-3 rounded-lg">
                            <label className="text-xs font-bold text-green-800 uppercase">ยอดส่งออก (Shipped)</label>
                            <input type="number" className="w-full text-lg font-bold p-1 bg-transparent border-b border-green-200"
                                value={formData.total_shipped} onChange={e => setFormData({...formData, total_shipped: e.target.value})} />
                        </div>
                        <div className="bg-red-50 p-3 rounded-lg">
                            <label className="text-xs font-bold text-red-800 uppercase">ของเสีย (Scrap)</label>
                            <input type="number" className="w-full text-lg font-bold p-1 bg-transparent border-b border-red-200"
                                value={formData.scrap_qty} onChange={e => setFormData({...formData, scrap_qty: e.target.value})} />
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-lg">
                            <label className="text-xs font-bold text-yellow-800 uppercase">งานซ่อม (Rework)</label>
                            <input type="number" className="w-full text-lg font-bold p-1 bg-transparent border-b border-yellow-200"
                                value={formData.rework_qty} onChange={e => setFormData({...formData, rework_qty: e.target.value})} />
                        </div>
                        <div className="bg-purple-50 p-3 rounded-lg">
                            <label className="text-xs font-bold text-purple-800 uppercase">งานเคลม (Customer Claim)</label>
                            <input type="number" className="w-full text-lg font-bold p-1 bg-transparent border-b border-purple-200"
                                value={formData.claim_qty} onChange={e => setFormData({...formData, claim_qty: e.target.value})} />
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800 shadow-lg">
                        บันทึกข้อมูลประจำวัน
                    </button>
                </form>

                {/* ฝั่งสรุปเป้าหมาย (KPI Live Preview) */}
                <div className="bg-gray-50 p-6 rounded-xl border-2 border-dashed border-gray-200">
                    <h3 className="text-lg font-bold text-gray-600 mb-4 text-center">Live Preview vs Targets</h3>
                    {selectedProduct ? (
                        <div className="space-y-6">
                            <div className="text-center pb-4 border-b">
                                <p className="text-sm text-gray-500">ประเภทงาน</p>
                                <p className="font-bold text-lg text-blue-600">{selectedProduct.category_name}</p>
                            </div>
                            <KPIIndicator 
                                label="Current PPM" 
                                value={calculatePPM(formData.claim_qty, formData.total_shipped)} 
                                target={selectedProduct.ppm_target} 
                            />
                            <KPIIndicator 
                                label="Rework %" 
                                value={calculatePercent(formData.rework_qty, formData.total_produced)} 
                                target={selectedProduct.rework_target_percent} 
                                isPercent 
                            />
                            <KPIIndicator 
                                label="Scrap %" 
                                value={calculatePercent(formData.scrap_qty, formData.total_produced)} 
                                target={selectedProduct.scrap_target_percent} 
                                isPercent 
                            />
                        </div>
                    ) : (
                        <p className="text-center text-gray-400 mt-10 italic">เลือกผลิตภัณฑ์เพื่อดูการเปรียบเทียบกับเป้าหมาย</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// Component ย่อยแสดงผลสถานะ KPI
const KPIIndicator = ({ label, value, target, isPercent }) => {
    const isExceeded = parseFloat(value) > parseFloat(target);
    return (
        <div className="flex justify-between items-center">
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase">{label}</p>
                <p className={`text-xl font-black ${isExceeded ? 'text-red-600' : 'text-green-600'}`}>
                    {value}{isPercent ? '%' : ''}
                </p>
            </div>
            <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Target</p>
                <p className="text-sm font-bold text-gray-700">{target}{isPercent ? '%' : ' PPM'}</p>
            </div>
        </div>
    );
};

export default DailyQualityEntry;