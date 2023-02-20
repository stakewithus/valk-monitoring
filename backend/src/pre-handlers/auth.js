import Jwt from 'jsonwebtoken';
import Util from '../common/util';
import Constant from '../common/constant';

const checkUserAccess = (req, res) => {
  const token = Util.getTokenInHeader(req);
  try {
    const decoded = Jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return decoded;
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      return {
        code: 401,
        error: 'EXPIRED_TOKEN',
        expiredAt: e.expiredAt,
      };
    }
    return {
      code: 401,
      error: 'INVALID_TOKEN',
      message: e.message,
    };
  }
};

const checkAdminAccess = (req, res) => {
  const user = checkUserAccess(req, res);
  if (user.role !== Constant.USER_TYPES.ADMIN) {
    return {
      code: 403,
      error: 'PERMISSION_DENIED',
    };
  }
  return user;
};

export default {
  checkUserAccess,
  checkAdminAccess,
};
