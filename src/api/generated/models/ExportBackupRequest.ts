/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ExportBackupRequest = {
    /**
     * User's app user ID (hashed before storage)
     */
    appUserId: string;
    /**
     * User backup data as JSON object
     */
    backupData: Record<string, any>;
};

