import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

interface TiptapViewerProps {
  content: string;
  className?: string;
}

export function TiptapViewer({ content, className }: TiptapViewerProps) {
  // If content looks like plain text (no HTML tags), wrap in <p> for consistent rendering
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  const raw = isHtml ? content : `<p>${content.replace(/\n/g, '<br />')}</p>`;
  const html = DOMPurify.sanitize(raw);

  return (
    <div
      className={cn(
        'prose prose-invert prose-sm max-w-none',
        // Tron-themed prose overrides
        'prose-headings:font-display prose-headings:text-foreground prose-headings:tracking-wide',
        'prose-h2:text-base prose-h2:font-bold prose-h2:mt-4 prose-h2:mb-2',
        'prose-h3:text-sm prose-h3:font-bold prose-h3:mt-3 prose-h3:mb-1',
        'prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:my-1.5',
        'prose-li:text-muted-foreground prose-li:my-0.5',
        'prose-ul:my-2 prose-ol:my-2',
        'prose-strong:text-foreground prose-strong:font-bold',
        'prose-em:text-muted-foreground/80',
        'prose-hr:border-[#FF4500]/20 prose-hr:my-4',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
