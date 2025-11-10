const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');

// Configuração do Multer para upload de arquivos
const uploadDir = path.join(__dirname, '../../uploads');
fs.ensureDirSync(uploadDir);

const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Permitir apenas PDF, JPG, PNG
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use apenas PDF, JPG ou PNG.'));
    }
  }
});

module.exports = {
  upload,
  uploadDir
};