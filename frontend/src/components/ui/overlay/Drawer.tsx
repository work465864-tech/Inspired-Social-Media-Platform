'use client';

import { DialogSurface, type DialogSurfaceProps } from './DialogSurface';

export type DrawerProps = Omit<DialogSurfaceProps, 'placement'> & {
  side?: 'left' | 'right';
};

export function Drawer({ side = 'right', ...props }: DrawerProps) {
  return (
    <DialogSurface
      {...props}
      placement={side === 'left' ? 'drawer-left' : 'drawer-right'}
    />
  );
}
