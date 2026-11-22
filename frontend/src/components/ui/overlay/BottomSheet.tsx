'use client';

import { DialogSurface, type DialogSurfaceProps } from './DialogSurface';

export type BottomSheetProps = Omit<DialogSurfaceProps, 'placement'>;

export function BottomSheet(props: BottomSheetProps) {
  return <DialogSurface {...props} placement="bottom" />;
}
