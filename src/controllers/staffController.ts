import { NextFunction, Request, Response } from 'express';
import {
    BadParamIdError,
    BadRequestError,
    EntityNotFoundError,
    InternalServerError,
    MissingBodyError,
} from '../errors/RequestErrorCollection';
import * as StaffDAO from '../daos/staffDAO';
import hidash from '../utils/hidash';

export async function createStaff(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const body = req.body;
        if (!body) {
            next(new MissingBodyError());
            return;
        }

        const isMissingProperty = hidash.checkPropertyV2(body, 'Staff', StaffDAO.getRequired());
        if (isMissingProperty.message) {
            next(isMissingProperty);
            return;
        }

        // Validate phone number format
        if (body.phone_number) {
            const phoneRegex = /^[0-9+()-]+$/;
            if (!phoneRegex.test(body.phone_number)) {
                next(new BadRequestError('Invalid phone number format'));
                return;
            }

            // Cek phone number unique
            const isUnique = await StaffDAO.isPhoneNumberUnique(body.phone_number);
            if (!isUnique) {
                next(new BadRequestError('Phone number already exists'));
                return;
            }
        }

        const result = await StaffDAO.create(StaffDAO.formatCreate(body));
        res.send(result);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getStaffById(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const staff = await StaffDAO.getById(id);
        if (!staff) {
            next(new EntityNotFoundError('Staff', id));
            return;
        }

        res.send(staff);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getAllStaff(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { 
            activeOnly = 'true', // default true
            search 
        } = req.query;

        const options: StaffDAO.GetAllStaffOptions = {
            activeOnly: activeOnly === 'true',
        };

        if (search) {
            options.search = search as string;
        }

        const staff = await StaffDAO.getAll(options);
        res.send(staff);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function updateStaff(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const body = req.body;
        if (!body) {
            next(new MissingBodyError());
            return;
        }

        const staff = await StaffDAO.getById(id);
        if (!staff) {
            next(new EntityNotFoundError('Staff', id));
            return;
        }

        // Validate phone number jika diupdate
        if (body.phone_number) {
            const phoneRegex = /^[0-9+()-]+$/;
            if (!phoneRegex.test(body.phone_number)) {
                next(new BadRequestError('Invalid phone number format'));
                return;
            }

            // Cek phone number unique (kecuali untuk staff ini sendiri)
            const isUnique = await StaffDAO.isPhoneNumberUnique(body.phone_number, id);
            if (!isUnique) {
                next(new BadRequestError('Phone number already exists'));
                return;
            }
        }

        const result = await StaffDAO.update(id, body);
        res.send(result);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function deleteStaff(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const staff = await StaffDAO.getById(id);
        if (!staff) {
            next(new EntityNotFoundError('Staff', id));
            return;
        }

        // Soft delete (set active to false)
        await StaffDAO.softDelete(id);
        res.send({ 
            message: 'Staff deactivated successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getActiveStaff(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const staff = await StaffDAO.getActiveStaff();
        res.send(staff);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function searchStaffByName(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { name } = req.query;
        
        if (!name) {
            next(new BadRequestError('Name is required'));
            return;
        }

        const staff = await StaffDAO.getStaffByName(name as string);
        
        if (!staff) {
            res.send(null);
            return;
        }

        res.send(staff);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function bulkSearchStaff(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { query } = req.query;
        
        if (!query) {
            // Return all active staff if no query
            const staff = await StaffDAO.getActiveStaff();
            res.send(staff);
            return;
        }

        const staff = await StaffDAO.searchStaff(query as string);
        res.send(staff);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function reactivateStaff(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const staff = await StaffDAO.getById(id);
        if (!staff) {
            next(new EntityNotFoundError('Staff', id));
            return;
        }

        const result = await StaffDAO.update(id, { active: true });
        res.send({
            message: 'Staff reactivated successfully',
            staff: result
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

// NEW: Get staff by phone
export async function getStaffByPhone(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { phone } = req.query;
        
        if (!phone) {
            next(new BadRequestError('Phone number is required'));
            return;
        }

        const staff = await StaffDAO.getStaffByPhone(phone as string);
        
        if (!staff) {
            res.send(null);
            return;
        }

        res.send(staff);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}