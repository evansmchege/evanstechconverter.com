const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const PDFParser = require('pdf-parse');
const pdf2table = require('pdf2table');
const xlsx = require('xlsx');

const app = express();
const port = 3000;

app.use(express.static(__dirname));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const { buffer, originalname } = req.file;
  let extractedText;

  if (originalname.endsWith('.pdf')) {
    // Handle PDF file
    const pdfBuffer = buffer;
    const pdfData = await PDFParser(pdfBuffer);
    extractedText = pdfData.text;
  } else {
    // Handle image file
    const { data: { text } } = await Tesseract.recognize(
      buffer,
      'eng',
      { logger: m => console.log(m) }
    );
    extractedText = text;
  }

  res.json({ extractedText });
});

app.post('/convert-to-excel', async (req, res) => {
  // Assuming you have table data as an array, replace this with your actual data
  const tableData = [
    ['Header 1', 'Header 2'],
    ['Value 1', 'Value 2'],
  ];

  // Create an Excel worksheet
  const ws = xlsx.utils.aoa_to_sheet(tableData);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Table');

  // Generate an Excel file buffer
  const excelBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

  // Send the Excel file as a response
  res.setHeader('Content-Disposition', 'attachment; filename=table.xlsx');
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(excelBuffer);
});

// Add a route for converting tables from PDFs
app.post('/convert-pdf-to-table', (req, res) => {
  // Assuming you have a PDF buffer, replace this with your actual PDF data
  const pdfBuffer = req.body.pdfBuffer;

  // Convert PDF to table
  pdf2table(pdfBuffer, (err, rows, numRows) => {
    if (err) {
      console.error('Error converting PDF to table:', err);
      res.status(500).json({ error: 'An error occurred during PDF to table conversion.' });
    } else {
      // Send the converted table data as JSON response
      res.json({ tableData: rows });
    }
  });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});