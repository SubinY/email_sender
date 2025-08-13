'use client';

import { AuthProvider } from '@/hooks/use-auth';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { Toaster } from '@/components/ui/toaster';

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        {children}
      </ProtectedRoute>
      <Toaster />
    </AuthProvider>
  );
} 