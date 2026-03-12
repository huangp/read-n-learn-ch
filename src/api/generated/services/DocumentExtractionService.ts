/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExtractionStatusResponse } from '../models/ExtractionStatusResponse';
import type { ExtractionUploadResponse } from '../models/ExtractionUploadResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class DocumentExtractionService {
    /**
     * Extract Text from Documents
     * Upload PDF or image files and extract Chinese text content with formatting preserved
     * @param formData
     * @returns ExtractionUploadResponse Documents uploaded successfully, processing started
     * @throws ApiError
     */
    public static extractDocuments(
        formData: {
            /**
             * Document files to extract text from (PDF, JPG, PNG, TIFF, TXT). Text files are processed immediately, other files use Textract.
             */
            file?: Array<Blob>;
        },
    ): CancelablePromise<ExtractionUploadResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/extract',
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                400: `Bad request - invalid file type or size`,
                405: `Method not allowed`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get Extraction Job Status
     * Poll for the status and results of a document extraction job
     * @param jobId Job ID returned from POST /extract
     * @returns ExtractionStatusResponse Job status retrieved successfully
     * @throws ApiError
     */
    public static getExtractionStatus(
        jobId: string,
    ): CancelablePromise<ExtractionStatusResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/extract/{jobId}',
            path: {
                'jobId': jobId,
            },
            errors: {
                400: `Bad request - missing job ID`,
                404: `Job not found`,
                500: `Internal server error`,
            },
        });
    }
}
