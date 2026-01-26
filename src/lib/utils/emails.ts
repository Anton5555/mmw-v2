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

type BallotPick = {
  category: {
    name: string;
  };
  nominee: {
    name: string;
    filmTitle: string | null;
  };
};

type SendBallotEmailProps = {
  to: string;
  userName: string;
  editionYear: number;
  picks: BallotPick[];
};

const ballotEmailTemplate = (
  userName: string,
  editionYear: number,
  picks: BallotPick[]
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Los Oscalos ${editionYear}</title>
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
      color: #111827;
      padding: 48px 24px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #111827;
      font-size: 24px;
      margin-bottom: 8px;
      font-weight: 600;
      text-align: center;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
      text-align: center;
      margin-bottom: 32px;
    }
    .greeting {
      color: #111827;
      font-size: 16px;
      margin-bottom: 24px;
    }
    .picks-container {
      margin-top: 32px;
    }
    .pick-item {
      padding: 16px;
      margin-bottom: 12px;
      background-color: #f9fafb;
      border-left: 3px solid #fbbf24;
      border-radius: 4px;
    }
    .category-name {
      color: #111827;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .nominee-name {
      color: #111827;
      font-size: 16px;
      font-weight: 500;
    }
    .film-title {
      color: #6b7280;
      font-size: 14px;
      font-style: italic;
      margin-top: 4px;
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="email-wrapper">
      <h1>Los Oscalos ${editionYear}</h1>
      <p class="subtitle">Tus predicciones</p>
      
      <p class="greeting">Hola ${userName},</p>
      <p style="color: #4b5563; margin-bottom: 24px; font-size: 14px;">
        Aquí están tus predicciones para Los Oscalos ${editionYear}. Guárdalas para compararlas con los resultados.
      </p>

      <div class="picks-container">
        ${picks
          .map(
            (pick) => `
          <div class="pick-item">
            <div class="category-name">${pick.category.name}</div>
            <div class="nominee-name">${pick.nominee.name}</div>
            ${
              pick.nominee.filmTitle &&
              pick.nominee.filmTitle.trim() !== pick.nominee.name.trim()
                ? `<div class="film-title">${pick.nominee.filmTitle}</div>`
                : ''
            }
          </div>
        `
          )
          .join('')}
      </div>

      <div class="footer">
        <p>¡Buena suerte con tus predicciones!</p>
        <p style="margin-top: 8px;">Si hubo un error con la carga, avisá al equipo de Haití.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const sendBallotEmail = async ({
  to,
  userName,
  editionYear,
  picks,
}: SendBallotEmailProps) => {
  await resend.emails.send({
    from: 'El Vip de MM <onboarding@elvipdemm.com>',
    to: to,
    subject: `Los Oscalos ${editionYear} - Tus predicciones`,
    html: ballotEmailTemplate(userName, editionYear, picks),
  });
};
