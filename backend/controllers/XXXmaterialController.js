// controllers/materialController.js
import { getAllMaterials, createMaterial } from '../models/XXXmaterialModel.js';

export const getMaterials = async (req, res) => {
  try {
    const data = await getAllMaterials();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addMaterial = async (req, res) => {
  try {
    // ✅ แก้ไข: รวม req.body (ข้อมูล text) และ req.files (ไฟล์แนบ) เข้าด้วยกัน
    const materialData = {
      ...req.body,
      files: req.files || [], // รับไฟล์จาก middleware (เช่น multer)
      // หรือถ้าแยก array:
      // pdfs: req.files['attached_files'],
      // images: req.files['attached_images']
    };

    const newMaterial = await createMaterial(materialData);
    res.json(newMaterial);
  } catch (err) {
    console.error(err); // ควร log error ดูด้วย
    res.status(500).json({ error: err.message });
  }
};