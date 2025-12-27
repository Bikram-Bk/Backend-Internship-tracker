import { Hono } from 'hono';
import path from 'path';
import fs from 'fs-extra';
import { authMiddleware } from '../middleware/middleware.js';
import { Readable } from 'stream';

const uploadRoutes = new Hono();

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
fs.ensureDirSync(uploadDir);

// Helper to parse multipart form data
async function parseMultipartForm(request: Request): Promise<{ file?: File; fields: Record<string, string> }> {
  const formData = await request.formData();
  const fields: Record<string, string> = {};
  let file: File | undefined;

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      file = value;
    } else {
      fields[key] = value;
    }
  }

  return { file, fields };
}

// Helper to save file
async function saveFile(file: File): Promise<{ filename: string; size: number; mimetype: string }> {
  const ext = path.extname(file.name);
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const filename = `event-${uniqueSuffix}${ext}`;
  const filepath = path.join(uploadDir, filename);

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Write file
  await fs.writeFile(filepath, buffer);

  return {
    filename,
    size: file.size,
    mimetype: file.type,
  };
}

// POST /api/upload - Upload image (authenticated)
uploadRoutes.post('/', authMiddleware, async (c) => {
  console.log('Upload request received');
  console.log('Content-Type:', c.req.header('content-type'));
  
  try {
    // Parse multipart form data
    const { file } = await parseMultipartForm(c.req.raw);
    
    if (!file) {
      console.error('No file in request');
      return c.json(
        {
          success: false,
          error: 'No file uploaded',
          message: 'Please select an image file',
        },
        400
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return c.json(
        {
          success: false,
          error: 'Invalid file type',
          message: 'Only image files (JPEG, PNG, WebP, GIF) are allowed',
        },
        400
      );
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json(
        {
          success: false,
          error: 'File too large',
          message: 'Maximum file size is 5MB',
        },
        400
      );
    }

    // Save file
    const savedFile = await saveFile(file);
    const fileUrl = `/uploads/${savedFile.filename}`;
    
    console.log('File uploaded successfully:', {
      filename: savedFile.filename,
      size: savedFile.size,
      mimetype: savedFile.mimetype,
      url: fileUrl,
    });
    
    return c.json(
      {
        success: true,
        data: {
          url: fileUrl,
          filename: savedFile.filename,
          size: savedFile.size,
          mimetype: savedFile.mimetype,
        },
        message: 'File uploaded successfully',
      },
      201
    );
  } catch (error: any) {
    console.error('Error uploading file:', error);
    console.error('Error stack:', error.stack);
    return c.json(
      {
        success: false,
        error: 'File upload failed',
        message: error?.message || 'Unknown error occurred',
      },
      500
    );
  }
});

export default uploadRoutes;
