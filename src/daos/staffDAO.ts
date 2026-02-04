import { staff as Staff } from '@prisma/client';
import prisma from '../services/prisma';
import hidash from '../utils/hidash';

const model = prisma.staff;

export interface CreateStaffData {
    user_id: number;  // Wajib ada karena relasi ke users
    name: string;
    email?: string | null;
    phone_number?: string | null;
    active?: boolean;
}

export interface UpdateStaffData {
    name?: string;
    email?: string | null;
    phone_number?: string | null;
    active?: boolean;
}

export interface GetAllStaffOptions {
    activeOnly?: boolean;
    search?: string;
}

export function getRequired(): Array<keyof CreateStaffData> {
    const required: Array<keyof CreateStaffData> = [
        'user_id',
        'name'
    ];
    return required;
}

export function formatCreate(data: any): CreateStaffData {
    const formatted: CreateStaffData = {
        user_id: data.user_id,
        name: data.name,
        email: data.email || null,
        phone_number: data.phone_number || null,
        active: data.active !== undefined ? data.active : true
    };

    hidash.clean(formatted);
    return formatted;
}

export async function create(data: CreateStaffData): Promise<Staff> {
    return await model.create({ 
        data: {
            user_id: data.user_id,
            name: data.name,
            email: data.email,
            phone_number: data.phone_number,
            active: data.active !== undefined ? data.active : true
        }
    });
}
export async function getById(id: Staff['id']): Promise<Staff | null> {
    return await model.findUnique({ 
        where: { id },
        include: {
            users: true  // Include user data
        }
    });
}

export async function getAll(options?: GetAllStaffOptions): Promise<Staff[]> {
    const where: any = {};

    if (options?.activeOnly !== false) { // default true
        where.active = true;
    }

    if (options?.search) {
        where.OR = [
            { name: { contains: options.search } },
            { email: { contains: options.search } },
            { phone_number: { contains: options.search } }
        ];
    }

    return await model.findMany({
        where,
        include: {
            users: true
        },
        orderBy: { name: 'asc' }
    });
}

export async function update(id: Staff['id'], data: UpdateStaffData): Promise<Staff> {
    return await model.update({
        where: { id },
        data: {
            ...data,
            modified_at: new Date()  // Ini akan di-set otomatis oleh database
        }
    });
}

export async function softDelete(id: Staff['id']): Promise<Staff> {
    return await model.update({
        where: { id },
        data: {
            active: false,
            modified_at: new Date()
        }
    });
}

export async function getActiveStaff(): Promise<Staff[]> {
    return await model.findMany({
        where: { active: true },
        include: {
            users: true
        },
        orderBy: { name: 'asc' }
    });
}

export async function searchStaff(searchTerm: string): Promise<Staff[]> {
    return await model.findMany({
        where: {
            active: true,
            OR: [
                { name: { contains: searchTerm } },
                { email: { contains: searchTerm } },
                { phone_number: { contains: searchTerm } }
            ]
        },
        include: {
            users: true
        },
        orderBy: { name: 'asc' },
        take: 20
    });
}

export async function getStaffByName(name: string): Promise<Staff | null> {
    return await model.findFirst({
        where: {
            name,
            active: true
        },
        include: {
            users: true
        }
    });
}

// Fungsi baru untuk mendapatkan staff by user_id
export async function getByUserId(user_id: number): Promise<Staff | null> {
    return await model.findFirst({
        where: { user_id },
        include: {
            users: true
        }
    });
}