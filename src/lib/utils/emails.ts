import { Resend } from 'resend';
import { env } from '@/env';

const resend = new Resend(env.RESEND_API_KEY);

type SendEmailProps = {
  to: string;
  url: string;
};

const emailTemplate = (
  title: string,
  message: string,
  buttonText: string,
  url: string
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .email-wrapper {
      background-color: white;
      text-align: center;
      color: #111827;
      padding: 48px 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #111827;
      font-size: 24px;
      margin-bottom: 16px;
      font-weight: 500;
    }
    p {
      color: #4b5563;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .link {
      color: #7c3aed;
      text-decoration: none;
      font-size: 14px;
    }
    .link:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <h1>${title}</h1>
      <p>${message}</p>
      <a href="${url}" class="link">
        ${buttonText}
      </a>
    </div>
  </div>
</body>
</html>
`;

export const sendVerificationEmail = async ({ to, url }: SendEmailProps) => {
  await resend.emails.send({
    from: 'El Vip de MM <onboarding@elvipdemm.com>',
    to: to,
    subject: 'Verifica tu cuenta de El Vip de MM',
    html: emailTemplate(
      'Bienvenido a El Vip de MM',
      'Haz click en el siguiente enlace para verificar tu cuenta:',
      'Verificar cuenta',
      url
    ),
  });
};

export const sendForgotPasswordEmail = async ({ to, url }: SendEmailProps) => {
  await resend.emails.send({
    from: 'El Vip de MM <onboarding@elvipdemm.com>',
    to: to,
    subject: 'Recupera tu cuenta de El Vip de MM',
    html: emailTemplate(
      'Recupera tu cuenta de El Vip de MM',
      'Haz click en el siguiente enlace para recuperar tu cuenta:',
      'Recuperar cuenta',
      url
    ),
  });
};
