import { NextFunction, Request, Response } from 'express';
import {
    BadParamIdError,
    BadRequestError,
    EntityNotFoundError,
    InternalServerError,
    MissingBodyError,
    UnauthorizedError,
} from '../errors/RequestErrorCollection';
import * as TreatmentPlanDAO from '../daos/treatmentPlanDAO';
import { validatePatientExists } from '../daos/medicalHistoryDAO'; // reuse existing validator if possible, or define locally. Wait, validatePatientExists is in medicalHistoryDAO.
import hidash from '../utils/hidash';
import prisma from '../services/prisma';

// Re-implementing validatePatientExists to avoid depending on medicalHistoryDAO
async function validatePatientExistsLocal(patient_id: number): Promise<boolean> {
    const patient = await prisma.patient.findUnique({ where: { id: patient_id } });
    return !!patient;
}

export async function createPlan(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const body = req.body;
        if (!body) {
            next(new MissingBodyError());
            return;
        }

        const isMissingProperty = hidash.checkPropertyV2(body, 'Treatment Plan', TreatmentPlanDAO.getRequired());
        if (isMissingProperty.message) {
            next(isMissingProperty);
            return;
        }

        const patientExists = await validatePatientExistsLocal(body.patient_id);
        if (!patientExists) {
            next(new BadRequestError('Patient not found'));
            return;
        }

        const userId = req.decoded?.id;
        if (!userId) {
            next(new UnauthorizedError('User not authenticated'));
            return;
        }

        const createData = {
            ...body,
            user_id: body.user_id ? parseInt(body.user_id) : parseInt(userId)
        };

        const result = await TreatmentPlanDAO.create(TreatmentPlanDAO.formatCreate(createData));
        res.send({
            http_code: 200,
            data: result,
            message: 'Treatment plan created successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getPlanById(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const plan = await TreatmentPlanDAO.getById(id);
        if (!plan) {
            next(new EntityNotFoundError('Treatment Plan', id));
            return;
        }

        res.send({
            http_code: 200,
            data: plan,
            message: 'Treatment plan retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getAllPlans(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const {
            patient_id,
            staff_id,
            user_id,
            status,
            search,
            limit,
            offset,
            sortBy,
            sortOrder
        } = req.query;

        const options: any = {};

        if (patient_id) options.patient_id = parseInt(patient_id as string);
        if (staff_id) options.staff_id = parseInt(staff_id as string);
        if (user_id) options.user_id = parseInt(user_id as string);
        if (status) options.status = status as any;
        if (search) options.search = search as string;
        if (limit) options.limit = parseInt(limit as string);
        if (offset) options.offset = parseInt(offset as string);
        if (sortBy) options.sortBy = sortBy as string;
        if (sortOrder) options.sortOrder = sortOrder as 'asc' | 'desc';

        const plans = await TreatmentPlanDAO.getAll(options);

        res.send({
            http_code: 200,
            data: plans,
            count: plans.length,
            message: 'Treatment plans retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function updatePlan(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
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

        const plan = await TreatmentPlanDAO.getById(id);
        if (!plan) {
            next(new EntityNotFoundError('Treatment Plan', id));
            return;
        }

        const result = await TreatmentPlanDAO.update(id, body);
        res.send({
            http_code: 200,
            data: result,
            message: 'Treatment plan updated successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function deletePlan(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const plan = await TreatmentPlanDAO.getById(id);
        if (!plan) {
            next(new EntityNotFoundError('Treatment Plan', id));
            return;
        }

        await TreatmentPlanDAO.deletePlan(id);
        res.send({
            http_code: 200,
            message: 'Treatment plan deleted successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}
