import { Prisma } from '@prisma/client';
import prisma from '../services/prisma';
import hidash from '../utils/hidash';
import { fetchImageAsBase64, isValidImageUrl } from '../utils/Imageutils';

const model = prisma.medical_history;

export interface CreateMedicalHistoryData {
    patient_id: number;
    appointment_date: Date;
    staff_id?: number | null;
    service_type?: string | null;
    area_concern?: string | null; // BARU
    diagnosis_result?: string | null;
    pain_before?: number | null;
    pain_after?: number | null;
    range_of_motion_impact?: string | null; // BARU
    treatments?: string | null;
    exercise?: string | null;
    homework?: string | null;
    recovery_tips?: string | null; // BARU
    recommended_next_session?: string | null;
    additional_notes?: string | null;
    body_annotation?: string | null;
}

export interface UpdateMedicalHistoryData {
    appointment_date?: Date;
    staff_id?: number | null;
    service_type?: string | null;
    area_concern?: string | null; // BARU
    diagnosis_result?: string | null;
    pain_before?: number | null;
    pain_after?: number | null;
    range_of_motion_impact?: string | null; // BARU
    treatments?: string | null;
    exercise?: string | null;
    homework?: string | null;
    recovery_tips?: string | null; // BARU
    recommended_next_session?: string | null;
    additional_notes?: string | null;
    body_annotation?: string | null;
}

export interface GetAllOptions {
    patient_id?: number;
    staff_id?: number;
    service_type?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface ServiceTypeStat {
    service_type: string | null;
    _count: number;
}

export interface MedicalHistoryStats {
    totalRecords: number;
    recordsByServiceType: ServiceTypeStat[];
    averagePainReduction: number;
    recentRecords: any[];
}

export function formatMedicalHistoryForTable(history: any) {
    if (!history) return null;
    
    return {
        id: history.id,
        patient_id: history.patient_id,
        patient_name: history.patient?.name || '-',
        patient_code: history.patient?.patient_code || '-',
        appointment_date: history.appointment_date,
        staff_id: history.staff_id,
        staff_name: history.staff?.name || '-',
        service_type: history.service_type,
        area_concern: history.area_concern, // BARU
        diagnosis_result: history.diagnosis_result,
        pain_before: history.pain_before,
        pain_after: history.pain_after,
        pain_reduction: history.pain_before && history.pain_after ? 
            history.pain_before - history.pain_after : null,
        range_of_motion_impact: history.range_of_motion_impact, // BARU
        treatments: history.treatments,
        exercise: history.exercise,
        homework: history.homework,
        recovery_tips: history.recovery_tips, // BARU
        recommended_next_session: history.recommended_next_session,
        additional_notes: history.additional_notes,
        body_annotation: history.body_annotation,
        created_at: history.created_at,
        updated_at: history.updated_at
    };
}

export function getRequired(): Array<keyof CreateMedicalHistoryData> {
    const required: Array<keyof CreateMedicalHistoryData> = [
        'patient_id',
        'appointment_date'
    ];
    return required;
}

export function formatCreate(data: any): Prisma.medical_historyCreateInput {
    const formatted: Prisma.medical_historyCreateInput = {
        patient: { connect: { id: data.patient_id } },
        appointment_date: new Date(data.appointment_date)
    };

    // Optional fields
    if (data.staff_id) formatted.staff = { connect: { id: data.staff_id } };
    if (data.service_type) formatted.service_type = data.service_type;
    if (data.area_concern) formatted.area_concern = data.area_concern; // BARU
    if (data.diagnosis_result) formatted.diagnosis_result = data.diagnosis_result;
    if (data.pain_before !== undefined) formatted.pain_before = data.pain_before;
    if (data.pain_after !== undefined) formatted.pain_after = data.pain_after;
    if (data.range_of_motion_impact) formatted.range_of_motion_impact = data.range_of_motion_impact; // BARU
    if (data.treatments) formatted.treatments = data.treatments;
    if (data.exercise) formatted.exercise = data.exercise;
    if (data.homework) formatted.homework = data.homework;
    if (data.recovery_tips) formatted.recovery_tips = data.recovery_tips; // BARU
    if (data.recommended_next_session) formatted.recommended_next_session = data.recommended_next_session;
    if (data.additional_notes) formatted.additional_notes = data.additional_notes;
    if (data.body_annotation) formatted.body_annotation = data.body_annotation;

    return formatted;
}

export async function create(data: Prisma.medical_historyCreateInput): Promise<any> {
    const result = await model.create({ 
        data,
        include: {
            patient: true,
            staff: true
        }
    });
    return formatMedicalHistoryForTable(result);
}

export async function getById(id: number): Promise<any | null> {
    const result = await model.findUnique({ 
        where: { id },
        include: {
            patient: true,
            staff: true
        }
    });
    return formatMedicalHistoryForTable(result);
}

export async function getByPatientId(patient_id: number, options?: GetAllOptions): Promise<any[]> {
    const where: Prisma.medical_historyWhereInput = { patient_id };
    
    if (options?.dateFrom && options?.dateTo) {
        where.appointment_date = {
            gte: options.dateFrom,
            lte: options.dateTo
        };
    }
    
    if (options?.service_type) {
        where.service_type = options.service_type;
    }
    
    if (options?.staff_id) {
        where.staff_id = options.staff_id;
    }

    const queryOptions: Prisma.medical_historyFindManyArgs = {
        where,
        include: {
            patient: true,
            staff: true
        },
        orderBy: {
            appointment_date: 'desc'
        }
    };

    if (options?.limit) queryOptions.take = options.limit;
    if (options?.offset) queryOptions.skip = options.offset;

    const results = await model.findMany(queryOptions);
    return results.map(formatMedicalHistoryForTable);
}

export async function getAll(options?: GetAllOptions): Promise<any[]> {
    const where: Prisma.medical_historyWhereInput = {};

    if (options?.patient_id) {
        where.patient_id = options.patient_id;
    }

    if (options?.staff_id) {
        where.staff_id = options.staff_id;
    }

    if (options?.service_type) {
        where.service_type = options.service_type;
    }

    if (options?.search) {
        where.OR = [
            { service_type: { contains: options.search } },
            { area_concern: { contains: options.search } }, // BARU
            { diagnosis_result: { contains: options.search } },
            { treatments: { contains: options.search } },
            { exercise: { contains: options.search } },
            { recovery_tips: { contains: options.search } }, // BARU
            { patient: { name: { contains: options.search } } },
            { patient: { patient_code: { contains: options.search } } }
        ];
    }

    if (options?.dateFrom && options?.dateTo) {
        where.appointment_date = {
            gte: options.dateFrom,
            lte: options.dateTo
        };
    }

    const queryOptions: Prisma.medical_historyFindManyArgs = {
        where,
        include: {
            patient: true,
            staff: true
        },
        orderBy: [
            { appointment_date: 'desc' },
            { id: 'desc' }
        ]
    };

    if (options?.limit) queryOptions.take = options.limit;
    if (options?.offset) queryOptions.skip = options.offset;

    if (options?.sortBy) {
        const sortOrder = options.sortOrder || 'desc';
        queryOptions.orderBy = { [options.sortBy]: sortOrder } as any;
    }

    const results = await model.findMany(queryOptions);
    return results.map(formatMedicalHistoryForTable);
}

export async function update(id: number, data: UpdateMedicalHistoryData): Promise<any> {
    const updateData: Prisma.medical_historyUpdateInput = {
        updated_at: new Date()
    };

    if (data.appointment_date !== undefined) {
        updateData.appointment_date = new Date(data.appointment_date);
    }
    if (data.staff_id !== undefined) {
        updateData.staff = data.staff_id ? { connect: { id: data.staff_id } } : { disconnect: true };
    }
    if (data.service_type !== undefined) updateData.service_type = data.service_type;
    if (data.area_concern !== undefined) updateData.area_concern = data.area_concern; // BARU
    if (data.diagnosis_result !== undefined) updateData.diagnosis_result = data.diagnosis_result;
    if (data.pain_before !== undefined) updateData.pain_before = data.pain_before;
    if (data.pain_after !== undefined) updateData.pain_after = data.pain_after;
    if (data.range_of_motion_impact !== undefined) updateData.range_of_motion_impact = data.range_of_motion_impact; // BARU
    if (data.treatments !== undefined) updateData.treatments = data.treatments;
    if (data.exercise !== undefined) updateData.exercise = data.exercise;
    if (data.homework !== undefined) updateData.homework = data.homework;
    if (data.recovery_tips !== undefined) updateData.recovery_tips = data.recovery_tips; // BARU
    if (data.recommended_next_session !== undefined) updateData.recommended_next_session = data.recommended_next_session;
    if (data.additional_notes !== undefined) updateData.additional_notes = data.additional_notes;
    if (data.body_annotation !== undefined) updateData.body_annotation = data.body_annotation;

    const result = await model.update({
        where: { id },
        data: updateData,
        include: {
            patient: true,
            staff: true
        }
    });
    
    return formatMedicalHistoryForTable(result);
}

export async function deleteMedicalHistory(id: number): Promise<any> {
    return await model.delete({ 
        where: { id },
        include: {
            patient: true,
            staff: true
        }
    });
}

export async function getStats(dateFrom?: Date, dateTo?: Date): Promise<MedicalHistoryStats> {
    const where: Prisma.medical_historyWhereInput = {};
    
    if (dateFrom && dateTo) {
        where.appointment_date = {
            gte: dateFrom,
            lte: dateTo
        };
    }

    const totalRecords = await model.count({ where });
    
    const recordsByServiceTypeRaw = await model.groupBy({
        by: ['service_type'],
        where,
        _count: true
    });

    const recordsByServiceType: ServiceTypeStat[] = recordsByServiceTypeRaw.map(record => ({
        service_type: record.service_type,
        _count: record._count
    }));

    const painData = await model.findMany({
        where: {
            ...where,
            pain_before: { not: null },
            pain_after: { not: null }
        },
        select: {
            pain_before: true,
            pain_after: true
        }
    });

    let averagePainReduction = 0;
    if (painData.length > 0) {
        const totalReduction = painData.reduce((sum, record) => {
            return sum + (record.pain_before! - record.pain_after!);
        }, 0);
        averagePainReduction = totalReduction / painData.length;
    }

    const recentRecords = await model.findMany({
        where,
        include: {
            patient: true,
            staff: true
        },
        take: 10,
        orderBy: { appointment_date: 'desc' }
    });

    return {
        totalRecords,
        recordsByServiceType,
        averagePainReduction: parseFloat(averagePainReduction.toFixed(2)),
        recentRecords: recentRecords.map(formatMedicalHistoryForTable)
    };
}

export async function getRecentMedicalHistories(limit: number = 10): Promise<any[]> {
    const results = await model.findMany({
        include: {
            patient: true,
            staff: true
        },
        take: limit,
        orderBy: { appointment_date: 'desc' }
    });
    
    return results.map(formatMedicalHistoryForTable);
}

export async function searchMedicalHistories(searchTerm: string): Promise<any[]> {
    const results = await model.findMany({
        where: {
            OR: [
                { service_type: { contains: searchTerm } },
                { area_concern: { contains: searchTerm } }, // BARU
                { diagnosis_result: { contains: searchTerm } },
                { treatments: { contains: searchTerm } },
                { recovery_tips: { contains: searchTerm } }, // BARU
                { patient: { name: { contains: searchTerm } } },
                { patient: { patient_code: { contains: searchTerm } } },
                { staff: { name: { contains: searchTerm } } }
            ]
        },
        include: {
            patient: true,
            staff: true
        },
        orderBy: { appointment_date: 'desc' },
        take: 50
    });
    
    return results.map(formatMedicalHistoryForTable);
}

export async function validatePatientExists(patient_id: number): Promise<boolean> {
    const patient = await prisma.patient.findUnique({
        where: { id: patient_id }
    });
    return !!patient;
}

export async function validateStaffExists(staff_id: number): Promise<boolean> {
    const staff = await prisma.staff.findUnique({
        where: { id: staff_id }
    });
    return !!staff;
}

export async function getByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    const results = await model.findMany({
        where: {
            appointment_date: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            patient: true,
            staff: true
        },
        orderBy: { appointment_date: 'asc' }
    });
    
    return results.map(formatMedicalHistoryForTable);
}

export async function getUpcomingAppointments(days: number = 7): Promise<any[]> {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    
    const results = await model.findMany({
        where: {
            appointment_date: {
                gte: today,
                lte: endDate
            }
        },
        include: {
            patient: true,
            staff: true
        },
        orderBy: { appointment_date: 'asc' }
    });
    
    return results.map(formatMedicalHistoryForTable);
}

/**
 * 🔥 UPDATED: Get patient progress report with base64 encoded images
 */
export async function getPatientProgressReport(patient_id: number): Promise<any> {
    const histories = await model.findMany({
        where: { patient_id },
        include: {
            patient: true,
            staff: true
        },
        orderBy: {
            appointment_date: 'asc'
        }
    });

    // Convert body_annotation URLs to base64 concurrently
    const sessionsWithBase64Images = await Promise.all(
        histories.map(async (history, index) => {
            const formatted = formatMedicalHistoryForTable(history);
            
            // Guard clause for null formatted result
            if (!formatted) {
                return null;
            }
            
            // If body_annotation exists and is a valid image URL, fetch and convert to base64
            let body_annotation_base64: string | null = null;
            
            if (isValidImageUrl(formatted.body_annotation)) {
                console.log(`Fetching image for session ${index + 1}: ${formatted.body_annotation}`);
                body_annotation_base64 = await fetchImageAsBase64(formatted.body_annotation);
                
                if (body_annotation_base64) {
                    console.log(`✅ Successfully converted image to base64 for session ${index + 1}`);
                } else {
                    console.warn(`⚠️ Failed to convert image for session ${index + 1}`);
                }
            }
            
            return {
                ...formatted,
                session_number: index + 1,
                session_date: history.appointment_date,
                body_annotation_url: formatted.body_annotation, // Keep original URL
                body_annotation_base64: body_annotation_base64  // Add base64 version
            };
        })
    );

    // Filter out null sessions
    const validSessions = sessionsWithBase64Images.filter(session => session !== null);

    return {
        patient: histories[0]?.patient || null,
        total_sessions: validSessions.length,
        sessions: validSessions
    };
}