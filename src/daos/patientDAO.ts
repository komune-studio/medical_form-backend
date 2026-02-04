import { Prisma } from '@prisma/client';
import prisma from '../services/prisma';
import hidash from '../utils/hidash';

const model = prisma.patient;

export interface CreatePatientData {
    name: string;
    gender: Prisma.patientCreateInput['gender'];
    patient_code?: string | null;
    date_of_birth?: Date | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    blood_type?: Prisma.patientCreateInput['blood_type'] | null;
    allergies?: string | null;
    medical_notes?: string | null;
    created_by?: number | null;
}

export interface UpdatePatientData {
    name?: string;
    gender?: Prisma.patientCreateInput['gender'];
    patient_code?: string | null;
    date_of_birth?: Date | null;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    blood_type?: Prisma.patientCreateInput['blood_type'] | null;
    allergies?: string | null;
    medical_notes?: string | null;
}

export interface GetAllOptions {
    search?: string;
    gender?: Prisma.patientCreateInput['gender'];
    blood_type?: Prisma.patientCreateInput['blood_type'];
    created_by?: number;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
}

// Format rapi untuk tabel/grid display
export function formatPatientForTable(patient: any) {
    if (!patient) return null;
    
    // Hitung usia dari date_of_birth
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
        blood_type: patient.blood_type,
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
    patientsByBloodType: Array<{
        blood_type: Prisma.patientCreateInput['blood_type'];
        _count: number;
    }>;
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
        gender: data.gender
    };

    // Generate patient code jika tidak ada
    if (!data.patient_code) {
        formatted.patient_code = `PAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    } else {
        formatted.patient_code = data.patient_code;
    }

    // Optional fields
    if (data.date_of_birth) formatted.date_of_birth = new Date(data.date_of_birth);
    if (data.phone) formatted.phone = data.phone;
    if (data.email) formatted.email = data.email;
    if (data.address) formatted.address = data.address;
    if (data.blood_type) formatted.blood_type = data.blood_type;
    if (data.allergies) formatted.allergies = data.allergies;
    if (data.medical_notes) formatted.medical_notes = data.medical_notes;
    if (data.created_by) formatted.users = { connect: { id: data.created_by } };

    return formatted;
}

export async function create(data: Prisma.patientCreateInput): Promise<any> {
    // Auto generate patient code jika kosong
    if (!data.patient_code || data.patient_code.trim() === '') {
        // Cari patient dengan ID terbesar
        const lastPatient = await prisma.patient.findFirst({
            orderBy: { id: 'desc' },
            select: { id: true, patient_code: true }
        });
        
        let nextNumber = 1;
        
        if (lastPatient?.patient_code) {
            // Extract number dari patient_code yang ada
            const matches = lastPatient.patient_code.match(/PAT-(\d+)/);
            if (matches && matches[1]) {
                nextNumber = parseInt(matches[1]) + 1;
            } else {
                nextNumber = lastPatient.id + 1;
            }
        } else if (lastPatient?.id) {
            nextNumber = lastPatient.id + 1;
        }
        
        data.patient_code = `PAT-${nextNumber.toString().padStart(6, '0')}`;
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

    if (options?.blood_type) {
        where.blood_type = options.blood_type;
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

    // Build query options
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

    // Pagination
    if (options?.limit) {
        queryOptions.take = options.limit;
    }
    if (options?.offset) {
        queryOptions.skip = options.offset;
    }

    const results = await model.findMany(queryOptions);
    
    // Format rapi buat tabel
    return results.map(formatPatientForTable);
}

export async function update(id: number, data: UpdatePatientData): Promise<any> {
    const updateData: Prisma.patientUpdateInput = {
        ...data,
        updated_at: new Date()
    };

    // Handle date_of_birth conversion
    if (data.date_of_birth !== undefined) {
        updateData.date_of_birth = data.date_of_birth ? new Date(data.date_of_birth) : null;
    }

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

    const patientsByBloodType = await model.groupBy({
        by: ['blood_type'],
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

    return {
        totalPatients,
        patientsByGender,
        patientsByBloodType,
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

// Validasi email unik
export async function validateEmailUnique(email: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.patientWhereInput = { email };
    
    if (excludeId) {
        where.NOT = { id: excludeId };
    }

    const existing = await model.findFirst({ where });
    return !existing;
}

// Validasi phone unik
export async function validatePhoneUnique(phone: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.patientWhereInput = { phone };
    
    if (excludeId) {
        where.NOT = { id: excludeId };
    }

    const existing = await model.findFirst({ where });
    return !existing;
}

// Validasi patient code unik
export async function validatePatientCodeUnique(patient_code: string, excludeId?: number): Promise<boolean> {
    const where: Prisma.patientWhereInput = { patient_code };
    
    if (excludeId) {
        where.NOT = { id: excludeId };
    }

    const existing = await model.findFirst({ where });
    return !existing;
}