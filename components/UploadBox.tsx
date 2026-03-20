import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { ImageAsset } from '../types';

interface UploadBoxProps {
  id: string;
  label: string;
  image: ImageAsset | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  heightClass?: string;
}

export const UploadBox: React.FC<UploadBoxProps> = ({ 
  id, 
  label, 
  image, 
  onUpload, 
  onRemove,
  heightClass = "h-32"
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };

  return (
    <div className={`relative group ${heightClass}`}>
      {image ? (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 relative">
          <img 
            src={image.previewUrl} 
            alt="Preview" 
            className="w-full h-full object-contain"
          />
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-md rounded-full text-slate-600 hover:text-red-600 shadow-sm transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div 
          onClick={() => inputRef.current?.click()}
          className="w-full h-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50/30 transition-all group"
        >
          <div className="p-3 bg-white rounded-xl shadow-sm mb-2 group-hover:scale-110 transition-transform">
            <Upload size={20} className="text-slate-400 group-hover:text-orange-500" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 group-hover:text-orange-600 uppercase tracking-tight">{label}</span>
          <input 
            type="file" 
            ref={inputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      )}
    </div>
  );
};
