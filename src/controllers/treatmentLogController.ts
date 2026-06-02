import { NextFunction, Request, Response } from 'express';
import {
    BadParamIdError,
    BadRequestError,
    EntityNotFoundError,
    InternalServerError,
    MissingBodyError,
    UnauthorizedError,
} from '../errors/RequestErrorCollection';
import * as TreatmentLogDAO from '../daos/treatmentLogDAO';
import * as TreatmentPlanDAO from '../daos/treatmentPlanDAO';
import hidash from '../utils/hidash';

export async function createLog(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const body = req.body;
        if (!body) {
            next(new MissingBodyError());
            return;
        }

        const isMissingProperty = hidash.checkPropertyV2(body, 'Treatment Log', TreatmentLogDAO.getRequired());
        if (isMissingProperty.message) {
            next(isMissingProperty);
            return;
        }

        const plan = await TreatmentPlanDAO.getById(body.treatment_plan_id);
        if (!plan) {
            next(new BadRequestError('Treatment plan not found'));
            return;
        }

        const userId = req.decoded?.id;
        if (!userId) {
            next(new UnauthorizedError('User not authenticated'));
            return;
        }

        // Validate pain scale
        if (body.pain_before !== undefined && (body.pain_before < 1 || body.pain_before > 10)) {
            next(new BadRequestError('Pain before must be between 1 and 10'));
            return;
        }

        if (body.pain_after !== undefined && (body.pain_after < 1 || body.pain_after > 10)) {
            next(new BadRequestError('Pain after must be between 1 and 10'));
            return;
        }

        const createData = {
            ...body,
            user_id: body.user_id ? parseInt(body.user_id) : parseInt(userId),
            created_by: parseInt(userId) // The user making the request inputs the data
        };

        const result = await TreatmentLogDAO.create(TreatmentLogDAO.formatCreate(createData));
        res.send({
            http_code: 200,
            data: result,
            message: 'Treatment log created successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getLogById(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const log = await TreatmentLogDAO.getById(id);
        if (!log) {
            next(new EntityNotFoundError('Treatment Log', id));
            return;
        }

        res.send({
            http_code: 200,
            data: log,
            message: 'Treatment log retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getAllLogs(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const {
            treatment_plan_id,
            staff_id,
            user_id,
            created_by,
            dateFrom,
            dateTo,
            limit,
            offset
        } = req.query;

        const options: any = {};

        if (treatment_plan_id) options.treatment_plan_id = parseInt(treatment_plan_id as string);
        if (staff_id) options.staff_id = parseInt(staff_id as string);
        if (user_id) options.user_id = parseInt(user_id as string);
        if (created_by) options.created_by = parseInt(created_by as string);
        if (dateFrom) options.dateFrom = new Date(dateFrom as string);
        if (dateTo) options.dateTo = new Date(dateTo as string);
        if (limit) options.limit = parseInt(limit as string);
        if (offset) options.offset = parseInt(offset as string);

        const logs = await TreatmentLogDAO.getAll(options);

        res.send({
            http_code: 200,
            data: logs,
            count: logs.length,
            message: 'Treatment logs retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function updateLog(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
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

        const log = await TreatmentLogDAO.getById(id);
        if (!log) {
            next(new EntityNotFoundError('Treatment Log', id));
            return;
        }

        // Validate pain scale
        if (body.pain_before !== undefined && (body.pain_before < 1 || body.pain_before > 10)) {
            next(new BadRequestError('Pain before must be between 1 and 10'));
            return;
        }

        if (body.pain_after !== undefined && (body.pain_after < 1 || body.pain_after > 10)) {
            next(new BadRequestError('Pain after must be between 1 and 10'));
            return;
        }

        const result = await TreatmentLogDAO.update(id, body);
        res.send({
            http_code: 200,
            data: result,
            message: 'Treatment log updated successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function deleteLog(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const log = await TreatmentLogDAO.getById(id);
        if (!log) {
            next(new EntityNotFoundError('Treatment Log', id));
            return;
        }

        await TreatmentLogDAO.deleteLog(id);
        res.send({
            http_code: 200,
            message: 'Treatment log deleted successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getFollowUpLogs(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const followUps = await TreatmentLogDAO.getFollowUpList();
        res.send({
            http_code: 200,
            data: followUps,
            count: followUps.length,
            message: 'Follow up sessions retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}
