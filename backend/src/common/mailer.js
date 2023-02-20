import pino from 'pino';
import sgMail from '@sendgrid/mail';
import Jwt from 'jsonwebtoken';
import Config from '../config';
import Constant from './constant';

const logger = pino().child({
  module: 'mailer',
});
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmailVerification = async (username) => {
  try {
    const token = Jwt.sign({
      user: username,
      type: Constant.JWT_TOKEN_TYPES.VERIFICATION_TOKEN,
    }, Config.jwtVerificationSecret, {
      expiresIn: '1d',
    });
    const link = `${process.env.CLIENT_BASE_URL || 'http://localhost:8080'}/#/auth/verify-email?token=${token}`;
    const msg = {
      to: username,
      from: process.env.SENDGRID_EMAIL_FROM || 'Valk Supports <supports@valk.io>',
      subject: 'Confirm your email',
      html: `
          <p>Hi there,</p>
          <p>Please use this following link to verify your email:</p
          <p><a href="${link}">${link}</a></p>
          <p>Thank you.</p>
          `,
    };
    await sgMail.send(msg);
    return {
      ok: true,
    };
  } catch (error) {
    logger.error(error);
    return {
      ok: false,
    };
  }
};

const sendForgotPasswordEmail = async (username) => {
  try {
    const token = Jwt.sign({
      user: username,
      type: Constant.JWT_TOKEN_TYPES.FORGOT_PASSWORD_TOKEN,
    }, Config.jwtForgotPwdSecret, {
      expiresIn: '1d',
    });
    const link = `${process.env.CLIENT_BASE_URL || 'http://localhost:8080'}/#/auth/reset-password?token=${token}`;
    const msg = {
      to: username,
      from: process.env.SENDGRID_EMAIL_FROM || 'Valk Supports <supports@valk.io>',
      subject: 'Reset your password',
      html: `
          <p>Hi there,</p>
          <p>Please use this following link to reset your password:</p
          <p><a href="${link}">${link}</a></p>
          <p>Thank you.</p>
          `,
    };
    await sgMail.send(msg);
    return {
      ok: true,
    };
  } catch (error) {
    logger.error(error);
    return {
      ok: false,
    };
  }
};

export default {
  sendEmailVerification,
  sendForgotPasswordEmail,
};
