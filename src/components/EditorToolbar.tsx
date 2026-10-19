import React, { useRef } from 'react';
import {
  MousePointer,
  Type,
  Image as ImageIcon,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  PenTool,
  Highlighter,
  Eraser,
  PenSquare,
} from 'lucide-react';
import { ToolMode } from '../types/pdf';

interface EditorToolbarProps {
  currentTool: ToolMode;
  onSelectTool: (tool: ToolMode) => void;
  onInsertImageFile: (file: File) => void;
  onOpenSignatureModal: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  currentTool,
  onSelectTool,
  onInsertImageFile,
  onOpenSignatureModal,
}) => {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onInsertImageFile(file);
    }
    e.target.value = '';
  };

  const tools = [
    { id: 'select', label: 'Pilih & Geser (V)', icon: MousePointer },
    { id: 'text', label: 'Tambah Teks (T)', icon: Type },
    { id: 'image', label: 'Sisipkan Gambar (I)', icon: ImageIcon, isCustomAction: true },
    { id: 'rect', label: 'Kotak / Persegi (R)', icon: Square },
    { id: 'circle', label: 'Lingkaran (O)', icon: Circle },
    { id: 'line', label: 'Garis Lurus (L)', icon: Minus },
    { id: 'arrow', label: 'Panah Petunjuk', icon: ArrowUpRight },
    { id: 'draw', label: 'Gambar Bebas (P)', icon: PenTool },
    { id: 'highlight', label: 'Stabilo / Sorot (H)', icon: Highlighter },
    { id: 'whiteout', label: 'Tutup Teks & Ganti (W)', icon: Eraser },
  ];

  return (
    <div className="flex items-center gap-1 bg-white border border-slate-200 shadow-xs rounded-xl px-2 py-1.5 z-10">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleImageChange}
        className="hidden"
      />

      {tools.map((t) => {
        const Icon = t.icon;
        const isActive = currentTool === t.id;

        return (
          <button
            key={t.id}
            onClick={() => {
              if (t.id === 'image') {
                imageInputRef.current?.click();
              } else {
                onSelectTool(t.id as ToolMode);
              }
            }}
            title={t.label}
            className={`p-2 rounded-lg transition-all flex items-center justify-center relative ${
              isActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      <div className="h-5 w-px bg-slate-200 mx-1" />

      {/* Signature & Stamp Button */}
      <button
        onClick={onOpenSignatureModal}
        title="Bubuhkan Tanda Tangan & Stempel"
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <PenSquare className="w-3.5 h-3.5 text-blue-600" />
        <span className="hidden sm:inline">Tanda Tangan</span>
      </button>
    </div>
  );
};
