import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: BottomSheetProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="bg-[#111111] border-t border-[#FF4500]/20 max-h-[90vh] safe-bottom">
          <DrawerHeader>
            <DrawerTitle className="font-display text-foreground">{title}</DrawerTitle>
            {description && (
              <DrawerDescription className="text-muted-foreground">
                {description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#111111] border border-[#FF4500]/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-foreground">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-muted-foreground">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
