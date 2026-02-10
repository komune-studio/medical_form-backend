import { NextFunction, Request, Response } from 'express';
import {
    BadParamIdError,
    BadRequestError,
    EntityNotFoundError,
    InternalServerError,
    MissingBodyError,
} from '../errors/RequestErrorCollection';
import * as PatientDAO from '../daos/patientDAO';
import hidash from '../utils/hidash';

export async function createPatient(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const body = req.body;
        if (!body) {
            next(new MissingBodyError());
            return;
        }

        const isMissingProperty = hidash.checkPropertyV2(body, 'Patient', PatientDAO.getRequired());
        if (isMissingProperty.message) {
            next(isMissingProperty);
            return;
        }

        // Validasi email jika ada
        if (body.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(body.email)) {
                next(new BadRequestError('Invalid email format'));
                return;
            }

            const isEmailUnique = await PatientDAO.validateEmailUnique(body.email);
            if (!isEmailUnique) {
                next(new BadRequestError('Email already exists'));
                return;
            }
        }

        // Validasi phone jika ada
        if (body.phone) {
            const phoneRegex = /^[0-9+()-]+$/;
            if (!phoneRegex.test(body.phone)) {
                next(new BadRequestError('Invalid phone number format'));
                return;
            }

            const isPhoneUnique = await PatientDAO.validatePhoneUnique(body.phone);
            if (!isPhoneUnique) {
                next(new BadRequestError('Phone number already exists'));
                return;
            }
        }

        // Validasi date_of_birth jika ada
        if (body.date_of_birth) {
            const birthDate = new Date(body.date_of_birth);
            if (isNaN(birthDate.getTime())) {
                next(new BadRequestError('Invalid date of birth'));
                return;
            }

            // Validasi tidak lahir di masa depan
            const today = new Date();
            if (birthDate > today) {
                next(new BadRequestError('Date of birth cannot be in the future'));
                return;
            }
        }

        // Validasi height jika ada
        if (body.height !== undefined && body.height !== null && body.height !== '') {
            const height = Number(body.height);
            if (isNaN(height) || height <= 0 || height > 300) {
                next(new BadRequestError('Height must be between 1-300 cm'));
                return;
            }
        }

        // Validasi weight jika ada
        if (body.weight !== undefined && body.weight !== null && body.weight !== '') {
            const weight = Number(body.weight);
            if (isNaN(weight) || weight <= 0 || weight > 500) {
                next(new BadRequestError('Weight must be between 1-500 kg'));
                return;
            }
        }

        // Tambahkan created_by dari user yang login
        body.created_by = req.decoded?.id;

        const result = await PatientDAO.create(PatientDAO.formatCreate(body));
        res.send({
            http_code: 200,
            data: result,
            message: 'Patient created successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getPatientById(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const patient = await PatientDAO.getById(id);
        if (!patient) {
            next(new EntityNotFoundError('Patient', id));
            return;
        }

        res.send({
            http_code: 200,
            data: patient,
            message: 'Patient retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getPatientByCode(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { code } = req.query;
        
        if (!code) {
            next(new BadRequestError('Patient code is required'));
            return;
        }

        const patient = await PatientDAO.getByPatientCode(code as string);
        if (!patient) {
            next(new EntityNotFoundError('Patient', code as string));
            return;
        }

        res.send({
            http_code: 200,
            data: patient,
            message: 'Patient retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getAllPatients(req: Request, res: Response) {
    try {
        const { search, gender, timeRange } = req.query;
        
        const options: any = {};
        
        if (search) options.search = search as string;
        if (gender) options.gender = gender;
        
        // Handle time range filter
        if (timeRange && timeRange !== 'all') {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            
            switch (timeRange) {
                case 'today':
                    const todayStart = new Date();
                    todayStart.setHours(0, 0, 0, 0);
                    options.dateFrom = todayStart;
                    options.dateTo = today;
                    break;
                    
                case 'last7days':
                    const last7Days = new Date();
                    last7Days.setDate(today.getDate() - 7);
                    last7Days.setHours(0, 0, 0, 0);
                    options.dateFrom = last7Days;
                    options.dateTo = today;
                    break;
                    
                case 'last30days':
                    const last30Days = new Date();
                    last30Days.setDate(today.getDate() - 30);
                    last30Days.setHours(0, 0, 0, 0);
                    options.dateFrom = last30Days;
                    options.dateTo = today;
                    break;
            }
        }
        
        const patients = await PatientDAO.getAll(options);
        
        return res.status(200).json({
            http_code: 200,
            message: 'Patients retrieved successfully',
            data: patients
        });
    } catch (error) {
        console.error('Error getting patients:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return res.status(500).json({
            http_code: 500,
            message: 'Internal server error',
            error: errorMessage
        });
    }
}

export async function updatePatient(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
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

        const patient = await PatientDAO.getById(id);
        if (!patient) {
            next(new EntityNotFoundError('Patient', id));
            return;
        }

        // Validasi email jika diupdate
        if (body.email !== undefined) {
            if (body.email) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(body.email)) {
                    next(new BadRequestError('Invalid email format'));
                    return;
                }

                const isEmailUnique = await PatientDAO.validateEmailUnique(body.email, id);
                if (!isEmailUnique) {
                    next(new BadRequestError('Email already exists'));
                    return;
                }
            }
        }

        // Validasi phone jika diupdate
        if (body.phone !== undefined) {
            if (body.phone) {
                const phoneRegex = /^[0-9+()-]+$/;
                if (!phoneRegex.test(body.phone)) {
                    next(new BadRequestError('Invalid phone number format'));
                    return;
                }

                const isPhoneUnique = await PatientDAO.validatePhoneUnique(body.phone, id);
                if (!isPhoneUnique) {
                    next(new BadRequestError('Phone number already exists'));
                    return;
                }
            }
        }

        // Validasi date_of_birth jika diupdate
        if (body.date_of_birth !== undefined) {
            if (body.date_of_birth) {
                const birthDate = new Date(body.date_of_birth);
                if (isNaN(birthDate.getTime())) {
                    next(new BadRequestError('Invalid date of birth'));
                    return;
                }

                const today = new Date();
                if (birthDate > today) {
                    next(new BadRequestError('Date of birth cannot be in the future'));
                    return;
                }
            }
        }

        // Validasi height jika diupdate
        if (body.height !== undefined && body.height !== null && body.height !== '') {
            const height = Number(body.height);
            if (isNaN(height) || height <= 0 || height > 300) {
                next(new BadRequestError('Height must be between 1-300 cm'));
                return;
            }
        }

        // Validasi weight jika diupdate
        if (body.weight !== undefined && body.weight !== null && body.weight !== '') {
            const weight = Number(body.weight);
            if (isNaN(weight) || weight <= 0 || weight > 500) {
                next(new BadRequestError('Weight must be between 1-500 kg'));
                return;
            }
        }

        const result = await PatientDAO.update(id, body);
        res.send({
            http_code: 200,
            data: result,
            message: 'Patient updated successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function deletePatient(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const patient = await PatientDAO.getById(id);
        if (!patient) {
            next(new EntityNotFoundError('Patient', id));
            return;
        }

        await PatientDAO.deletePatient(id);
        res.send({ 
            http_code: 200,
            message: 'Patient deleted successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getPatientStats(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { dateFrom, dateTo } = req.query;

        let startDate: Date | undefined;
        let endDate: Date | undefined;

        if (dateFrom) {
            startDate = new Date(dateFrom as string);
        }
        if (dateTo) {
            endDate = new Date(dateTo as string);
        }

        const stats = await PatientDAO.getStats(startDate, endDate);
        res.send({
            http_code: 200,
            data: stats,
            message: 'Patient statistics retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getPatientByPhone(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { phone } = req.query;
        
        if (!phone) {
            next(new BadRequestError('Phone number is required'));
            return;
        }

        const patient = await PatientDAO.getByPhone(phone as string);
        
        if (!patient) {
            next(new BadRequestError(`Patient with phone number ${phone} not found`));
            return;
        }

        res.send({
            http_code: 200,
            data: patient,
            message: 'Patient retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getPatientByEmail(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { email } = req.query;
        
        if (!email) {
            next(new BadRequestError('Email is required'));
            return;
        }

        const patient = await PatientDAO.getByEmail(email as string);
        
        if (!patient) {
            next(new BadRequestError(`Patient with email ${email} not found`));
            return;
        }

        res.send({
            http_code: 200,
            data: patient,
            message: 'Patient retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function searchPatients(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { query } = req.query;
        
        if (!query) {
            next(new BadRequestError('Search query is required'));
            return;
        }

        const patients = await PatientDAO.searchPatients(query as string);

        res.send({
            http_code: 200,
            data: patients,
            count: patients.length,
            message: 'Search results retrieved'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getRecentPatients(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { limit } = req.query;
        
        // Filter berdasarkan user yang login jika bukan admin
        let patients;
        const userRole = req.decoded?.role;
        
        if (userRole === 'ADMIN') {
            patients = await PatientDAO.getRecentPatients(
                limit ? parseInt(limit as string) : 10
            );
        } else {
            const created_by = parseInt(req.decoded?.id);
            patients = await PatientDAO.getPatientsByDoctor(created_by);
            if (limit) {
                patients = patients.slice(0, parseInt(limit as string));
            }
        }
        
        res.send({
            http_code: 200,
            data: patients,
            count: patients.length,
            message: 'Recent patients retrieved'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

// Function untuk export CSV
export async function exportPatientsToCSV(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const {
            gender,
            search,
            dateFrom,
            dateTo
        } = req.query;

        const options: PatientDAO.GetAllOptions = {};

        if (gender && ['MALE', 'FEMALE'].includes(gender as string)) {
            options.gender = gender as any;
        }

        if (search) {
            options.search = search as string;
        }

        if (dateFrom) {
            options.dateFrom = new Date(dateFrom as string);
        }
        if (dateTo) {
            options.dateTo = new Date(dateTo as string);
        }

        // Filter berdasarkan user yang login jika bukan admin
        const userRole = req.decoded?.role;
        if (userRole !== 'ADMIN') {
            options.created_by = parseInt(req.decoded?.id);
        }

        const patients = await PatientDAO.getAll(options);

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=patients_export.csv');

        // Create CSV content
        const headers = [
            'Patient Code',
            'Name',
            'Gender',
            'Age',
            'Date of Birth',
            'Phone',
            'Email',
            'Height (cm)',
            'Weight (kg)',
            'BMI',
            'Allergies',
            'Address',
            'Medical Notes',
            'Created By',
            'Created At',
            'Last Updated'
        ];

        // Write headers
        let csvContent = headers.join(',') + '\n';

        // Write data rows
        patients.forEach((patient: any) => {
            const row = [
                `"${patient.patient_code || ''}"`,
                `"${patient.name || ''}"`,
                `"${patient.gender || ''}"`,
                patient.age || '',
                patient.date_of_birth || '',
                `"${patient.phone || ''}"`,
                `"${patient.email || ''}"`,
                patient.height || '',
                patient.weight || '',
                patient.bmi || '',
                `"${patient.allergies || ''}"`,
                `"${patient.address || ''}"`,
                `"${patient.medical_notes || ''}"`,
                `"${patient.created_by_name || ''}"`,
                patient.created_at || '',
                patient.updated_at || ''
            ];
            csvContent += row.join(',') + '\n';
        });

        res.send(csvContent);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

// Function untuk validasi email unique
export async function validateEmail(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { email, excludeId } = req.query;
        
        if (!email) {
            next(new BadRequestError('Email is required'));
            return;
        }

        const isUnique = await PatientDAO.validateEmailUnique(
            email as string, 
            excludeId ? parseInt(excludeId as string) : undefined
        );
        
        res.send({ 
            http_code: 200,
            valid: isUnique,
            message: isUnique ? 'Email is available' : 'Email already exists'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

// Function untuk validasi phone unique
export async function validatePhone(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { phone, excludeId } = req.query;
        
        if (!phone) {
            next(new BadRequestError('Phone is required'));
            return;
        }

        const isUnique = await PatientDAO.validatePhoneUnique(
            phone as string, 
            excludeId ? parseInt(excludeId as string) : undefined
        );
        
        res.send({ 
            http_code: 200,
            valid: isUnique,
            message: isUnique ? 'Phone is available' : 'Phone already exists'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}