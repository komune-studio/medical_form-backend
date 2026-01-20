import { NextFunction, Request, Response } from 'express';
import {
    BadParamIdError,
    BadRequestError,
    EntityNotFoundError,
    InternalServerError,
    MissingBodyError,
} from '../errors/RequestErrorCollection';
import * as UserDAO from '../daos/userDAO';
import hidash from '../utils/hidash';
import crypto from '../utils/crypto';
import jwt from 'jsonwebtoken';

declare module 'express-serve-static-core' {
  interface Request {
    decoded?: any;
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction) {
    try {
        const body = req.body;
        if (!body) return next(new MissingBodyError());

        const salt = crypto.generateSalt();
        const password = crypto.generatePassword(body.password, salt);
        body.salt = salt;
        body.password = password;

        const isMissingProperty = hidash.checkPropertyV2(body, 'User', UserDAO.getRequired());
        if (isMissingProperty.message) return next(isMissingProperty);

        const existingUser = await UserDAO.getByUsername(body.username);
        if (existingUser) {
            return next(new BadRequestError("Username already exists!", "USERNAME_EXISTS"));
        }

        const result = await UserDAO.create(UserDAO.formatCreate(body));
        return res.send(hidash.desensitizedFactory(result));
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body;
        if (!body) return next(new MissingBodyError());

        const user = await UserDAO.getByUsername(body.username);
        if (!user) return next(new EntityNotFoundError('Username', body.username));

        if (!user.active) {
            return next(new BadRequestError('Your account is deactivated. Please contact administrator.', 'ACCOUNT_DEACTIVATED'));
        }

        const hashedPassword = crypto.generatePassword(body.password, user.salt);
        if (hashedPassword !== user.password) {
            return next(new BadRequestError('Invalid username or password!'));
        }

        const token = jwt.sign(
            {
                authenticated: true,
                id: user.id,
                username: user.username,
            },
            process.env.TOKEN_SECRET as jwt.Secret,
            { expiresIn: '7d' }
        );

        const userData = hidash.desensitizedFactory(user);
        return res.json({ ...userData, token });
    } catch (error: any) {
        return next(new InternalServerError(error.message));
    }
}

export async function getSelfData(req: Request, res: Response, next: NextFunction) {
    try {
        const decodedId = req.decoded?.id;
        if (!decodedId) {
            return next(new BadRequestError('Invalid token data', 'INVALID_TOKEN_DATA'));
        }
        
        const id = parseInt(decodedId);
        if (isNaN(id)) return next(new BadParamIdError());

        const user = await UserDAO.getById(id);
        if (!user) return next(new EntityNotFoundError('User', id));

        return res.send(hidash.desensitizedFactory(user));
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
      const users = await UserDAO.getAll();
      
      const desensitizedUsers = users.map(user => 
          hidash.desensitizedFactory(user)
      );
      
      return res.send(desensitizedUsers);
  } catch (error: any) {
      return next(new InternalServerError(error));
  }
}

export async function resetOwnPassword(req: Request, res: Response, next: NextFunction) {
  try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
          return next(new MissingBodyError());
      }

      const decodedId = req.decoded?.id;
      if (!decodedId) {
        return next(new BadRequestError('Invalid token data', 'INVALID_TOKEN_DATA'));
      }

      const userId = parseInt(decodedId);
      if (isNaN(userId)) return next(new BadParamIdError());

      const user = await UserDAO.getById(userId);
      if (!user) return next(new EntityNotFoundError('User', userId));

      const currentHashedPassword = crypto.generatePassword(currentPassword, user.salt);
      if (currentHashedPassword !== user.password) {
          return next(new BadRequestError('Current password is incorrect!'));
      }

      const newSalt = crypto.generateSalt();
      const newHashedPassword = crypto.generatePassword(newPassword, newSalt);

      const result = await UserDAO.updatePassword(userId, newHashedPassword, newSalt);
      
      return res.send({ 
          message: 'Password reset successfully',
          user: hidash.desensitizedFactory(result)
      });
  } catch (error: any) {
      return next(new InternalServerError(error));
  }
}

export async function updateOwnProfile(req: Request, res: Response, next: NextFunction) {
  try {
      const { username } = req.body;
      
      const decodedId = req.decoded?.id;
      if (!decodedId) {
        return next(new BadRequestError('Invalid token data', 'INVALID_TOKEN_DATA'));
      }
      
      const userId = parseInt(decodedId);
      
      if (!username) {
          return next(new MissingBodyError());
      }

      if (isNaN(userId)) return next(new BadParamIdError());

      const user = await UserDAO.getById(userId);
      if (!user) return next(new EntityNotFoundError('User', userId));

      if (username !== user.username) {
          const existingUser = await UserDAO.getByUsername(username);
          if (existingUser && existingUser.id !== userId) {
              return next(new BadRequestError("Username already exists!", "USERNAME_EXISTS"));
          }
      }

      const result = await UserDAO.update(userId, { username });
      
      return res.send({ 
          message: 'Profile updated successfully',
          user: hidash.desensitizedFactory(result)
      });
  } catch (error: any) {
      return next(new InternalServerError(error));
  }
}

export async function deleteOwnAccount(req: Request, res: Response, next: NextFunction) {
    try {
        const decodedId = req.decoded?.id;
        if (!decodedId) {
          return next(new BadRequestError('Invalid token data', 'INVALID_TOKEN_DATA'));
        }

        const userId = parseInt(decodedId);
        if (isNaN(userId)) return next(new BadParamIdError());

        const user = await UserDAO.getById(userId);
        if (!user) return next(new EntityNotFoundError('User', userId));

        const result = await UserDAO.softDelete(userId);
        
        return res.send({ 
            message: 'Account deleted successfully',
            user: hidash.desensitizedFactory(result)
        });
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}