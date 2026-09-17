import { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiUrl, getStoredToken, mediaUrl } from '@/lib/api';

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  category: string;
  label: string;
  previewClassName?: string;
}

export function ImageUploadField({ value, onChange, category, label, previewClassName = 'h-32' }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please select an image', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const dataBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = () => reject(reader.error ?? new Error('File read failed'));
        reader.readAsDataURL(file);
      });
      const token = getStoredToken();
      const response = await fetch(apiUrl('/api/upload'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ filename: file.name, mimeType: file.type, dataBase64, category }),
      });
      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();
      onChange(mediaUrl(data.url ?? data.secure_url));
    } catch {
      toast({ title: 'Upload failed. Please try again.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading} className="rounded-xl gap-2">
        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {label}
      </Button>
      {value ? (
        <div className={`relative rounded-xl overflow-hidden bg-muted ${previewClassName}`}>
          <img src={mediaUrl(value)} alt="Preview" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`rounded-xl border border-dashed border-border flex items-center justify-center text-muted-foreground ${previewClassName}`}>
          <ImageIcon className="w-6 h-6" />
        </div>
      )}
    </div>
  );
}