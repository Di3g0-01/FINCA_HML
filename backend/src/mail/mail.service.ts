import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private resend: Resend;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  private getFrontendUrl(): string {
    const url = process.env.FRONTEND_URL || 'http://localhost:5173';
    return url.replace(/\/$/, '');
  }

  private getFromEmail(): string {
    return process.env.MAIL_FROM || 'no-reply@hmfinca.com';
  }

  async sendVerificationEmail(email: string, token: string) {
    const verificationUrl = `${this.getFrontendUrl()}/verify-account?token=${token}`;
    const from = this.getFromEmail();

    try {
      await this.resend.emails.send({
        from,
        to: email,
        subject: 'Verifica tu cuenta - FINCA HML',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #7b2cbf;">Bienvenido a Gestión FINCA HML</h2>
            <p>Por favor, haz clic en el siguiente enlace para verificar tu cuenta:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #7b2cbf; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Verificar Cuenta</a>
            </div>
            <p style="color: #666; font-size: 12px;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/><a href="${verificationUrl}">${verificationUrl}</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
            <p style="color: #999; font-size: 12px;">Si no solicitaste esta cuenta, puedes ignorar este correo.</p>
          </div>
        `,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Error sending verification email to ${email}`, error);
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const resetUrl = `${this.getFrontendUrl()}/reset-password?token=${token}`;
    const from = this.getFromEmail();

    try {
      await this.resend.emails.send({
        from,
        to: email,
        subject: 'Recuperación de Contraseña - FINCA HML',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #7b2cbf;">Recuperación de Contraseña</h2>
            <p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para crear una nueva:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #7b2cbf; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Restablecer Contraseña</a>
            </div>
            <p style="color: #666; font-size: 12px;">Este enlace expirará en 1 hora.</p>
            <p style="color: #666; font-size: 12px;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br/><a href="${resetUrl}">${resetUrl}</a></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;"/>
            <p style="color: #999; font-size: 12px;">Si no solicitaste esto, puedes ignorar este correo.</p>
          </div>
        `,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Error sending password reset email to ${email}`, error);
    }
  }
}
