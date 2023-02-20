export default {
  jwtTokenExpiredTime: process.env.JWT_TOKEN_EXPIRES_IN || 3600,
  jwtSecret: process.env.JWT_SECRET || 'verysecret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'notsosecret',
  jwtVerificationSecret: process.env.JWT_VERIFICATION_SECRET || 'secretless',
  jwtForgotPwdSecret: process.env.JWT_FORGOT_PASSWORD_SECRET || 'secret',
  serverPort: process.env.SERVER_PORT || 3001,
  adminCredential: {
    username: process.env.ADMIN_USERNAME || 'admin@test.com',
    password: process.env.ADMIN_PASSWORD || '123456',
    policies: 'admins,default',
  },
};