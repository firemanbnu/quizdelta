const express = require('express');
const multer = require('multer');
const fs = require('fs');
const mammoth = require('mammoth');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = file.originalname.toLowerCase().split('.').pop();
    if (allowed.includes(`.${ext}`)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não suportado'));
    }
  }
});

async function extractPdfText(buffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const numPages = doc.numPages;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    const pageText = strings.join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
}

router.post('/extract-text', auth, adminOnly, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const filePath = req.file.path;
    const ext = req.file.originalname.toLowerCase().split('.').pop();
    let text = '';

    if (ext === 'pdf') {
      const buffer = fs.readFileSync(filePath);
      text = await extractPdfText(buffer);
    } else if (ext === 'doc' || ext === 'docx') {
      const buffer = fs.readFileSync(filePath);
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (ext === 'txt') {
      text = fs.readFileSync(filePath, 'utf-8');
    }

    fs.unlinkSync(filePath);

    res.json({
      text,
      filename: req.file.originalname,
      pages: text.split('\n\n').filter(p => p.trim()).length
    });
  } catch (error) {
    console.error('Erro ao extrair texto:', error);
    res.status(500).json({ error: 'Erro ao processar arquivo' });
  }
});

module.exports = router;
