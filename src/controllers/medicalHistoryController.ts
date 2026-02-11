import { NextFunction, Request, Response } from 'express';
import {
    BadParamIdError,
    BadRequestError,
    EntityNotFoundError,
    InternalServerError,
    MissingBodyError,
} from '../errors/RequestErrorCollection';
import * as MedicalHistoryDAO from '../daos/medicalHistoryDAO';
import hidash from '../utils/hidash';

export async function createMedicalHistory(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const body = req.body;
        if (!body) {
            next(new MissingBodyError());
            return;
        }

        const isMissingProperty = hidash.checkPropertyV2(body, 'Medical History', MedicalHistoryDAO.getRequired());
        if (isMissingProperty.message) {
            next(isMissingProperty);
            return;
        }

        // Validasi patient exists
        const patientExists = await MedicalHistoryDAO.validatePatientExists(body.patient_id);
        if (!patientExists) {
            next(new BadRequestError('Patient not found'));
            return;
        }

        // Validasi staff exists jika ada
        if (body.staff_id) {
            const staffExists = await MedicalHistoryDAO.validateStaffExists(body.staff_id);
            if (!staffExists) {
                next(new BadRequestError('Staff not found'));
                return;
            }
        }

        // Validasi pain scale (1-10)
        if (body.pain_before !== undefined) {
            if (body.pain_before < 1 || body.pain_before > 10) {
                next(new BadRequestError('Pain before must be between 1 and 10'));
                return;
            }
        }

        if (body.pain_after !== undefined) {
            if (body.pain_after < 1 || body.pain_after > 10) {
                next(new BadRequestError('Pain after must be between 1 and 10'));
                return;
            }
        }

        // Validasi appointment date tidak di masa lalu jika lebih dari 1 hari
        if (body.appointment_date) {
            const appointmentDate = new Date(body.appointment_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Jika appointment date lebih dari 1 hari yang lalu, tolak
            const oneDayAgo = new Date(today);
            oneDayAgo.setDate(oneDayAgo.getDate() - 1);
            
            if (appointmentDate < oneDayAgo) {
                next(new BadRequestError('Appointment date cannot be more than 1 day in the past'));
                return;
            }
        }

        const result = await MedicalHistoryDAO.create(MedicalHistoryDAO.formatCreate(body));
        res.send({
            http_code: 200,
            data: result,
            message: 'Medical history created successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getMedicalHistoryById(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const medicalHistory = await MedicalHistoryDAO.getById(id);
        if (!medicalHistory) {
            next(new EntityNotFoundError('Medical History', id));
            return;
        }

        res.send({
            http_code: 200,
            data: medicalHistory,
            message: 'Medical history retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getMedicalHistoriesByPatient(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const patientId = parseInt(req.params.patientId);
        if (isNaN(patientId)) {
            next(new BadParamIdError());
            return;
        }

        const { dateFrom, dateTo, service_type, staff_id } = req.query;
        
        const options: any = {};
        
        if (dateFrom) options.dateFrom = new Date(dateFrom as string);
        if (dateTo) options.dateTo = new Date(dateTo as string);
        if (service_type) options.service_type = service_type as string;
        if (staff_id) options.staff_id = parseInt(staff_id as string);

        const histories = await MedicalHistoryDAO.getByPatientId(patientId, options);
        
        res.send({
            http_code: 200,
            data: histories,
            count: histories.length,
            message: 'Medical histories retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getAllMedicalHistories(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const {
            patient_id,
            staff_id,
            service_type,
            dateFrom,
            dateTo,
            search,
            limit,
            offset,
            sortBy,
            sortOrder
        } = req.query;
        
        const options: any = {};
        
        if (patient_id) options.patient_id = parseInt(patient_id as string);
        if (staff_id) options.staff_id = parseInt(staff_id as string);
        if (service_type) options.service_type = service_type as string;
        if (dateFrom) options.dateFrom = new Date(dateFrom as string);
        if (dateTo) options.dateTo = new Date(dateTo as string);
        if (search) options.search = search as string;
        if (limit) options.limit = parseInt(limit as string);
        if (offset) options.offset = parseInt(offset as string);
        if (sortBy) options.sortBy = sortBy as string;
        if (sortOrder) options.sortOrder = sortOrder as 'asc' | 'desc';

        const histories = await MedicalHistoryDAO.getAll(options);
        
        res.send({
            http_code: 200,
            data: histories,
            count: histories.length,
            message: 'Medical histories retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function updateMedicalHistory(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
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

        const medicalHistory = await MedicalHistoryDAO.getById(id);
        if (!medicalHistory) {
            next(new EntityNotFoundError('Medical History', id));
            return;
        }

        // Validasi patient exists jika diupdate
        if (body.patient_id !== undefined) {
            const patientExists = await MedicalHistoryDAO.validatePatientExists(body.patient_id);
            if (!patientExists) {
                next(new BadRequestError('Patient not found'));
                return;
            }
        }

        // Validasi staff exists jika diupdate
        if (body.staff_id !== undefined && body.staff_id !== null) {
            const staffExists = await MedicalHistoryDAO.validateStaffExists(body.staff_id);
            if (!staffExists) {
                next(new BadRequestError('Staff not found'));
                return;
            }
        }

        // Validasi pain scale
        if (body.pain_before !== undefined) {
            if (body.pain_before < 1 || body.pain_before > 10) {
                next(new BadRequestError('Pain before must be between 1 and 10'));
                return;
            }
        }

        if (body.pain_after !== undefined) {
            if (body.pain_after < 1 || body.pain_after > 10) {
                next(new BadRequestError('Pain after must be between 1 and 10'));
                return;
            }
        }

        const result = await MedicalHistoryDAO.update(id, body);
        res.send({
            http_code: 200,
            data: result,
            message: 'Medical history updated successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function deleteMedicalHistory(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            next(new BadParamIdError());
            return;
        }

        const medicalHistory = await MedicalHistoryDAO.getById(id);
        if (!medicalHistory) {
            next(new EntityNotFoundError('Medical History', id));
            return;
        }

        await MedicalHistoryDAO.deleteMedicalHistory(id);
        res.send({
            http_code: 200,
            message: 'Medical history deleted successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getMedicalHistoryStats(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
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

        const stats = await MedicalHistoryDAO.getStats(startDate, endDate);
        res.send({
            http_code: 200,
            data: stats,
            message: 'Medical history statistics retrieved successfully'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function searchMedicalHistories(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { query } = req.query;
        
        if (!query) {
            next(new BadRequestError('Search query is required'));
            return;
        }

        const histories = await MedicalHistoryDAO.searchMedicalHistories(query as string);

        res.send({
            http_code: 200,
            data: histories,
            count: histories.length,
            message: 'Search results retrieved'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getRecentMedicalHistories(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { limit } = req.query;
        
        const histories = await MedicalHistoryDAO.getRecentMedicalHistories(
            limit ? parseInt(limit as string) : 10
        );
        
        res.send({
            http_code: 200,
            data: histories,
            count: histories.length,
            message: 'Recent medical histories retrieved'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getUpcomingAppointments(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { days } = req.query;
        
        const appointments = await MedicalHistoryDAO.getUpcomingAppointments(
            days ? parseInt(days as string) : 7
        );
        
        res.send({
            http_code: 200,
            data: appointments,
            count: appointments.length,
            message: 'Upcoming appointments retrieved'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getByDateRange(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const { startDate, endDate } = req.query;
        
        if (!startDate || !endDate) {
            next(new BadRequestError('Start date and end date are required'));
            return;
        }

        const start = new Date(startDate as string);
        const end = new Date(endDate as string);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            next(new BadRequestError('Invalid date format'));
            return;
        }

        const histories = await MedicalHistoryDAO.getByDateRange(start, end);
        
        res.send({
            http_code: 200,
            data: histories,
            count: histories.length,
            message: 'Medical histories retrieved for date range'
        });
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

// Function untuk export CSV medical histories
export async function exportMedicalHistoriesToCSV(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
    try {
        const {
            patient_id,
            staff_id,
            service_type,
            dateFrom,
            dateTo,
            search
        } = req.query;

        const options: MedicalHistoryDAO.GetAllOptions = {};

        if (patient_id) {
            options.patient_id = parseInt(patient_id as string);
        }
        if (staff_id) {
            options.staff_id = parseInt(staff_id as string);
        }
        if (service_type) {
            options.service_type = service_type as string;
        }
        if (dateFrom) {
            options.dateFrom = new Date(dateFrom as string);
        }
        if (dateTo) {
            options.dateTo = new Date(dateTo as string);
        }
        if (search) {
            options.search = search as string;
        }

        const histories = await MedicalHistoryDAO.getAll(options);

        // Set headers for CSV download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=medical_histories_export.csv');

        // Create CSV content dengan field baru
        const headers = [
            'ID',
            'Patient Code',
            'Patient Name',
            'Appointment Date',
            'Service Type',
            'Area Concern', // BARU
            'Staff Name',
            'Diagnosis Result',
            'Pain Before',
            'Pain After',
            'Pain Reduction',
            'Range of Motion Impact', // BARU
            'Treatments',
            'Exercise',
            'Homework',
            'Recovery Tips', // BARU
            'Next Session',
            'Additional Notes',
            'Created At',
            'Updated At'
        ];

        // Write headers
        let csvContent = headers.join(',') + '\n';

        // Write data rows
        histories.forEach((history: any) => {
            const row = [
                history.id,
                `"${history.patient_code || ''}"`,
                `"${history.patient_name || ''}"`,
                history.appointment_date,
                `"${history.service_type || ''}"`,
                `"${history.area_concern || ''}"`, // BARU
                `"${history.staff_name || ''}"`,
                `"${history.diagnosis_result || ''}"`,
                history.pain_before || '',
                history.pain_after || '',
                history.pain_reduction || '',
                `"${history.range_of_motion_impact || ''}"`, // BARU
                `"${history.treatments || ''}"`,
                `"${history.exercise || ''}"`,
                `"${history.homework || ''}"`,
                `"${history.recovery_tips || ''}"`, // BARU
                `"${history.recommended_next_session || ''}"`,
                `"${history.additional_notes || ''}"`,
                history.created_at || '',
                history.updated_at || ''
            ];
            csvContent += row.join(',') + '\n';
        });

        res.send(csvContent);
    } catch (error: any) {
        next(new InternalServerError(error));
    }
}

export async function getPatientProgressReport(req: Request, res: Response) {
    try {
        const patientId = parseInt(req.params.patientId);

        if (isNaN(patientId)) {
            return res.status(400).json({
                http_code: 400,
                error_message: 'Invalid patient ID'
            });
        }

        const report = await MedicalHistoryDAO.getPatientProgressReport(patientId);

        if (!report.patient) {
            return res.status(404).json({
                http_code: 404,
                error_message: 'No medical history found for this patient'
            });
        }

        return res.status(200).json({
            http_code: 200,
            data: report
        });
    } catch (error: any) {
        console.error('Error getting progress report:', error);
        return res.status(500).json({
            http_code: 500,
            error_message: error.message
        });
    }
}