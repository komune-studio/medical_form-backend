import { staff as Staff } from '@prisma/client';
import prisma from '../services/prisma';
import hidash from '../utils/hidash';

const model = prisma.staff;

export interface CreateStaffData {
    name: string;
    phone_number: string;
    active?: boolean;
}

export interface UpdateStaffData {
    name?: string;
    phone_number?: string;
    active?: boolean;
}

export interface GetAllStaffOptions {
    activeOnly?: boolean;
    search?: string;
}

export function getRequired(): Array<keyof CreateStaffData> {
    const required: Array<keyof CreateStaffData> = [
        'name',
        'phone_number'
    ];
    return required;
}

export function formatCreate(data: any): CreateStaffData {
    const formatted: CreateStaffData = {
        name: data.name,
        phone_number: data.phone_number,
        active: data.active !== undefined ? data.active : true
    };

    hidash.clean(formatted);
    return formatted;
}

export async function create(data: CreateStaffData): Promise<Staff> {
    return await model.create({ data });
}

export async function getById(id: Staff['id']): Promise<Staff | null> {
    return await model.findUnique({ where: { id } });
}

export async function getAll(options?: GetAllStaffOptions): Promise<Staff[]> {
    const where: any = {};

    if (options?.activeOnly !== false) { // default true
        where.active = true;
    }

    if (options?.search) {
        where.OR = [
            { name: { contains: options.search } },
            { phone_number: { contains: options.search } }
        ];
    }

    return await model.findMany({
        where,
        orderBy: { name: 'asc' }
    });
}

export async function update(id: Staff['id'], data: UpdateStaffData): Promise<Staff> {
    return await model.update({
        where: { id },
        data: {
            ...data,
            modified_at: new Date()
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
        orderBy: { name: 'asc' }
    });
}

export async function searchStaff(searchTerm: string): Promise<Staff[]> {
    return await model.findMany({
        where: {
            active: true,
            OR: [
                { name: { contains: searchTerm } },
                { phone_number: { contains: searchTerm } }
            ]
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
        }
    });
}