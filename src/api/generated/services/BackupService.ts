/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExportBackupRequest } from '../models/ExportBackupRequest';
import type { ExportBackupResponse } from '../models/ExportBackupResponse';
import type { ImportBackupResponse } from '../models/ImportBackupResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class BackupService {
    /**
     * Export Backup
     * Export user backup data to S3. The app user ID is hashed (SHA-256) before being used as the S3 key for privacy.
     * @param requestBody
     * @returns ExportBackupResponse Backup exported successfully
     * @throws ApiError
     */
    public static exportBackup(
        requestBody: ExportBackupRequest,
    ): CancelablePromise<ExportBackupResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/import-export',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request - invalid JSON or missing required fields`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Import Backup
     * Retrieve user backup data from S3 by app user ID. The app user ID is hashed (SHA-256) to look up the backup.
     * @param appUserId User's app user ID (hashed to look up backup)
     * @returns ImportBackupResponse Backup imported successfully
     * @throws ApiError
     */
    public static importBackup(
        appUserId: string,
    ): CancelablePromise<ImportBackupResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/import-export',
            query: {
                'appUserId': appUserId,
            },
            errors: {
                400: `Bad request - missing appUserId query parameter`,
                404: `Backup not found`,
                500: `Internal server error`,
            },
        });
    }
}
