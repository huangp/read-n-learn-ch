/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FileInfo } from './FileInfo';
export type ExtractionUploadResponse = {
    /**
     * Job ID for polling status
     */
    jobId?: string;
    /**
     * Job status
     */
    status?: ExtractionUploadResponse.status;
    /**
     * Status message
     */
    message?: string;
    files?: Array<FileInfo>;
};
export namespace ExtractionUploadResponse {
    /**
     * Job status
     */
    export enum status {
        PROCESSING = 'processing',
    }
}

