import { Prisma } from '@prisma/client';
import prisma from '../services/prisma';
import hidash from '../utils/hidash';

const model = prisma.patient;

export interface CreatePatientData {
    name: string;
    gender: Prisma.patientCreateInput['gender'];
    patient_code?: string;
    date_of_birth?: Date | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    height?: number | null;
    weight?: number | null;
    allergies?: string | null;
    medical_notes?: string | null;
    created_by?: number | null;
}

export interface UpdatePatientData {
    name?: string;
    gender?: Prisma.patientCreateInput['gender'];
    patient_code?: string;
    date_of_birth?: Date | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    height?: number | null;
    weight?: number | null;
    allergies?: string | null;
    medical_notes?: string | null;
}

export interface GetAllOptions {
    search?: string;
    gender?: Prisma.patientCreateInput['gender'];
    created_by?: number;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
}

// Helper untuk generate next patient code: PAT-1, PAT-2, etc
async function generateNextPatientCode(): Promise<string> {
    // Simple: selalu gunakan ID + 1
    const lastPatient = await prisma.patient.findFirst({
        orderBy: { id: 'desc' },
        select: { id: true }
    });
    
    const nextId = (lastPatient?.id || 0) + 1;
    return `PAT-${nextId}`;
}

export function formatPatientForTable(patient: any) {
    if (!patient) return null;
    
    let age = null;
    if (patient.date_of_birth) {
        const birthDate = new Date(patient.date_of_birth);
        const today = new Date();
        age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
    }

    // Calculate BMI if height and weight are available
    let bmi = null;
    if (patient.height && patient.weight) {
        const heightInMeters = Number(patient.height) / 100;
        bmi = Number(patient.weight) / (heightInMeters * heightInMeters);
        bmi = Math.round(bmi * 10) / 10; // Round to 1 decimal
    }
    
    return {
        id: patient.id,
        patient_code: patient.patient_code,
        name: patient.name,
        gender: patient.gender,
        age: age,
        date_of_birth: patient.date_of_birth,
        phone: patient.phone,
        email: patient.email,
        address: patient.address,
        height: patient.height ? Number(patient.height) : null,
        weight: patient.weight ? Number(patient.weight) : null,
        bmi: bmi,
        allergies: patient.allergies,
        medical_notes: patient.medical_notes,
        created_by: patient.created_by,
        created_at: patient.created_at,
        updated_at: patient.updated_at,
        created_by_name: patient.users?.username || '-'
    };
}

export interface PatientStats {
    totalPatients: number;
    patientsByGender: Array<{
        gender: Prisma.patientCreateInput['gender'];
        _count: number;
    }>;
    averageAge: number | null;
    averageBMI: number | null;
    recentPatients: any[];
}

export function getRequired(): Array<keyof CreatePatientData> {
    const required: Array<keyof CreatePatientData> = [
        'name',
        'gender'
    ];
    return required;
}

export function formatCreate(data: any): Prisma.patientCreateInput {
    const formatted: Prisma.patientCreateInput = {
        name: data.name,
        gender: data.gender,
        patient_code: data.patient_code || '' // Biarkan kosong
    };

    // Optional fields
    if (data.date_of_birth) formatted.date_of_birth = new Date(data.date_of_birth);
    if (data.phone) formatted.phone = data.phone;
    if (data.email) formatted.email = data.email;
    if (data.address) formatted.address = data.address;
    if (data.height) formatted.height = data.height;
    if (data.weight) formatted.weight = data.weight;
    if (data.allergies) formatted.allergies = data.allergies;
    if (data.medical_notes) formatted.medical_notes = data.medical_notes;
    if (data.created_by) formatted.users = { connect: { id: data.created_by } };

    return formatted;
}

export async function create(data: Prisma.patientCreateInput): Promise<any> {
    // Generate patient code jika kosong
    if (!data.patient_code || data.patient_code.trim() === '') {
        data.patient_code = await generateNextPatientCode();
    }

    const result = await model.create({ 
        data,
        include: {
            users: true
        }
    });
    return formatPatientForTable(result);
}

export async function getById(id: number): Promise<any | null> {
    const result = await model.findUnique({ 
        where: { id },
        include: {
            users: true
        }
    });
    return formatPatientForTable(result);
}

export async function getByPatientCode(patient_code: string): Promise<any | null> {
    const result = await model.findUnique({ 
        where: { patient_code },
        include: {
            users: true
        }
    });
    return formatPatientForTable(result);
}

export async function getAll(options?: GetAllOptions): Promise<any[]> {
    const where: Prisma.patientWhereInput = {};

    if (options?.search) {
        where.OR = [
            { name: { contains: options.search } },
            { patient_code: { contains: options.search } },
            { phone: { contains: options.search } },
            { email: { contains: options.search } }
        ];
    }

    if (options?.gender) {
        where.gender = options.gender;
    }

    if (options?.created_by) {
        where.created_by = options.created_by;
    }

    if (options?.dateFrom && options?.dateTo) {
        where.created_at = {
            gte: options.dateFrom,
            lte: options.dateTo
        };
    }

    const queryOptions: any = {
        where,
        include: {
            users: true
        },
        orderBy: [
            { id: 'desc' },
            { created_at: 'desc' }
        ]
    };

    if (options?.limit) {
        queryOptions.take = options.limit;
    }
    if (options?.offset) {
        queryOptions.skip = options.offset;
    }

    const results = await model.findMany(queryOptions);
    return results.map(formatPatientForTable);
}

export async function update(id: number, data: UpdatePatientData): Promise<any> {
    const updateData: Prisma.patientUpdateInput = {
        updated_at: new Date()
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.patient_code !== undefined && data.patient_code.trim() !== '') {
        updateData.patient_code = data.patient_code;
    }
    
    if (data.date_of_birth !== undefined) {
        updateData.date_of_birth = data.date_of_birth ? new Date(data.date_of_birth) : null;
    }
    
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.weight !== undefined) updateData.weight = data.weight;
    if (data.allergies !== undefined) updateData.allergies = data.allergies;
    if (data.medical_notes !== undefined) updateData.medical_notes = data.medical_notes;

    const result = await model.update({
        where: { id },
        data: updateData,
        include: {
            users: true
        }
    });
    
    return formatPatientForTable(result);
}

export async function deletePatient(id: number): Promise<any> {
    return await model.delete({ 
        where: { id },
        include: {
            users: true
        }
    });
}

export async function getByPhone(phone: string): Promise<any | null> {
    const result = await model.findFirst({ 
        where: { phone },
        include: {
            users: true
        },
        orderBy: { id: 'desc' }
    });
    
    return formatPatientForTable(result);
}

export async function getByEmail(email: string): Promise<any | null> {
    const result = await model.findFirst({ 
        where: { email },
        include: {
            users: true
        },
        orderBy: { id: 'desc' }
    });
    
    return formatPatientForTable(result);
}

export async function getStats(dateFrom?: Date, dateTo?: Date): Promise<PatientStats> {
    const where: Prisma.patientWhereInput = {};
    
    if (dateFrom && dateTo) {
        where.created_at = {
            gte: dateFrom,
            lte: dateTo
        };
    }

    const totalPatients = await model.count({ where });
    
    const patientsByGender = await model.groupBy({
        by: ['gender'],
        where,
        _count: true
    });

    const recentPatients = await model.findMany({
        where,
        include: {
            users: true
        },
        take: 10,
        orderBy: { id: 'desc' }
    });

    // Calculate average age
    const patientsWithDOB = await model.findMany({
        where: {
            ...where,
            date_of_birth: { not: null }
        },
        select: { date_of_birth: true }
    });

    let averageAge = null;
    if (patientsWithDOB.length > 0) {
        const today = new Date();
        const ages = patientsWithDOB.map(p => {
            const birthDate = new Date(p.date_of_birth!);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        });
        averageAge = Math.round(ages.reduce((a, b) => a + b, 0) / ages.length);
    }

    // Calculate average BMI
    const patientsWithBMI = await model.findMany({
        where: {
            ...where,
            height: { not: null },
            weight: { not: null }
        },
        select: { height: true, weight: true }
    });

    let averageBMI = null;
    if (patientsWithBMI.length > 0) {
        const bmis = patientsWithBMI.map(p => {
            const heightInMeters = Number(p.height!) / 100;
            return Number(p.weight!) / (heightInMeters * heightInMeters);
        });
        averageBMI = Math.round(bmis.reduce((a, b) => a + b, 0) / bmis.length * 10) / 10;
    }

    return {
        totalPatients,
        patientsByGender,
        averageAge,
        averageBMI,
        recentPatients: recentPatients.map(formatPatientForTable)
    };
}

export async function getRecentPatients(limit: number = 10): Promise<any[]> {
    const results = await model.findMany({
        include: {
            users: true
        },
        take: limit,
        orderBy: { id: 'desc' }
    });
    
    return results.map(formatPatientForTable);
}

export async function searchPatients(searchTerm: string): Promise<any[]> {
    const results = await model.findMany({
        where: {
            OR: [
                { name: { contains: searchTerm } },
                { patient_code: { contains: searchTerm } },
                { phone: { contains: searchTerm } },
                { email: { contains: searchTerm } }
            ]
        },
        include: {
            users: true
        },
        orderBy: { id: 'desc' },
        take: 50
    });
    
    return results.map(formatPatientForTable);
}

export async function getPatientsByDoctor(created_by: number): Promise<any[]> {
    const results = await model.findMany({
        where: {
            created_by
        },
        include: {
            users: true
        },
        orderBy: { id: 'desc' }
    });
    
    return results.map(formatPatientForTable);
}

export async function validateEmailUnique(email: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.patientWhereInput = { email };
    
    if (excludeId) {
        where.NOT = { id: excludeId };
    }

    const existing = await model.findFirst({ where });
    return !existing;
}

export async function validatePhoneUnique(phone: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.patientWhereInput = { phone };
    
    if (excludeId) {
        where.NOT = { id: excludeId };
    }

    const existing = await model.findFirst({ where });
    return !existing;
}

export async function validatePatientCodeUnique(patient_code: string, excludeId?: number): Promise<boolean> {
    if (!patient_code || patient_code.trim() === '') {
        return true;
    }
    
    const where: Prisma.patientWhereInput = { patient_code };
    
    if (excludeId) {
        where.NOT = { id: excludeId };
    }

    const existing = await model.findFirst({ where });
    return !existing;
}