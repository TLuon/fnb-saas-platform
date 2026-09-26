import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, type UploadApiResponse, type UploadApiErrorResponse } from 'cloudinary';
import { AppException } from '../exceptions/app.exception.js';
import { Readable } from 'node:stream';

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
}

export interface UploadedImageFile {
  fieldname?: string;
  originalname?: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary configured successfully');
    } else {
      this.logger.warn('Cloudinary environment variables missing. Cloudinary service running in fallback/test mode.');
    }
  }

  /**
   * Validate image file and upload to Cloudinary.
   * Returns secure_url and public_id.
   */
  async uploadImage(file: UploadedImageFile, folder = 'products'): Promise<CloudinaryUploadResult> {
    if (!file || !file.buffer) {
      throw new AppException('ERR_9001_VALIDATION_FAILED', 'Vui lòng chọn file hình ảnh');
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype.toLowerCase())) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        'Định dạng file không hợp lệ. Chỉ chấp nhận các định dạng: JPG, PNG, WEBP, GIF',
      );
    }

    // Validate File Size
    if (file.size > MAX_FILE_SIZE) {
      throw new AppException(
        'ERR_9001_VALIDATION_FAILED',
        `Kích thước file vượt quá giới hạn cho phép (tối đa ${MAX_FILE_SIZE / (1024 * 1024)}MB)`,
      );
    }

    // Fallback if not configured (e.g. unit tests or local dev without active cloud credentials)
    if (!this.isConfigured) {
      const mockPublicId = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const mockUrl = `https://res.cloudinary.com/fnb-demo/image/upload/v1/${mockPublicId}.jpg`;
      this.logger.log(`[Mock Cloudinary Upload] Returning: ${mockUrl}`);
      return {
        secure_url: mockUrl,
        public_id: mockPublicId,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error || !result) {
            this.logger.error('Cloudinary upload error:', error);
            return reject(
              new AppException('ERR_9002_INTERNAL_SERVER_ERROR', error?.message || 'Lỗi khi upload ảnh lên Cloudinary'),
            );
          }

          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        },
      );

      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }
}
