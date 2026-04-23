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
import medicalHistoryRoutes from "./routes/v1/medicalHistoryRoutes";
import treatmentPlanRoutes from "./routes/v1/treatmentPlanRoutes";
import treatmentLogRoutes from "./routes/v1/treatmentLogRoutes";

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
app.use('/v1/medical-history', medicalHistoryRoutes);
app.use('/v1/treatment-plan', treatmentPlanRoutes);
app.use('/v1/treatment-log', treatmentLogRoutes);

// Image proxy for CORS — fetches external image server-side
app.get('/v1/image-proxy', (req, res) => {
  const imageUrl = req.query.url as string;
  if (!imageUrl) return res.status(400).send('Missing url param');
  try {
    const mod = imageUrl.startsWith('https') ? require('https') : require('http');
    mod.get(imageUrl, (proxyRes: any) => {
      if (proxyRes.statusCode !== 200) {
        return res.status(proxyRes.statusCode || 500).send('Failed to fetch image');
      }
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      proxyRes.pipe(res);
    }).on('error', (err: any) => {
      console.error('Image proxy error:', err.message);
      res.status(500).send('Proxy error');
    });
  } catch (err: any) {
    console.error('Image proxy error:', err.message);
    res.status(500).send('Proxy error');
  }
});

app.use(errorMiddleware);

async function main() {
	await prisma.$connect();
	console.log(`Successfully connected to database`);
	app.listen(PORT, () => {
		console.log(`Server ready at port ${PORT}`);
	});
}

main();