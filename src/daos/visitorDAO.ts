import { visitors as Visitor } from '@prisma/client';
import prisma from '../services/prisma';
import hidash from '../utils/hidash';

const model = prisma.visitors;

export interface CreateVisitorData {
    visitor_name: string;
    phone_number: string;
    visitor_profile: Visitor['visitor_profile'];
    visitor_profile_other?: string | null;
    filled_by: string;
    checked_out_at?: Date | null;
}

export interface UpdateVisitorData {
    visitor_name?: string;
    phone_number?: string;
    visitor_profile?: Visitor['visitor_profile'];
    visitor_profile_other?: string | null;
    filled_by?: string;
    checked_out_at?: Date | null;
}

export interface GetAllOptions {
    includeCheckedOut?: boolean;
    dateFrom?: Date;
    dateTo?: Date;
    visitorProfile?: Visitor['visitor_profile'];
    search?: string;
    timeRange?: string; // New: for time range filter
}

export interface VisitorStats {
    totalVisitors: number;
    visitorsByProfile: Array<{
        visitor_profile: Visitor['visitor_profile'];
        _count: number;
    }>;
    checkedOutCount: number;
    activeVisitors: number;
    recentVisitors: Visitor[];
}

export function getRequired(): Array<keyof CreateVisitorData> {
    const required: Array<keyof CreateVisitorData> = [
        'visitor_name',
        'phone_number', 
        'visitor_profile',
        'filled_by'
    ];
    return required;
}

export function formatCreate(data: any): CreateVisitorData {
    const formatted: CreateVisitorData = {
        visitor_name: data.visitor_name,
        phone_number: data.phone_number,
        visitor_profile: data.visitor_profile,
        filled_by: data.filled_by,
    };

    if (data.visitor_profile === 'Other' && data.visitor_profile_other) {
        formatted.visitor_profile_other = data.visitor_profile_other;
    }

    if (data.checked_out_at) {
        formatted.checked_out_at = new Date(data.checked_out_at);
    }

    hidash.clean(formatted);
    return formatted;
}

export async function create(data: CreateVisitorData): Promise<Visitor> {
    return await model.create({ data });
}

export async function getById(id: Visitor['id']): Promise<Visitor | null> {
    return await model.findUnique({ where: { id } });
}

export async function getAll(options?: GetAllOptions): Promise<Visitor[]> {
    const where: any = {};

    // Handle date range - support both old way and new timeRange
    if (options?.dateFrom && options?.dateTo) {
        where.created_at = {
            gte: options.dateFrom,
            lte: options.dateTo
        };
    } else if (options?.dateFrom && !options.dateTo) {
        where.created_at = { gte: options.dateFrom };
    } else if (options?.dateTo && !options.dateFrom) {
        where.created_at = { lte: options.dateTo };
    }

    if (options?.visitorProfile) {
        where.visitor_profile = options.visitorProfile;
    }

    if (options?.search) {
        where.OR = [
            { visitor_name: { contains: options.search } },
            { phone_number: { contains: options.search } },
            { filled_by: { contains: options.search } }
        ];
    }

    if (options?.includeCheckedOut === false) {
        where.checked_out_at = null;
    }

    return await model.findMany({
        where,
        orderBy: { created_at: 'desc' }
    });
}

export async function update(id: Visitor['id'], data: UpdateVisitorData): Promise<Visitor> {
    return await model.update({
        where: { id },
        data: {
            ...data,
            modified_at: new Date()
        }
    });
}

export async function checkOut(id: Visitor['id']): Promise<Visitor> {
    return await model.update({
        where: { id },
        data: {
            checked_out_at: new Date(),
            modified_at: new Date()
        }
    });
}

export async function deleteVisitor(id: Visitor['id']): Promise<Visitor> {
    return await model.delete({ where: { id } });
}

export async function getByPhoneNumber(phone_number: Visitor['phone_number']): Promise<Visitor | null> {
    return await model.findFirst({ 
        where: { phone_number },
        orderBy: { created_at: 'desc' }
    });
}

export async function getStats(dateFrom?: Date, dateTo?: Date): Promise<VisitorStats> {
    const where: any = {};
    
    if (dateFrom && dateTo) {
        where.created_at = {
            gte: dateFrom,
            lte: dateTo
        };
    }

    const totalVisitors = await model.count({ where });
    
    const visitorsByProfile = await model.groupBy({
        by: ['visitor_profile'],
        where,
        _count: true
    });

    const checkedOutCount = await model.count({ 
        where: { 
            ...where,
            checked_out_at: { not: null }
        }
    });

    const activeVisitors = await model.count({ 
        where: { 
            ...where,
            checked_out_at: null
        }
    });

    const recentVisitors = await model.findMany({
        where: { checked_out_at: null },
        take: 10,
        orderBy: { created_at: 'desc' }
    });

    return {
        totalVisitors,
        visitorsByProfile,
        checkedOutCount,
        activeVisitors,
        recentVisitors
    };
}

export async function getRecentActiveVisitors(limit: number = 10): Promise<Visitor[]> {
    return await model.findMany({
        where: { checked_out_at: null },
        take: limit,
        orderBy: { created_at: 'desc' }
    });
}