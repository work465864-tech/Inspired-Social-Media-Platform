'use client';

import { DialogSurface, type DialogSurfaceProps } from './DialogSurface';

export type ModalProps = Omit<DialogSurfaceProps, 'placement'>;

export function Modal(props: ModalProps) {
  return <DialogSurface {...props} placement="center" />;
}
