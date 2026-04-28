import { Prisma, treatment_plan_status } from '@prisma/client';
import prisma from '../services/prisma';

const model = prisma.treatment_plan;

export interface CreateTreatmentPlanData {
    patient_id: number;
    staff_id?: number | null;
    user_id?: number | null;
    title: string;
    service_type?: string | null;
    injury_type?: string | null;
    area_concern?: string | null;
    diagnosis_result?: string | null;
    expected_recovery_time?: string | null;
    recovery_goals?: string | null;
    image_url?: string | null;
    status?: treatment_plan_status;
    started_at: Date;
    ended_at?: Date | null;
}

export interface UpdateTreatmentPlanData {
    staff_id?: number | null;
    user_id?: number | null;
    title?: string;
    service_type?: string | null;
    injury_type?: string | null;
    area_concern?: string | null;
    diagnosis_result?: string | null;
    expected_recovery_time?: string | null;
    recovery_goals?: string | null;
    image_url?: string | null;
    status?: treatment_plan_status;
    started_at?: Date;
    ended_at?: Date | null;
}

export interface GetAllOptions {
    patient_id?: number;
    staff_id?: number;
    user_id?: number;
    status?: treatment_plan_status;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

function parseDateOrNull(value: any): Date | null {
    if (!value) return null;
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
}

export function formatForTable(plan: any) {
    if (!plan) return null;
    return {
        id: plan.id,
        patient_id: plan.patient_id,
        patient_name: plan.patient?.name || '-',
        patient_code: plan.patient?.patient_code || '-',
        staff_id: plan.staff_id,
        staff_name: plan.staff?.name || '-',
        user_id: plan.user_id,
        user_name: plan.users?.username || '-',
        user_role: plan.users?.role || '-',
        title: plan.title,
        service_type: plan.service_type,
        injury_type: plan.injury_type,
        area_concern: plan.area_concern,
        diagnosis_result: plan.diagnosis_result,
        expected_recovery_time: plan.expected_recovery_time,
        recovery_goals: plan.recovery_goals,
        image_url: plan.image_url,
        status: plan.status,
        started_at: plan.started_at,
        ended_at: plan.ended_at,
        created_at: plan.created_at,
        updated_at: plan.updated_at,
        treatment_logs: plan.treatment_log || [] // array of logs if included
    };
}

export function getRequired(): Array<keyof CreateTreatmentPlanData> {
    return ['patient_id', 'title', 'started_at'];
}

export function formatCreate(data: any): Prisma.treatment_planUncheckedCreateInput {
    const formatted: Prisma.treatment_planUncheckedCreateInput = {
        patient_id: data.patient_id,
        title: data.title,
        started_at: new Date(data.started_at)
    };

    if (data.staff_id !== undefined) formatted.staff_id = data.staff_id;
    if (data.user_id !== undefined) formatted.user_id = data.user_id;
    if (data.service_type !== undefined) formatted.service_type = data.service_type;
    if (data.injury_type !== undefined) formatted.injury_type = data.injury_type;
    if (data.area_concern !== undefined) formatted.area_concern = data.area_concern;
    if (data.diagnosis_result !== undefined) formatted.diagnosis_result = data.diagnosis_result;
    if (data.expected_recovery_time !== undefined) formatted.expected_recovery_time = data.expected_recovery_time;
    if (data.recovery_goals !== undefined) formatted.recovery_goals = data.recovery_goals;
    if (data.image_url !== undefined) formatted.image_url = data.image_url;
    if (data.status !== undefined) formatted.status = data.status;

    const endedAt = parseDateOrNull(data.ended_at);
    if (endedAt) formatted.ended_at = endedAt;

    return formatted;
}

export async function create(data: Prisma.treatment_planUncheckedCreateInput): Promise<any> {
    const result = await model.create({
        data,
        include: { patient: true, staff: true, users: true }
    });
    return formatForTable(result);
}

export async function getById(id: number): Promise<any | null> {
    const result = await model.findUnique({
        where: { id },
        include: { 
            patient: true, 
            staff: true, 
            users: true,
            treatment_log: {
                orderBy: { visit_date: 'asc' },
                include: {
                    staff: true,
                    users: true,
                    users_treatment_log_user_idTousers: true
                }
            }
        }
    });
    if (!result) return null;

    const formatted = formatForTable(result);
    // Format each log entry to include staff_name etc.
    if (formatted && result.treatment_log) {
        formatted.treatment_logs = result.treatment_log.map((log: any) => ({
            id: log.id,
            treatment_plan_id: log.treatment_plan_id,
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
            range_of_motion_impact: log.range_of_motion_impact,
            treatment: log.treatment,
            exercise: log.exercise,
            homework: log.homework,
            recovery_tips: log.recovery_tips,
            recommended_next_session: log.recommended_next_session,
            notes: log.notes,
            created_at: log.created_at,
            updated_at: log.updated_at
        }));
    }
    return formatted;
}

export async function getAll(options?: GetAllOptions): Promise<any[]> {
    const where: Prisma.treatment_planWhereInput = {};

    if (options?.patient_id) where.patient_id = options.patient_id;
    if (options?.staff_id) where.staff_id = options.staff_id;
    if (options?.user_id) where.user_id = options.user_id;
    if (options?.status) where.status = options.status;

    if (options?.search) {
        where.OR = [
            { title: { contains: options.search } },
            { service_type: { contains: options.search } },
            { injury_type: { contains: options.search } },
            { area_concern: { contains: options.search } },
            { diagnosis_result: { contains: options.search } },
            { recovery_goals: { contains: options.search } },
            { patient: { name: { contains: options.search } } },
            { patient: { patient_code: { contains: options.search } } }
        ];
    }

    const queryOptions: Prisma.treatment_planFindManyArgs = {
        where,
        include: { patient: true, staff: true, users: true },
        orderBy: [{ started_at: 'desc' }, { id: 'desc' }]
    };

    if (options?.limit) queryOptions.take = options.limit;
    if (options?.offset) queryOptions.skip = options.offset;

    const results = await model.findMany(queryOptions);
    return results.map(formatForTable);
}

export async function update(id: number, data: UpdateTreatmentPlanData): Promise<any> {
    const updateData: Prisma.treatment_planUncheckedUpdateInput = {
        updated_at: new Date()
    };

    if (data.staff_id !== undefined) updateData.staff_id = data.staff_id;
    if (data.user_id !== undefined) updateData.user_id = data.user_id;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.service_type !== undefined) updateData.service_type = data.service_type;
    if (data.injury_type !== undefined) updateData.injury_type = data.injury_type;
    if (data.area_concern !== undefined) updateData.area_concern = data.area_concern;
    if (data.diagnosis_result !== undefined) updateData.diagnosis_result = data.diagnosis_result;
    if (data.expected_recovery_time !== undefined) updateData.expected_recovery_time = data.expected_recovery_time;
    if (data.recovery_goals !== undefined) updateData.recovery_goals = data.recovery_goals;
    if (data.image_url !== undefined) updateData.image_url = data.image_url;
    if (data.status !== undefined) updateData.status = data.status;

    if (data.started_at !== undefined) updateData.started_at = new Date(data.started_at);
    if (data.ended_at !== undefined) {
        const endedAt = parseDateOrNull(data.ended_at);
        updateData.ended_at = endedAt ?? null;
    }

    const result = await model.update({
        where: { id },
        data: updateData,
        include: { patient: true, staff: true, users: true }
    });

    return formatForTable(result);
}

export async function deletePlan(id: number): Promise<any> {
    return await model.delete({
        where: { id },
        include: { patient: true, staff: true, users: true }
    });
}
