import 'dotenv/config';
import express, { Express } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import prisma from './services/prisma';
import errorMiddleware from './middlewares/errorMiddleware';
import userRoutes from './routes/v1/userRoutes'; 
import uploadRoutes from './routes/v1/uploadRoutes';
import staffRoutes from "./routes/v1/staffRoutes";
import patientRoutes from "./routes/v1/patientRoutes";

const app: Express = express();

const PORT = process.env.SERVER_PORT || 9876;

app.get('/', (req, res) => res.send('Hello'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(cors());
app.use('/public', express.static('public'));
app.use('/uploads', express.static('uploads/'));

// Hanya menyisakan rute-rute yang diperlukan
app.use('/v1/user', userRoutes);
app.use('/v1/upload', uploadRoutes);
app.use('/v1/staff', staffRoutes);
app.use('/v1/patient', patientRoutes);
app.use(errorMiddleware);

async function main() {
	await prisma.$connect();
	console.log(`Successfully connected to database`);
	app.listen(PORT, () => {
		console.log(`Server ready at port ${PORT}`);
	});
}

main();