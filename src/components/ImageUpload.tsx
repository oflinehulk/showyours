import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  bucket: 'avatars' | 'squad-logos' | 'screenshots' | 'tournament-assets';
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  className?: string;
  shape?: 'circle' | 'square' | 'wide';
  size?: 'sm' | 'md' | 'lg';
}

export function ImageUpload({
  bucket,
  currentUrl,
  onUpload,
  onRemove,
  className,
  shape = 'circle',
  size = 'md',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: shape === 'wide' ? 'w-full h-24' : 'w-16 h-16',
    md: shape === 'wide' ? 'w-full h-32' : 'w-24 h-24',
    lg: shape === 'wide' ? 'w-full h-40' : 'w-32 h-32',
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to upload images');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onUpload(publicUrl);
      toast.success('Image uploaded successfully!');
    } catch (error: unknown) {
      toast.error('Failed to upload image', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
        disabled={uploading}
      />

      <div
        className={cn(
          'relative overflow-hidden border-2 border-dashed border-border bg-muted/50',
          'hover:border-primary/50 hover:bg-muted transition-all cursor-pointer',
          'flex items-center justify-center',
          sizeClasses[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-xl',
          shape === 'wide' && 'aspect-[3/1]'
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        ) : currentUrl ? (
          <img
            src={currentUrl}
            alt="Upload preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Camera className="w-6 h-6" />
            <span className="text-xs">Upload</span>
          </div>
        )}
      </div>

      {currentUrl && onRemove && !uploading && (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

interface MultiImageUploadProps {
  bucket: 'screenshots';
  images: string[];
  maxImages?: number;
  onUpload: (url: string) => void;
  onRemove: (url: string) => void;
}

export function MultiImageUpload({
  bucket,
  images,
  maxImages = 5,
  onUpload,
  onRemove,
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to upload images');
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      onUpload(publicUrl);
      toast.success('Screenshot uploaded!');
    } catch (error: unknown) {
      toast.error('Failed to upload', { description: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {images.map((url, index) => (
          <div
            key={index}
            className="relative aspect-video rounded-lg overflow-hidden border border-border"
          >
            <img src={url} alt={`Screenshot ${index + 1}`} className="w-full h-full object-cover" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-1 right-1 w-5 h-5 rounded-full"
              onClick={() => onRemove(url)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ))}

        {images.length < maxImages && (
          <div
            className={cn(
              'aspect-video rounded-lg border-2 border-dashed border-border bg-muted/50',
              'hover:border-primary/50 hover:bg-muted transition-all cursor-pointer',
              'flex items-center justify-center'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
        disabled={uploading}
      />

      <p className="text-xs text-muted-foreground">
        Upload up to {maxImages} in-game screenshots (max 5MB each)
      </p>
    </div>
  );
}
