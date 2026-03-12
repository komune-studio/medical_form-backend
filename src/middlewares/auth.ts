import { NextFunction, Request, Response } from 'express';
import jwt, { Secret } from 'jsonwebtoken';
import { RequestError } from '../errors/RequestErrorCollection';
import * as UserDAO from '../daos/userDAO';

declare module 'express-serve-static-core' {
  interface Request {
    decoded?: any;
  }
}

const processToken = async (req: Request, successCallback: Function, errorCallback: Function) => {
  if (req.headers['authorization']) {
    let token = req.headers['authorization'].split(' ')[1];
    if (token) {
      let secret = process.env.TOKEN_SECRET;
      if (!secret) {
        errorCallback(new Error('NO_SECRET_DEFINED'));
        return;
      }

      try {
        const decoded = jwt.verify(token, <Secret>secret) as any;

        const user = await UserDAO.getById(decoded.id);
        if (!user) {
          errorCallback({ msg: 'USER_NOT_FOUND' });
          return;
        }

        if (!user.active) {
          errorCallback({ msg: 'ACCOUNT_DEACTIVATED' });
          return;
        }

        decoded.user = user;
        req.decoded = decoded;

        successCallback();
      } catch (err: any) {
        console.log(err);
        let message = err.message;
        message = message.toUpperCase().replace(' ', '_');
        errorCallback({ msg: message, err: err });
      }
    } else {
      errorCallback({ msg: 'NO_TOKEN_PROVIDED' });
    }
  } else {
    errorCallback({ msg: 'BAD_TOKEN_FORMAT' });
  }
};

// Any authenticated user
function auth(req: Request, res: Response, next: NextFunction) {
  processToken(
    req,
    async () => {
      if (req.decoded?.authenticated === true) {
        next();
      } else {
        return next(new RequestError('Authentication required', 403, 'NO_AUTH_DATA'));
      }
    },
    (err: any) => {
      return next(new RequestError('Authentication failed', 403, err.msg));
    }
  );
}

// ADMIN only
function authAdmin(req: Request, res: Response, next: NextFunction) {
  processToken(
    req,
    async () => {
      if (req.decoded?.authenticated !== true) {
        return next(new RequestError('Authentication required', 403, 'NO_AUTH_DATA'));
      }
      const role = req.decoded?.user?.role;
      if (role !== 'ADMIN') {
        return next(new RequestError('Admin access required', 403, 'FORBIDDEN'));
      }
      next();
    },
    (err: any) => {
      return next(new RequestError('Authentication failed', 403, err.msg));
    }
  );
}

// ADMIN or DOCTOR
function authAny(req: Request, res: Response, next: NextFunction) {
  processToken(
    req,
    async () => {
      if (req.decoded?.authenticated !== true) {
        return next(new RequestError('Authentication required', 403, 'NO_AUTH_DATA'));
      }
      const role = req.decoded?.user?.role;
      if (role !== 'ADMIN' && role !== 'DOCTOR') {
        return next(new RequestError('Access denied', 403, 'FORBIDDEN'));
      }
      next();
    },
    (err: any) => {
      return next(new RequestError('Authentication failed', 403, err.msg));
    }
  );
}

function optional(req: Request, res: Response, next: NextFunction) {
  if (!req.headers['authorization']) {
    req.decoded = { none: true };
    next();
    return;
  }

  processToken(
    req,
    async () => {
      next();
    },
    (err: any) => {
      req.decoded = { none: true };
      next();
    }
  );
}

function developer(req: Request, res: Response, next: NextFunction) {
  if (!process.env.DEV_SECRET || process.env.DEV_SECRET?.length < 5)
    return next(new RequestError('Invalid auth', 403, 'INVALID_AUTH'));
  if (req.headers['authorization'] === process.env.DEV_SECRET) next();
  else return next(new RequestError('Invalid auth', 403, 'INVALID_AUTH'));
}

export default {
  auth,
  authAdmin,
  authAny,
  admin: authAdmin,        // alias backward compat
  any: authAny,            // alias backward compat
  optional,
  developer,
  superadmin: authAdmin,
  admin_superadmin: authAdmin,
  member: auth,
};