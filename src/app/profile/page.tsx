import type { Metadata } from 'next';
import { ProfileScreen } from '@/features/profile/profile-screen';
import { RequireAuth } from '@/shared/lib/require-auth';

export const metadata: Metadata = {
  title: 'профиль — hookster',
};

/** Экран профиля по макету: шапка, статистика, вкладки и сетка игр. */
export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileScreen />
    </RequireAuth>
  );
}
