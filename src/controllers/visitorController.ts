import { NextFunction, Request, Response } from 'express';
import {
    BadParamIdError,
    BadRequestError,
    EntityNotFoundError,
    InternalServerError,
    MissingBodyError,
} from '../errors/RequestErrorCollection';
import * as VisitorDAO from '../daos/visitorDAO';
import * as StaffDAO from '../daos/staffDAO'; // Tambahkan import staffDAO
import hidash from '../utils/hidash';
import { visitors as Visitor } from '@prisma/client';

export async function createVisitor(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const body = req.body;
        if (!body) {
            next(new MissingBodyError());
            return;
        }

        const isMissingProperty = hidash.checkPropertyV2(body, 'Visitor', VisitorDAO.getRequired());
        if (isMissingProperty.message) {
            next(isMissingProperty);
            return;
        }

        if (body.visitor_profile === 'Other' && !body.visitor_profile_other) {
            next(new BadRequestError('visitor_profile_other is required when profile is Other'));
            return;
        }

        if (body.visitor_profile !== 'Other' && body.visitor_profile_other) {
            next(new BadRequestError('visitor_profile_other should only be filled when profile is Other'));
            return;
        }

        const phoneRegex = /^[0-9+()-]+$/;
        if (!phoneRegex.test(body.phone_number)) {
            next(new BadRequestError('Invalid phone number format'));
            return;
        }

        // VALIDASI STAFF_ID ADA DAN ACTIVE
        const isValidStaff = await VisitorDAO.validateStaff(body.staff_id);
        if (!isValidStaff) {
            next(new BadRequestError(`Staff with ID ${body.staff_id} not found or inactive`));
            return;
        }

        const result = await VisitorDAO.create(VisitorDAO.formatCreate(body));
        res.send(result);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getVisitorById(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const visitor = await VisitorDAO.getById(id);
        if (!visitor) {
            next(new EntityNotFoundError('Visitor', id));
            return;
        }

        res.send(visitor);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getAllVisitors(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const {
            includeCheckedOut,
            dateFrom,
            dateTo,
            visitorProfile,
            search,
            timeRange // New parameter for time range filter
        } = req.query;

        const options: VisitorDAO.GetAllOptions = {};

        if (includeCheckedOut !== undefined) {
            options.includeCheckedOut = includeCheckedOut === 'true';
        }

        // Handle time range filter
        if (timeRange) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today

            switch (timeRange) {
                case 'today':
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    options.dateFrom = today;
                    options.dateTo = tomorrow;
                    break;
                    
                case 'last7days':
                    const last7Days = new Date(today);
                    last7Days.setDate(last7Days.getDate() - 7);
                    options.dateFrom = last7Days;
                    options.dateTo = new Date(); // Now
                    break;
                    
                case 'last30days':
                    const last30Days = new Date(today);
                    last30Days.setDate(last30Days.getDate() - 30);
                    options.dateFrom = last30Days;
                    options.dateTo = new Date(); // Now
                    break;
                    
                case 'custom':
                    // For custom range, use dateFrom and dateTo
                    if (dateFrom) {
                        options.dateFrom = new Date(dateFrom as string);
                    }
                    if (dateTo) {
                        options.dateTo = new Date(dateTo as string);
                    }
                    break;
                    
                default:
                    // No time range selected, get all data
                    break;
            }
        } else {
            // Handle old way for backward compatibility
            if (dateFrom) {
                options.dateFrom = new Date(dateFrom as string);
            }

            if (dateTo) {
                options.dateTo = new Date(dateTo as string);
            }
        }

        if (visitorProfile && ['Player', 'Visitor', 'Other'].includes(visitorProfile as string)) {
            options.visitorProfile = visitorProfile as Visitor['visitor_profile'];
        }

        if (search) {
            options.search = search as string;
        }

        const visitors = await VisitorDAO.getAll(options);
        res.send(visitors);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function updateVisitor(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
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

        const visitor = await VisitorDAO.getById(id);
        if (!visitor) {
            next(new EntityNotFoundError('Visitor', id));
            return;
        }

        if (body.visitor_profile === 'Other' && !body.visitor_profile_other) {
            next(new BadRequestError('visitor_profile_other is required when profile is Other'));
            return;
        }

        if (body.visitor_profile !== 'Other' && body.visitor_profile_other) {
            body.visitor_profile_other = null;
        }

        if (body.phone_number) {
            const phoneRegex = /^[0-9+()-]+$/;
            if (!phoneRegex.test(body.phone_number)) {
                next(new BadRequestError('Invalid phone number format'));
                return;
            }
        }

        // VALIDASI STAFF_ID JIKA DIUPDATE
        if (body.staff_id) {
            const isValidStaff = await VisitorDAO.validateStaff(body.staff_id);
            if (!isValidStaff) {
                next(new BadRequestError(`Staff with ID ${body.staff_id} not found or inactive`));
                return;
            }
        }

        const result = await VisitorDAO.update(id, body);
        res.send(result);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function checkOutVisitor(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const visitor = await VisitorDAO.getById(id);
        if (!visitor) {
            next(new EntityNotFoundError('Visitor', id));
            return;
        }

        if (visitor.checked_out_at) {
            next(new BadRequestError('Visitor already checked out'));
            return;
        }

        const result = await VisitorDAO.checkOut(id);
        res.send({ 
            message: 'Visitor checked out successfully',
            visitor: result 
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function deleteVisitor(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const visitor = await VisitorDAO.getById(id);
        if (!visitor) {
            next(new EntityNotFoundError('Visitor', id));
            return;
        }

        await VisitorDAO.deleteVisitor(id);
        res.send({ 
            message: 'Visitor deleted successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getVisitorStats(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { dateFrom, dateTo, timeRange } = req.query;

        let startDate: Date | undefined;
        let endDate: Date | undefined;

        // Handle time range filter for stats
        if (timeRange) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today

            switch (timeRange) {
                case 'today':
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    startDate = today;
                    endDate = tomorrow;
                    break;
                    
                case 'last7days':
                    const last7Days = new Date(today);
                    last7Days.setDate(last7Days.getDate() - 7);
                    startDate = last7Days;
                    endDate = new Date(); // Now
                    break;
                    
                case 'last30days':
                    const last30Days = new Date(today);
                    last30Days.setDate(last30Days.getDate() - 30);
                    startDate = last30Days;
                    endDate = new Date(); // Now
                    break;
                    
                case 'custom':
                    // For custom range, use dateFrom and dateTo
                    if (dateFrom) {
                        startDate = new Date(dateFrom as string);
                    }
                    if (dateTo) {
                        endDate = new Date(dateTo as string);
                    }
                    break;
            }
        } else {
            // Fallback to old parameters
            if (dateFrom) {
                startDate = new Date(dateFrom as string);
            }
            if (dateTo) {
                endDate = new Date(dateTo as string);
            }
        }

        const stats = await VisitorDAO.getStats(startDate, endDate);
        res.send(stats);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getVisitorByPhone(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { phone } = req.query;
        
        if (!phone) {
            next(new BadRequestError('Phone number is required'));
            return;
        }

        const visitor = await VisitorDAO.getByPhoneNumber(phone as string);
        
        if (!visitor) {
            next(new BadRequestError(`Visitor with phone number ${phone} not found`));
            return;
        }

        res.send(visitor);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function searchVisitors(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { query } = req.query;
        
        if (!query) {
            next(new BadRequestError('Search query is required'));
            return;
        }

        const visitors = await VisitorDAO.getAll({
            search: query as string,
            includeCheckedOut: true
        });

        res.send(visitors);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getRecentActiveVisitors(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { limit } = req.query;
        const visitors = await VisitorDAO.getRecentActiveVisitors(
            limit ? parseInt(limit as string) : 10
        );
        res.send(visitors);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

// TAMBAHAN: Function untuk mendapatkan daftar staff untuk dropdown
export async function getStaffForDropdown(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const staff = await StaffDAO.getActiveStaff();
        res.send(staff);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

// TAMBAHAN: Validasi nama staff sebelum create/update visitor
export async function validateStaffName(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { name } = req.query;
        
        if (!name) {
            next(new BadRequestError('Staff name is required'));
            return;
        }

        const staff = await StaffDAO.getStaffByName(name as string);
        
        if (!staff) {
            res.send({ 
                valid: false, 
                message: `Staff "${name}" not found or inactive` 
            });
            return;
        }

        res.send({ 
            valid: true, 
            staff: {
                id: staff.id,
                name: staff.name,
                phone_number: staff.phone_number
            }
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}