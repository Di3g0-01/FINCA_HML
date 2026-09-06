import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async validateUser(identifier: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByUsernameOrEmail(identifier);
    if (user && (await bcrypt.compare(pass, user.password_hash))) {
      if (!user.is_verified) {
        throw new UnauthorizedException(
          'Por favor, verifica tu correo electrónico antes de iniciar sesión.',
        );
      }
      const { password_hash, ...result } = user;
      return result;
    }
    return null;
  }

  async verifyAccount(token: string) {
    const user = await this.usersService.findByVerificationToken(token);
    if (!user) {
      throw new UnauthorizedException('Token de verificación inválido o expirado.');
    }

    await this.usersService.update(
      user.id,
      {
        is_verified: true,
        verification_token: null as any,
      },
      'SYSTEM',
      user.role,
    );

    return { message: 'Cuenta verificada correctamente.' };
  }

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      return { message: 'Si el correo existe, se ha enviado un enlace para restablecer la contraseña.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hora
    
    await this.usersService.update(
      user.id,
      {
        reset_password_token: resetToken,
        reset_password_expires: expires,
      },
      'SYSTEM',
      user.role,
    );

    await this.mailService.sendPasswordResetEmail(user.email, resetToken);
    
    return { message: 'Si el correo existe, se ha enviado un enlace para restablecer la contraseña.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.usersService.findByResetToken(token);
    
    if (!user || !user.reset_password_expires || user.reset_password_expires < new Date()) {
      throw new UnauthorizedException('El token es inválido o ha expirado.');
    }

    await this.usersService.update(
      user.id,
      {
        password_hash: newPassword,
        reset_password_token: null as any,
        reset_password_expires: null as any,
      },
      'SYSTEM',
      user.role,
    );

    return { message: 'Contraseña restablecida correctamente.' };
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: payload,
    };
  }
}
