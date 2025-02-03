import { Resend } from 'resend';
import { env } from '@/env';

const resend = new Resend(env.RESEND_API_KEY);

type SendEmailProps = {
  to: string;
  url: string;
};

export const sendVerificationEmail = async ({ to, url }: SendEmailProps) => {
  await resend.emails.send({
    from: 'El Vip de MM <onboarding@resend.dev>',
    to: to,
    subject: 'Verifica tu cuenta de El Vip de MM',
    html: `
          <h1>Bienvenido a El Vip de MM</h1>
          <p>Haz click en el siguiente enlace para verificar tu cuenta:</p>
          <a href="${url}">
            Verificar cuenta
          </a>
        `,
  });
};

export const sendForgotPasswordEmail = async ({ to, url }: SendEmailProps) => {
  await resend.emails.send({
    from: 'El Vip de MM <onboarding@resend.dev>',
    to: to,
    subject: 'Recupera tu cuenta de El Vip de MM',
    html: `
          <h1>Recupera tu cuenta de El Vip de MM</h1>
          <p>Haz click en el siguiente enlace para recuperar tu cuenta:</p>
          <a href="${url}">
            Recuperar cuenta
          </a>
        `,
  });
};
