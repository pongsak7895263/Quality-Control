const multer = require("multer");
const path = require("path");
const fs = require("fs");

// กำหนด Storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let uploadPath = "uploads/"; // Default path

    // แยกโฟลเดอร์ตามประเภทไฟล์
    if (file.mimetype === "application/pdf") {
      uploadPath = "uploads/pdfs/";
    } else if (file.mimetype.startsWith("image/")) {
      uploadPath = "uploads/images/";
    }

    // ✅ FIX: สร้างโฟลเดอร์อัตโนมัติถ้ายังไม่มี (Recursive)
    const fullPath = path.join(__dirname, "../", uploadPath);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // ตั้งชื่อไฟล์: fieldname-timestamp.นามสกุล
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

// Filter กรองประเภทไฟล์
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, PNG, and PDF are allowed."), false);
  }
};

// กำหนดขนาดไฟล์สูงสุด (เช่น 10MB)
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10, // 10 MB
  },
  fileFilter: fileFilter,
});

module.exports = upload;