import React, { useRef, useState, useEffect } from 'react';
import { X, Check, Eraser, PenTool, Stamp } from 'lucide-react';
import { ImageObject } from '../types/pdf';

interface SignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPageIndex: number;
  onAddObject: (obj: ImageObject) => void;
}

export const SignatureModal: React.FC<SignatureModalProps> = ({
  isOpen,
  onClose,
  currentPageIndex,
  onAddObject,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'draw' | 'stamp'>('draw');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [selectedStampText, setSelectedStampText] = useState('DISETUJUI');
  const [stampColor, setStampColor] = useState('#2563eb');

  useEffect(() => {
    if (activeTab === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [activeTab]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setIsDrawing(true);
    setHasContent(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasContent(false);
  };

  const handleApplySignature = () => {
    if (!canvasRef.current || !hasContent) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');

    const newObj: ImageObject = {
      id: `sig_${Date.now()}`,
      pageIndex: currentPageIndex,
      type: 'image',
      src: dataUrl,
      mimeType: 'image/png',
      x: 100,
      y: 200,
      width: 160,
      height: 70,
      naturalWidth: 400,
      naturalHeight: 180,
      rotation: 0,
      opacity: 1,
    };

    onAddObject(newObj);
    onClose();
  };

  const handleApplyStamp = () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 240;
    tempCanvas.height = 100;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    // Draw stylish company stamp border
    ctx.strokeStyle = stampColor;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 220, 80);

    ctx.lineWidth = 1;
    ctx.strokeRect(14, 14, 212, 72);

    // Stamp text
    ctx.fillStyle = stampColor;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(selectedStampText, 120, 45);

    // Timestamp
    ctx.font = '10px monospace';
    const dateStr = new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    ctx.fillText(`VERIFIKASI: ${dateStr}`, 120, 68);

    const dataUrl = tempCanvas.toDataURL('image/png');

    const newObj: ImageObject = {
      id: `stamp_${Date.now()}`,
      pageIndex: currentPageIndex,
      type: 'image',
      src: dataUrl,
      mimeType: 'image/png',
      x: 120,
      y: 180,
      width: 140,
      height: 60,
      naturalWidth: 240,
      naturalHeight: 100,
      rotation: -6, // slight natural stamp tilt
      opacity: 0.9,
    };

    onAddObject(newObj);
    onClose();
  };

  const stampPresets = [
    { text: 'DISETUJUI', color: '#16a34a' },
    { text: 'LUNAS', color: '#2563eb' },
    { text: 'SALINAN SAH', color: '#0f172a' },
    { text: 'RAHASIA', color: '#dc2626' },
    { text: 'DRAFT RESMI', color: '#d97706' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <PenTool className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Bubuhkan Tanda Tangan & Stempel
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('draw')}
            className={`pb-2 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'draw'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-600'
            }`}
          >
            Tanda Tangan Tangan
          </button>
          <button
            onClick={() => setActiveTab('stamp')}
            className={`pb-2 px-3 font-medium border-b-2 transition-colors ${
              activeTab === 'stamp'
                ? 'border-blue-600 text-blue-600 font-bold'
                : 'border-transparent text-slate-600'
            }`}
          >
            Stempel & Cap Resmi
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {activeTab === 'draw' ? (
            <div className="space-y-3">
              <p className="text-slate-500">
                Goreskan tanda tangan Anda di area putih berikut menggunakan mouse atau stylus:
              </p>
              <div className="border border-slate-300 rounded-lg bg-white overflow-hidden relative shadow-xs">
                <canvas
                  ref={canvasRef}
                  width={380}
                  height={150}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  className="w-full h-[150px] cursor-crosshair block"
                />
                {!hasContent && (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-300 pointer-events-none select-none">
                    Tanda Tangan di Sini
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center">
                <button
                  onClick={clearCanvas}
                  className="flex items-center gap-1 text-slate-500 hover:text-red-600 px-2 py-1 rounded"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Hapus / Bersihkan</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-500">Pilih stempel cepat untuk dibubuhkan:</p>
              <div className="grid grid-cols-2 gap-2">
                {stampPresets.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedStampText(s.text);
                      setStampColor(s.color);
                    }}
                    style={{ borderColor: s.color, color: s.color }}
                    className={`p-2.5 border-2 rounded-lg font-bold text-center transition-all ${
                      selectedStampText === s.text ? 'bg-slate-50 shadow-xs ring-2 ring-blue-400' : 'opacity-80'
                    }`}
                  >
                    {s.text}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-900"
          >
            Batal
          </button>
          <button
            onClick={activeTab === 'draw' ? handleApplySignature : handleApplyStamp}
            disabled={activeTab === 'draw' && !hasContent}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold rounded-lg shadow-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Bubuhkan ke Halaman</span>
          </button>
        </div>
      </div>
    </div>
  );
};
