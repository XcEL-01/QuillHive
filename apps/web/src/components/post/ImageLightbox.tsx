import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

type ImageLightboxProps = {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
};

export function ImageLightbox({ src, alt, className, imageClassName }: ImageLightboxProps) {
  const [open, setOpen] = useState(false);

  const openLightbox = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    setOpen(true);
  };

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`Open image: ${alt}`}
        onClick={openLightbox}
        onKeyDown={handleKeyDown}
        className={`cursor-zoom-in ${className ?? ''}`}
      >
        <img src={src} alt={alt} className={imageClassName} />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="h-screen w-screen max-w-none rounded-none border-0 bg-black/95 p-4 shadow-none sm:rounded-none">
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close image"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="flex h-full w-full items-center justify-center">
            <img src={src} alt={alt} className="max-h-full max-w-full object-contain" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
