import SignUpForm from './sign-up-form';
import { verifyVipCode } from './actions';

export default function SignUpPage() {
  return <SignUpForm verifyVipCode={verifyVipCode} />;
}
