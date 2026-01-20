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

// Satu middleware untuk semua
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

// Export semua sebagai alias ke auth (karena ga ada role sekarang)
export default {
  auth,
  admin: auth,
  any: auth,
  optional,
  developer,
  superadmin: auth,
  admin_superadmin: auth,
  member: auth,
};