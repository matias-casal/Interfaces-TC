import { serviceAuthMiddleware } from '../middleware/auth';
import { JWTUtils } from '../utils/jwt';

const createMockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('serviceAuthMiddleware', () => {
  const next = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(JWTUtils, 'verify').mockImplementation(() => ({ id: 'user-1', username: 'user-1' }));
    next.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejects requests without credentials', () => {
    const req: any = { headers: {} };
    const res = createMockResponse();

    serviceAuthMiddleware(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects service requests with invalid token', () => {
    const req: any = {
      headers: {
        'x-internal-service': 'messaging-service',
        'x-internal-token': 'invalid',
      },
    };
    const res = createMockResponse();

    serviceAuthMiddleware(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects unauthorized service names', () => {
    const req: any = {
      headers: {
        'x-internal-service': 'unknown-service',
        'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN,
      },
    };
    const res = createMockResponse();

    serviceAuthMiddleware(req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows whitelisted services with valid token', () => {
    const req: any = {
      headers: {
        'x-internal-service': 'messaging-service',
        'x-internal-token': process.env.INTERNAL_SERVICE_TOKEN,
      },
    };
    const res = createMockResponse();

    serviceAuthMiddleware(req, res as any, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('allows JWT authenticated users when service headers are absent', () => {
    const req: any = {
      headers: {
        authorization: 'Bearer token',
      },
    };
    const res = createMockResponse();

    serviceAuthMiddleware(req, res as any, next);

    expect(JWTUtils.verify).toHaveBeenCalledWith('token');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
