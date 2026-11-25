import type { Metadata } from 'next';
import { LoginScreen } from '@/features/auth/login-screen';

export const metadata: Metadata = {
  title: 'вход — hookster',
};

/** Вход по коду: контакт → шесть цифр. `?next=` — куда вернуться после входа. */
export default function LoginPage() {
  return <LoginScreen />;
}
