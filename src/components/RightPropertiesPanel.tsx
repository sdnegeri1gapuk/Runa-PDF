import React from 'react';
import {
  CanvasObject,
  TextObject,
  ImageObject,
  ShapeObject,
  WhiteoutObject,
} from '../types/pdf';
import {
  Trash2,
  Lock,
  Unlock,
  BringToFront,
  SendToBack,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Copy,
} from 'lucide-react';

interface RightPropertiesPanelProps {
  selectedObject: CanvasObject | null;
  onUpdateObject: (updated: CanvasObject) => void;
  onDeleteObject: (id: string) => void;
  onDuplicateObject: (obj: CanvasObject) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
}

export const RightPropertiesPanel: React.FC<RightPropertiesPanelProps> = ({
  selectedObject,
  onUpdateObject,
  onDeleteObject,
  onDuplicateObject,
  onBringForward,
  onSendBackward,
}) => {
  if (!selectedObject) {
    return (
      <aside className="w-64 border-l border-slate-200 bg-white p-4 flex flex-col shrink-0 select-none overflow-y-auto">
        <h3 className="text-xs font-semibold text-slate-700 mb-2">Properti Objek</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Pilih elemen di atas halaman PDF untuk mengatur posisi, ukuran, warna, teks, atau urutan lapisan.
        </p>

        <div className="mt-8 p-3 rounded-lg bg-slate-50 border border-slate-150">
          <span className="text-[11px] font-semibold text-slate-600 block mb-1">
            Pintasan Keyboard:
          </span>
          <ul className="text-[11px] text-slate-500 space-y-1">
            <li><kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">Del</kbd> / <kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">Backspace</kbd> : Hapus elemen</li>
            <li><kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">Panah</kbd> : Geser presisi 1pt</li>
            <li><kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">Shift + Panah</kbd> : Geser 10pt</li>
            <li><kbd className="font-mono bg-white border border-slate-200 px-1 py-0.5 rounded text-[10px]">Esc</kbd> : Batalkan pilihan</li>
          </ul>
        </div>
      </aside>
    );
  }

  const objTypeLabels: Record<string, string> = {
    text: 'Teks',
    image: 'Gambar',
    rect: 'Persegi',
    circle: 'Lingkaran',
    line: 'Garis',
    arrow: 'Panah',
    draw: 'Garis Bebas',
    highlight: 'Sorotan Stabilo',
    whiteout: 'Penutup Teks',
  };

  return (
    <aside className="w-64 border-l border-slate-200 bg-white flex flex-col shrink-0 select-none overflow-y-auto h-full text-xs">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-800">
            {objTypeLabels[selectedObject.type] || 'Objek'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            ID: {selectedObject.id.slice(-6)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicateObject(selectedObject)}
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
            title="Duplikat Elemen"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteObject(selectedObject.id)}
            className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded"
            title="Hapus Elemen (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="p-3 space-y-4 flex-1">
        {/* Transform Coordinates & Dimensions */}
        <div>
          <span className="text-[11px] font-semibold text-slate-700 block mb-2">
            Posisi & Ukuran (pt)
          </span>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">X</label>
              <input
                type="number"
                value={selectedObject.x}
                onChange={(e) =>
                  onUpdateObject({ ...selectedObject, x: Number(e.target.value) || 0 })
                }
                className="w-full font-mono text-xs border border-slate-200 rounded px-2 py-1 tabular-nums focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Y</label>
              <input
                type="number"
                value={selectedObject.y}
                onChange={(e) =>
                  onUpdateObject({ ...selectedObject, y: Number(e.target.value) || 0 })
                }
                className="w-full font-mono text-xs border border-slate-200 rounded px-2 py-1 tabular-nums focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Lebar (W)</label>
              <input
                type="number"
                min={10}
                value={selectedObject.width}
                onChange={(e) =>
                  onUpdateObject({
                    ...selectedObject,
                    width: Math.max(10, Number(e.target.value) || 10),
                  })
                }
                className="w-full font-mono text-xs border border-slate-200 rounded px-2 py-1 tabular-nums focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Tinggi (H)</label>
              <input
                type="number"
                min={10}
                value={selectedObject.height}
                onChange={(e) =>
                  onUpdateObject({
                    ...selectedObject,
                    height: Math.max(10, Number(e.target.value) || 10),
                  })
                }
                className="w-full font-mono text-xs border border-slate-200 rounded px-2 py-1 tabular-nums focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Rotation & Aspect Ratio */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Rotasi (°)</label>
            <input
              type="number"
              min={0}
              max={360}
              value={selectedObject.rotation || 0}
              onChange={(e) =>
                onUpdateObject({
                  ...selectedObject,
                  rotation: Number(e.target.value) % 360,
                })
              }
              className="w-full font-mono text-xs border border-slate-200 rounded px-2 py-1 tabular-nums focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Kunci Aspek</label>
            <button
              onClick={() =>
                onUpdateObject({
                  ...selectedObject,
                  isLockedRatio: !selectedObject.isLockedRatio,
                })
              }
              className={`w-full flex items-center justify-center gap-1.5 border rounded py-1 transition-colors ${
                selectedObject.isLockedRatio
                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {selectedObject.isLockedRatio ? (
                <>
                  <Lock className="w-3 h-3" />
                  <span>Terkunci</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3 h-3 text-slate-400" />
                  <span>Bebas</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Opacity Slider */}
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-700">Transparansi</span>
            <span className="text-[11px] font-mono tabular-nums text-slate-500">
              {Math.round((selectedObject.opacity ?? 1) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={100}
            value={Math.round((selectedObject.opacity ?? 1) * 100)}
            onChange={(e) =>
              onUpdateObject({
                ...selectedObject,
                opacity: Number(e.target.value) / 100,
              })
            }
            className="w-full accent-blue-600 cursor-pointer"
          />
        </div>

        {/* Layer Arrangement */}
        <div className="pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">
            Susunan Lapisan
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onBringForward(selectedObject.id)}
              className="flex items-center justify-center gap-1 px-2 py-1 border border-slate-200 rounded text-slate-700 hover:bg-slate-50"
            >
              <BringToFront className="w-3 h-3 text-slate-500" />
              <span>Ke Depan</span>
            </button>
            <button
              onClick={() => onSendBackward(selectedObject.id)}
              className="flex items-center justify-center gap-1 px-2 py-1 border border-slate-200 rounded text-slate-700 hover:bg-slate-50"
            >
              <SendToBack className="w-3 h-3 text-slate-500" />
              <span>Ke Belakang</span>
            </button>
          </div>
        </div>

        {/* Text Specific Settings */}
        {selectedObject.type === 'text' && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-700 block">
              Pengaturan Teks
            </span>
            <textarea
              rows={3}
              value={(selectedObject as TextObject).text}
              onChange={(e) =>
                onUpdateObject({ ...selectedObject, text: e.target.value } as TextObject)
              }
              className="w-full text-xs border border-slate-200 rounded p-1.5 outline-none focus:border-blue-500"
              placeholder="Isi teks..."
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Ukuran Font</label>
                <input
                  type="number"
                  min={8}
                  max={96}
                  value={(selectedObject as TextObject).fontSize}
                  onChange={(e) =>
                    onUpdateObject({
                      ...selectedObject,
                      fontSize: Number(e.target.value) || 12,
                    } as TextObject)
                  }
                  className="w-full font-mono text-xs border border-slate-200 rounded px-2 py-1 tabular-nums focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Warna Teks</label>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={(selectedObject as TextObject).color}
                    onChange={(e) =>
                      onUpdateObject({
                        ...selectedObject,
                        color: e.target.value,
                      } as TextObject)
                    }
                    className="w-7 h-7 rounded border border-slate-200 p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={(selectedObject as TextObject).color}
                    onChange={(e) =>
                      onUpdateObject({
                        ...selectedObject,
                        color: e.target.value,
                      } as TextObject)
                    }
                    className="w-full font-mono text-[11px] border border-slate-200 rounded px-1.5 py-1 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Font Style Toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() =>
                  onUpdateObject({
                    ...selectedObject,
                    isBold: !(selectedObject as TextObject).isBold,
                  } as TextObject)
                }
                className={`p-1.5 border rounded ${
                  (selectedObject as TextObject).isBold
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Tebal"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  onUpdateObject({
                    ...selectedObject,
                    isItalic: !(selectedObject as TextObject).isItalic,
                  } as TextObject)
                }
                className={`p-1.5 border rounded ${
                  (selectedObject as TextObject).isItalic
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Miring"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  onUpdateObject({
                    ...selectedObject,
                    isUnderline: !(selectedObject as TextObject).isUnderline,
                  } as TextObject)
                }
                className={`p-1.5 border rounded ${
                  (selectedObject as TextObject).isUnderline
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Garis Bawah"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-200 mx-1" />

              <button
                onClick={() =>
                  onUpdateObject({
                    ...selectedObject,
                    textAlign: 'left',
                  } as TextObject)
                }
                className={`p-1.5 border rounded ${
                  (selectedObject as TextObject).textAlign === 'left'
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Rata Kiri"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  onUpdateObject({
                    ...selectedObject,
                    textAlign: 'center',
                  } as TextObject)
                }
                className={`p-1.5 border rounded ${
                  (selectedObject as TextObject).textAlign === 'center'
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Rata Tengah"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  onUpdateObject({
                    ...selectedObject,
                    textAlign: 'right',
                  } as TextObject)
                }
                className={`p-1.5 border rounded ${
                  (selectedObject as TextObject).textAlign === 'right'
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                title="Rata Kanan"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Whiteout Specific Settings */}
        {selectedObject.type === 'whiteout' && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-700 block">
              Ganti Teks yang Ditutup
            </span>
            <input
              type="text"
              placeholder="Teks pengganti baru (opsional)..."
              value={(selectedObject as WhiteoutObject).replacementText || ''}
              onChange={(e) =>
                onUpdateObject({
                  ...selectedObject,
                  replacementText: e.target.value,
                } as WhiteoutObject)
              }
              className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:border-blue-500"
            />
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400">Warna Tutup:</label>
              <input
                type="color"
                value={(selectedObject as WhiteoutObject).fillColor || '#ffffff'}
                onChange={(e) =>
                  onUpdateObject({
                    ...selectedObject,
                    fillColor: e.target.value,
                  } as WhiteoutObject)
                }
                className="w-6 h-6 rounded border border-slate-200 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* Shapes Specific Settings */}
        {['rect', 'circle', 'line', 'arrow'].includes(selectedObject.type) && (
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-semibold text-slate-700 block">
              Warna & Garis Bentuk
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Warna Garis</label>
                <input
                  type="color"
                  value={(selectedObject as ShapeObject).strokeColor}
                  onChange={(e) =>
                    onUpdateObject({
                      ...selectedObject,
                      strokeColor: e.target.value,
                    } as ShapeObject)
                  }
                  className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                />
              </div>
              {['rect', 'circle'].includes(selectedObject.type) && (
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Warna Isi</label>
                  <input
                    type="color"
                    value={(selectedObject as ShapeObject).fillColor === 'transparent' ? '#ffffff' : (selectedObject as ShapeObject).fillColor}
                    onChange={(e) =>
                      onUpdateObject({
                        ...selectedObject,
                        fillColor: e.target.value,
                      } as ShapeObject)
                    }
                    className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                  />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] text-slate-400">Ketebalan Garis</label>
                <span className="text-[10px] font-mono tabular-nums text-slate-600">
                  {(selectedObject as ShapeObject).strokeWidth} px
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={16}
                value={(selectedObject as ShapeObject).strokeWidth}
                onChange={(e) =>
                  onUpdateObject({
                    ...selectedObject,
                    strokeWidth: Number(e.target.value),
                  } as ShapeObject)
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
