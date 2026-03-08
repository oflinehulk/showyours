/**
 * ResponsiveDialog — renders a Drawer (bottom sheet) on mobile, Dialog on desktop.
 * Drop-in replacement for Dialog in most cases.
 */
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer';

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function ResponsiveDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-card border-t border-border max-h-[85vh] safe-bottom">
          <DrawerHeader className="text-left">
            <DrawerTitle className="font-display text-foreground">{title}</DrawerTitle>
            {description && (
              <DrawerDescription className="text-muted-foreground">
                {description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className={`px-4 pb-4 overflow-y-auto ${className || ''}`}>{children}</div>
          {footer && <DrawerFooter className="px-4 pb-6">{footer}</DrawerFooter>}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`bg-card border border-border sm:max-w-md ${className || ''}`}>
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}