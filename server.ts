import express, { Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body limit 50MB for handling high-resolution PDF page captures
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Gemini client according to gemini-api skill instructions
const apiKey = process.env.GEMINI_API_KEY || '';
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Intelligent OCR & Document Structural Analysis Endpoint
app.post('/api/ocr', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/png', language = 'Indonesian' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Data gambar base64 diperlukan untuk OCR.' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Layanan OCR Gemini belum terkonfigurasi. Pastikan GEMINI_API_KEY tersedia.',
      });
    }

    // Clean base64 string if it contains data URI prefix
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Anda adalah mesin OCR dan penganalisis dokumen profesional.
Tugas Anda adalah membaca gambar halaman dokumen PDF berikut dengan presisi tinggi.
Teks dalam bahasa: ${language} (atau bahasa asli dokumen).

Instruksi:
1. Ekstrak seluruh teks dalam dokumen sesuai urutan baca alami (reading order).
2. Identifikasi tipe elemen setiap blok: 'heading_1', 'heading_2', 'paragraph', 'table', atau 'list_item'.
3. Jika terdapat tabel, ekstrak baris dan kolom secara akurat dalam bentuk matriks 2D string.
4. Identifikasi apakah dokumen tampak seperti hasil pindaian (scanned), fotokopi, atau digital.

Format output JSON harus valid sesuai skema yang diminta.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isScanned: {
              type: Type.BOOLEAN,
              description: 'True jika halaman adalah hasil scan atau foto kamera',
            },
            fullText: {
              type: Type.STRING,
              description: 'Seluruh teks yang diekstrak dengan baris baru yang rapi',
            },
            elements: {
              type: Type.ARRAY,
              description: 'Daftar elemen dokumen dalam urutan baca',
              items: {
                type: Type.OBJECT,
                properties: {
                  type: {
                    type: Type.STRING,
                    description: 'heading_1, heading_2, paragraph, table, list_item',
                  },
                  content: {
                    type: Type.STRING,
                    description: 'Teks dari elemen ini',
                  },
                  tableData: {
                    type: Type.ARRAY,
                    description: 'Hanya jika type adalah table: baris-baris data',
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
                required: ['type', 'content'],
              },
            },
          },
          required: ['fullText', 'elements'],
        },
      },
    });

    const outputText = response.text || '{}';
    const parsedData = JSON.parse(outputText);
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error in /api/ocr:', error);
    return res.status(500).json({
      error: error.message || 'Gagal memproses OCR dokumen.',
    });
  }
});

// Intelligent Table Detection for Excel Conversion
app.post('/api/detect-tables', async (req: Request, res: Response) => {
  try {
    const { imageBase64, textContent, mimeType = 'image/png' } = req.body;

    if (!imageBase64 && !textContent) {
      return res.status(400).json({ error: 'Gambar atau teks dokumen diperlukan.' });
    }

    if (!ai) {
      return res.status(503).json({
        error: 'Layanan AI Gemini belum terkonfigurasi. Pastikan GEMINI_API_KEY tersedia.',
      });
    }

    const prompt = `Analisis halaman dokumen PDF ini dan temukan semua tabel data keuangan, faktur, daftar nilai, rekap, inventaris, atau tabel terstruktur lainnya.
Untuk setiap tabel yang ditemukan:
1. Berikan nama/judul tabel (sheet name singkat, maks 20 karakter).
2. Tentukan header kolom.
3. Ekstrak setiap baris data (rows). Bersihkan tanda pemisah yang tidak perlu, pisahkan angka dan teks ke sel yang tepat.
4. Jika tidak ada tabel yang jelas, kembalikan array tabel kosong dan jelaskan di 'message'.`;

    const parts: any[] = [];
    if (imageBase64) {
      const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      });
    }
    if (textContent) {
      parts.push({
        text: `Teks yang diekstrak dari halaman:\n${textContent}\n\n${prompt}`,
      });
    } else {
      parts.push({ text: prompt });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tablesFound: { type: Type.BOOLEAN },
            message: { type: Type.STRING },
            tables: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: 'Nama sheet singkat' },
                  headers: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                  rows: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                  },
                },
                required: ['name', 'headers', 'rows'],
              },
            },
          },
          required: ['tablesFound', 'tables'],
        },
      },
    });

    const parsedData = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error in /api/detect-tables:', error);
    return res.status(500).json({
      error: error.message || 'Gagal mendeteksi tabel dari dokumen.',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, () => {
    console.log(`PDF Studio server running on port ${PORT}`);
  });
}

startServer();
