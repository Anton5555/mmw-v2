import { env } from '@/env';
import SignUpForm from './sign-up-form';

export default function SignUpPage() {
  async function validateVipCode(code: string) {
    'use server';
    return code === env.VIP_CODE;
  }

  return <SignUpForm validateVipCode={validateVipCode} />;
}
