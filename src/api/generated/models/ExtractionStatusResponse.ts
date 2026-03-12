/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExtractionMetadata } from './ExtractionMetadata';
export type ExtractionStatusResponse = {
    jobId?: string;
    /**
     * Current job status
     */
    status?: ExtractionStatusResponse.status;
    /**
     * SHA-256 hash of extracted content, used as S3 key (only when status is 'completed')
     */
    contentHash?: string;
    metadata?: ExtractionMetadata;
    /**
     * Error message (only when status is 'failed')
     */
    error?: string;
};
export namespace ExtractionStatusResponse {
    /**
     * Current job status
     */
    export enum status {
        UPLOADING = 'uploading',
        PROCESSING = 'processing',
        COMPLETED = 'completed',
        FAILED = 'failed',
    }
}

