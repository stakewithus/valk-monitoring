export default {
  USER_TYPES: {
    USER: 'USER',
    ADMIN: 'ADMIN',
  },
  JWT_TOKEN_TYPES: {
    LOGIN_TOKEN: 'LOGIN_TOKEN',
    REFRESH_TOKEN: 'REFRESH_TOKEN',
    VERIFICATION_TOKEN: 'VERIFICATION_TOKEN',
    FORGOT_PASSWORD_TOKEN: 'FORGOT_PASSWORD_TOKEN',
  },
  VAULT: {
    DEFAULT_POLICY: 'default',
  },
  PASSWORD_STRENGTH_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^])[A-Za-z\d@$!%*?&^]{8,}$/,
  PASSWORD_STRENGTH_MSG: 'Password must have eight characters minimum and must contain at least one uppercase letter, one lowercase letter, one number and one special character',
  MAX_LOGIN_ATTEMPTS: 4,
  LOCKS_ACCOUNT_IN: 15, // minutes
};
