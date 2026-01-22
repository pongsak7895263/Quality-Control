const bcrypt = require('bcrypt');
const saltRounds = 10;
const plainPassword = process.argv[2]; // รับรหัสผ่านจาก command line

if (!plainPassword) {
  console.log("Usage: node hash-password.js <your_password_here>");
  process.exit(1);
}

bcrypt.hash(plainPassword, saltRounds, function(err, hash) {
  if (err) {
    console.error("Error hashing password:", err);
    return;
  }
  console.log("Your password:", plainPassword);
  console.log("BCrypt Hash:", hash);
});