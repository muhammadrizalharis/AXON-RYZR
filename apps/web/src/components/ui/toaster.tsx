'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      position="top-right"
      toastOptions={{
        style: {
          background: 'hsl(240 8% 6%)',
          border: '1px solid hsl(240 4% 18%)',
          color: 'hsl(0 0% 98%)',
        },
      }}
    />
  );
}
