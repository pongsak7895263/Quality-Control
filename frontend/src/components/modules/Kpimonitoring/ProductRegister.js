// src/components/modules/Kpimonitoring/ProductRegister.jsx
import React, { useState, useEffect } from 'react';
import api from '../../../utils/api'; // ใช้ api utility ที่คุณมี

const ProductRegister = () => {
    const [categories, setCategories] = useState([]);
    const [formData, setFormData] = useState({
        product_code: '',
        product_name: '',
        category_id: '',
        description: ''
    });

    useEffect(() => {
        // ดึงข้อมูลกลุ่มเป้าหมายจาก Database
        api.get('/kpi/categories').then(res => setCategories(res.data));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/kpi/products', formData);
            alert('ลงทะเบียนผลิตภัณฑ์สำเร็จ');
            // Reset form หรือ Redirect
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-sm">
            <h3 className="text-xl font-bold mb-4 text-gray-800">ลงทะเบียนผลิตภัณฑ์ใหม่</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600">รหัสชิ้นส่วน (Part Code)</label>
                    <input 
                        className="border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                        value={formData.product_code}
                        onChange={(e) => setFormData({...formData, product_code: e.target.value})}
                        placeholder="เช่น AUTO-001"
                        required 
                    />
                </div>
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-600">ประเภทงาน (KPI Group)</label>
                    <select 
                        className="border p-2 rounded-md h-[42px]"
                        value={formData.category_id}
                        onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                        required
                    >
                        <option value="">เลือกกลุ่มเป้าหมาย...</option>
                        {categories.map(cat => (
                            <option key={cat.category_id} value={cat.category_id}>
                                {cat.category_name} (Target: {cat.ppm_target} PPM)
                            </option>
                        ))}
                    </select>
                </div>
                {/* เพิ่ม Field อื่นๆ ตามต้องการ */}
                <div className="md:col-span-2">
                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        บันทึกข้อมูล
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductRegister;