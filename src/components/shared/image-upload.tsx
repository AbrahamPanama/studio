'use client';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Image as ImageIcon, X } from 'lucide-react';

interface ImageUploadProps {
  value?: string;           // Current URL
  onChange: (file: File | null) => void; // Pass file back to parent
  onClear: () => void;      // Clear image
}

/**
 * Resize image to a maximum dimension while maintaining aspect ratio.
 * This standardizes reference photos for face recognition (matching webcam capture resolution).
 */
async function resizeImage(file: File, maxSize: number = 640): Promise<File> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Scale down to maxSize maintaining aspect ratio
      if (width > height && width > maxSize) {
        height = Math.round((height * maxSize) / width);
        width = maxSize;
      } else if (height > maxSize) {
        width = Math.round((width * maxSize) / height);
        height = maxSize;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) {
          const resizedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
            type: 'image/jpeg'
          });
          resolve(resizedFile);
        } else {
          resolve(file); // Fallback to original
        }
      }, 'image/jpeg', 0.85);
    };
    img.onerror = () => resolve(file); // Fallback to original on error
    img.src = URL.createObjectURL(file);
  });
}

export function ImageUpload({ value, onChange, onClear }: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(value || null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Resize image for consistent face recognition
      const resizedFile = await resizeImage(file, 640);
      const url = URL.createObjectURL(resizedFile);
      setPreview(url);
      onChange(resizedFile);
    }
  };

  const handleClear = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
    onClear();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Hidden Input that triggers Camera on Mobile */}
      <input
        type="file"
        ref={inputRef}
        accept="image/*"
        capture="environment" // <--- The Magic: Opens rear camera on tablet
        className="hidden"
        onChange={handleFile}
      />

      {/* Preview Area */}
      {preview ? (
        <div className="relative w-full h-64 bg-slate-100 rounded-md overflow-hidden border">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-contain"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          className="w-full h-40 border-2 border-dashed border-slate-300 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors gap-2"
        >
          <Camera className="h-8 w-8 text-slate-400" />
          <p className="text-sm text-slate-500 font-medium">Tap to Take Photo / Upload</p>
        </div>
      )}
    </div>
  );
}
