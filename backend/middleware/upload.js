const multer = require("multer");
const path = require("path");
const fs = require("fs");

// กำหนด Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let folder = "uploads/"; // Default path

    // แยกโฟลเดอร์ตามประเภทไฟล์
    if (file.mimetype === "application/pdf") {
      folder = "uploads/pdfs/";
    } else if (file.mimetype.startsWith("image/")) {
      folder = "uploads/images/";
    }

    // ✅ แก้ไข: ใช้ process.cwd() เพื่ออ้างอิงจาก Root Project เสมอ
    // วิธีนี้จะสร้างโฟลเดอร์ uploads ไว้ระดับเดียวกับ package.json (ไม่อยู่ใน src)
    const absolutePath = path.join(process.cwd(), folder);

    // สร้างโฟลเดอร์ถ้ายังไม่มี
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }

    // ส่ง Relative path ให้ Multer (มันจะเซฟลง Root/uploads/...)
    cb(null, folder);
  },
  filename: function (req, file, cb) {
    // ตั้งชื่อไฟล์ใหม่ (ใช้ Timestamp + Random)
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    // ดึงนามสกุลไฟล์เดิม
    const ext = path.extname(file.originalname);
    
    cb(null, uniqueSuffix + ext); 
  },
});

// Filter กรองประเภทไฟล์
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp", // แนะนำให้เพิ่ม
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel"
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: fileFilter,
});

module.exports = upload;