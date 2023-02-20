import Util from '../common/util';
import PolicyService from '../services/policy';

const list = (req, res) => async () => {
  try {
    const policies = await PolicyService.list();
    return Util.successResponse(res, {
      policies: policies.filter((p) => p !== 'root'),
    });
  } catch (e) {
    return Util.failResponse(500, res, {
      message: e && e.toString(),
    });
  }
};

export default {
  list,
};
