// controllers/materialController.js
import { getAllMaterials, createMaterial } from '../models/materialModel.js';

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
    const newMaterial = await createMaterial(req.body);
    res.json(newMaterial);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
