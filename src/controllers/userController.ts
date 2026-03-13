import { NextFunction, Request, Response } from 'express';
import {
    BadParamIdError,
    BadRequestError,
    EntityNotFoundError,
    InternalServerError,
    MissingBodyError,
    RequestError,
} from '../errors/RequestErrorCollection';
import * as UserDAO from '../daos/userDAO';
import hidash from '../utils/hidash';
import crypto from '../utils/crypto';
import jwt from 'jsonwebtoken';
import { users_role } from '@prisma/client';

declare module 'express-serve-static-core' {
    interface Request {
        decoded?: any;
    }
}

/**
 * Strip password & salt, tapi KEEP active, role, id, username, timestamps.
 * Dipakai untuk semua endpoint ADMIN agar field active & role tetap ada.
 */
function safeUser(u: any) {
    return {
        id: u.id,
        username: u.username,
        role: u.role,
        active: u.active,
        created_at: u.created_at,
        modified_at: u.modified_at,
    };
}

// ─────────────────────────────────────────────
// PUBLIC
// ─────────────────────────────────────────────

export async function createUser(req: Request, res: Response, next: NextFunction) {
    try {
        const body = req.body;
        if (!body) return next(new MissingBodyError());

        const salt = crypto.generateSalt();
        const password = crypto.generatePassword(body.password, salt);
        body.salt = salt;
        body.password = password;
        body.role = 'DOCTOR';

        const isMissingProperty = hidash.checkPropertyV2(body, 'User', UserDAO.getRequired());
        if (isMissingProperty.message) return next(isMissingProperty);

        const existingUser = await UserDAO.getByUsername(body.username);
        if (existingUser) {
            return next(new BadRequestError('Username already exists!', 'USERNAME_EXISTS'));
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
                role: user.role,
            },
            process.env.TOKEN_SECRET as jwt.Secret,
            { expiresIn: '7d' }
        );

        // Login response include role & active untuk frontend
        return res.json({ ...safeUser(user), token });
    } catch (error: any) {
        return next(new InternalServerError(error.message));
    }
};

// ─────────────────────────────────────────────
// SELF (any authenticated user)
// ─────────────────────────────────────────────

export async function getSelfData(req: Request, res: Response, next: NextFunction) {
    try {
        const decodedId = req.decoded?.id;
        if (!decodedId) return next(new BadRequestError('Invalid token data', 'INVALID_TOKEN_DATA'));

        const id = parseInt(decodedId);
        if (isNaN(id)) return next(new BadParamIdError());

        const user = await UserDAO.getById(id);
        if (!user) return next(new EntityNotFoundError('User', id));

        return res.send(safeUser(user));
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function resetOwnPassword(req: Request, res: Response, next: NextFunction) {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) return next(new MissingBodyError());

        const decodedId = req.decoded?.id;
        if (!decodedId) return next(new BadRequestError('Invalid token data', 'INVALID_TOKEN_DATA'));

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
            user: safeUser(result),
        });
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function updateOwnProfile(req: Request, res: Response, next: NextFunction) {
    try {
        const { username } = req.body;

        const decodedId = req.decoded?.id;
        if (!decodedId) return next(new BadRequestError('Invalid token data', 'INVALID_TOKEN_DATA'));

        const userId = parseInt(decodedId);
        if (!username) return next(new MissingBodyError());
        if (isNaN(userId)) return next(new BadParamIdError());

        const user = await UserDAO.getById(userId);
        if (!user) return next(new EntityNotFoundError('User', userId));

        if (username !== user.username) {
            const existingUser = await UserDAO.getByUsername(username);
            if (existingUser && existingUser.id !== userId) {
                return next(new BadRequestError('Username already exists!', 'USERNAME_EXISTS'));
            }
        }

        const result = await UserDAO.update(userId, { username });
        return res.send({
            message: 'Profile updated successfully',
            user: safeUser(result),
        });
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function deleteOwnAccount(req: Request, res: Response, next: NextFunction) {
    try {
        const decodedId = req.decoded?.id;
        if (!decodedId) return next(new BadRequestError('Invalid token data', 'INVALID_TOKEN_DATA'));

        const userId = parseInt(decodedId);
        if (isNaN(userId)) return next(new BadParamIdError());

        const user = await UserDAO.getById(userId);
        if (!user) return next(new EntityNotFoundError('User', userId));

        const result = await UserDAO.softDelete(userId);
        return res.send({
            message: 'Account deleted successfully',
            user: safeUser(result),
        });
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

// ─────────────────────────────────────────────
// ADMIN ONLY
// ─────────────────────────────────────────────

export async function getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
        const users = await UserDAO.getAll();
        return res.send(users.map(safeUser));
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function getAllUsersWithInactive(req: Request, res: Response, next: NextFunction) {
    try {
        const users = await UserDAO.getAllWithInactive();
        return res.send(users.map(safeUser));
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function getUsersByRole(req: Request, res: Response, next: NextFunction) {
    try {
        const { role } = req.query;
        if (!role || !['ADMIN', 'DOCTOR'].includes(role as string)) {
            return next(new BadRequestError('role query param must be ADMIN or DOCTOR', 'INVALID_ROLE'));
        }
        const users = await UserDAO.getByRole(role as users_role);
        return res.send(users.map(safeUser));
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadParamIdError());

        const user = await UserDAO.getById(id);
        if (!user) return next(new EntityNotFoundError('User', id));

        return res.send(safeUser(user));
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function adminCreateUser(req: Request, res: Response, next: NextFunction) {
    try {
        const body = req.body;
        if (!body) return next(new MissingBodyError());

        if (!body.role || !['ADMIN', 'DOCTOR'].includes(body.role)) {
            return next(new BadRequestError('role must be ADMIN or DOCTOR', 'INVALID_ROLE'));
        }

        const salt = crypto.generateSalt();
        const password = crypto.generatePassword(body.password, salt);
        body.salt = salt;
        body.password = password;

        const isMissingProperty = hidash.checkPropertyV2(body, 'User', UserDAO.getRequired());
        if (isMissingProperty.message) return next(isMissingProperty);

        const existingUser = await UserDAO.getByUsername(body.username);
        if (existingUser) {
            return next(new BadRequestError('Username already exists!', 'USERNAME_EXISTS'));
        }

        const result = await UserDAO.create(UserDAO.formatCreate(body));
        return res.status(201).send(safeUser(result));
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function adminUpdateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadParamIdError());

        const { role } = req.body;
        if (!role || !['ADMIN', 'DOCTOR'].includes(role)) {
            return next(new BadRequestError('role must be ADMIN or DOCTOR', 'INVALID_ROLE'));
        }

        if (req.decoded?.id === id) {
            return next(new RequestError('Cannot change your own role', 403, 'FORBIDDEN'));
        }

        const user = await UserDAO.getById(id);
        if (!user) return next(new EntityNotFoundError('User', id));

        const result = await UserDAO.updateRole(id, role as users_role);
        return res.send({
            message: `Role updated to ${role}`,
            user: safeUser(result),
        });
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function adminResetUserPassword(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadParamIdError());

        const { newPassword } = req.body;
        if (!newPassword) return next(new MissingBodyError());

        const user = await UserDAO.getById(id);
        if (!user) return next(new EntityNotFoundError('User', id));

        const newSalt = crypto.generateSalt();
        const newHashedPassword = crypto.generatePassword(newPassword, newSalt);
        const result = await UserDAO.updatePassword(id, newHashedPassword, newSalt);

        return res.send({
            message: 'Password reset successfully',
            user: safeUser(result),
        });
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function adminDeleteUser(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadParamIdError());

        if (req.decoded?.id === id) {
            return next(new RequestError('Cannot delete your own account from admin panel', 403, 'FORBIDDEN'));
        }

        const user = await UserDAO.getById(id);
        if (!user) return next(new EntityNotFoundError('User', id));

        const result = await UserDAO.softDelete(id);
        return res.send({
            message: 'User deactivated successfully',
            user: safeUser(result),
        });
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}

export async function adminRestoreUser(req: Request, res: Response, next: NextFunction) {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadParamIdError());

        const user = await UserDAO.getByIdIncludeInactive(id);
        if (!user) return next(new EntityNotFoundError('User', id));

        const result = await UserDAO.restoreUser(id);
        return res.send({
            message: 'User restored successfully',
            user: safeUser(result),
        });
    } catch (error: any) {
        return next(new InternalServerError(error));
    }
}