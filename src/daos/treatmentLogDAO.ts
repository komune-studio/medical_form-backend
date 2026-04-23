import { Prisma } from '@prisma/client';
import prisma from '../services/prisma';

const model = prisma.treatment_log;

export interface CreateTreatmentLogData {
    treatment_plan_id: number;
    staff_id?: number | null;
    user_id?: number | null;
    visit_date: Date;
    objective_progress?: string | null;
    pain_before?: number | null;
    pain_after?: number | null;
    range_of_motion_impact?: string | null;
    treatment?: string | null;
    exercise?: string | null;
    homework?: string | null;
    recovery_tips?: string | null;
    recommended_next_session?: Date | string | null;
    notes?: string | null;
    created_by?: number | null;
}

export interface UpdateTreatmentLogData {
    staff_id?: number | null;
    user_id?: number | null;
    visit_date?: Date;
    objective_progress?: string | null;
    pain_before?: number | null;
    pain_after?: number | null;
    range_of_motion_impact?: string | null;
    treatment?: string | null;
    exercise?: string | null;
    homework?: string | null;
    recovery_tips?: string | null;
    recommended_next_session?: Date | string | null;
    notes?: string | null;
}

export interface GetAllOptions {
    treatment_plan_id?: number;
    staff_id?: number;
    user_id?: number;
    created_by?: number;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
}

function parseDateOrNull(value: any): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

export function formatForTable(log: any) {
    if (!log) return null;
    return {
        id: log.id,
        treatment_plan_id: log.treatment_plan_id,
        plan_title: log.treatment_plan?.title || '-',
        staff_id: log.staff_id,
        staff_name: log.staff?.name || '-',
        user_id: log.user_id,
        user_name: log.users_treatment_log_user_idTousers?.username || '-',
        created_by: log.created_by,
        creator_name: log.users?.username || '-',
        visit_date: log.visit_date,
        objective_progress: log.objective_progress,
        pain_before: log.pain_before,
        pain_after: log.pain_after,
        pain_reduction: log.pain_before && log.pain_after ? log.pain_before - log.pain_after : null,
        range_of_motion_impact: log.range_of_motion_impact,
        treatment: log.treatment,
        exercise: log.exercise,
        homework: log.homework,
        recovery_tips: log.recovery_tips,
        recommended_next_session: log.recommended_next_session,
        notes: log.notes,
        created_at: log.created_at,
        updated_at: log.updated_at
    };
}

export function getRequired(): Array<keyof CreateTreatmentLogData> {
    return ['treatment_plan_id', 'visit_date'];
}

export function formatCreate(data: any): Prisma.treatment_logUncheckedCreateInput {
    const formatted: Prisma.treatment_logUncheckedCreateInput = {
        treatment_plan_id: data.treatment_plan_id,
        visit_date: new Date(data.visit_date)
    };

    if (data.staff_id !== undefined) formatted.staff_id = data.staff_id;
    if (data.user_id !== undefined) formatted.user_id = data.user_id;
    if (data.created_by !== undefined) formatted.created_by = data.created_by;
    if (data.objective_progress !== undefined) formatted.objective_progress = data.objective_progress;
    if (data.pain_before !== undefined) formatted.pain_before = data.pain_before;
    if (data.pain_after !== undefined) formatted.pain_after = data.pain_after;
    if (data.range_of_motion_impact !== undefined) formatted.range_of_motion_impact = data.range_of_motion_impact;
    if (data.treatment !== undefined) formatted.treatment = data.treatment;
    if (data.exercise !== undefined) formatted.exercise = data.exercise;
    if (data.homework !== undefined) formatted.homework = data.homework;
    if (data.recovery_tips !== undefined) formatted.recovery_tips = data.recovery_tips;
    if (data.notes !== undefined) formatted.notes = data.notes;

    const nextSession = parseDateOrNull(data.recommended_next_session);
    if (nextSession) formatted.recommended_next_session = nextSession;

    return formatted;
}

export async function create(data: Prisma.treatment_logUncheckedCreateInput): Promise<any> {
    const result = await model.create({
        data,
        include: { 
            treatment_plan: true, 
            staff: true, 
            users: true, // created_by
            users_treatment_log_user_idTousers: true // user_id
        }
    });
    return formatForTable(result);
}

export async function getById(id: number): Promise<any | null> {
    const result = await model.findUnique({
        where: { id },
        include: { 
            treatment_plan: true, 
            staff: true, 
            users: true,
            users_treatment_log_user_idTousers: true
        }
    });
    return formatForTable(result);
}

export async function getAll(options?: GetAllOptions): Promise<any[]> {
    const where: Prisma.treatment_logWhereInput = {};

    if (options?.treatment_plan_id) where.treatment_plan_id = options.treatment_plan_id;
    if (options?.staff_id) where.staff_id = options.staff_id;
    if (options?.user_id) where.user_id = options.user_id;
    if (options?.created_by) where.created_by = options.created_by;

    if (options?.dateFrom && options?.dateTo) {
        where.visit_date = { gte: options.dateFrom, lte: options.dateTo };
    }

    const queryOptions: Prisma.treatment_logFindManyArgs = {
        where,
        include: { 
            treatment_plan: true, 
            staff: true, 
            users: true,
            users_treatment_log_user_idTousers: true
        },
        orderBy: [{ visit_date: 'desc' }, { id: 'desc' }]
    };

    if (options?.limit) queryOptions.take = options.limit;
    if (options?.offset) queryOptions.skip = options.offset;

    const results = await model.findMany(queryOptions);
    return results.map(formatForTable);
}

export async function update(id: number, data: UpdateTreatmentLogData): Promise<any> {
    const updateData: Prisma.treatment_logUncheckedUpdateInput = {
        updated_at: new Date()
    };

    if (data.staff_id !== undefined) updateData.staff_id = data.staff_id;
    if (data.user_id !== undefined) updateData.user_id = data.user_id;
    if (data.objective_progress !== undefined) updateData.objective_progress = data.objective_progress;
    if (data.pain_before !== undefined) updateData.pain_before = data.pain_before;
    if (data.pain_after !== undefined) updateData.pain_after = data.pain_after;
    if (data.range_of_motion_impact !== undefined) updateData.range_of_motion_impact = data.range_of_motion_impact;
    if (data.treatment !== undefined) updateData.treatment = data.treatment;
    if (data.exercise !== undefined) updateData.exercise = data.exercise;
    if (data.homework !== undefined) updateData.homework = data.homework;
    if (data.recovery_tips !== undefined) updateData.recovery_tips = data.recovery_tips;
    if (data.notes !== undefined) updateData.notes = data.notes;

    if (data.visit_date !== undefined) updateData.visit_date = new Date(data.visit_date);
    if (data.recommended_next_session !== undefined) {
        const nextSession = parseDateOrNull(data.recommended_next_session);
        updateData.recommended_next_session = nextSession ?? null;
    }

    const result = await model.update({
        where: { id },
        data: updateData,
        include: { 
            treatment_plan: true, 
            staff: true, 
            users: true,
            users_treatment_log_user_idTousers: true
        }
    });

    return formatForTable(result);
}

export async function deleteLog(id: number): Promise<any> {
    return await model.delete({
        where: { id },
        include: { 
            treatment_plan: true, 
            staff: true, 
            users: true,
            users_treatment_log_user_idTousers: true
        }
    });
}
