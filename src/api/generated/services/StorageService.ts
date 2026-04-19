/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CreateObjectRequest } from '../models/CreateObjectRequest';
import type { CreateObjectResponse } from '../models/CreateObjectResponse';
import type { ObjectListResponse } from '../models/ObjectListResponse';
import type { ObjectResponse } from '../models/ObjectResponse';
import type { PutObjectRequest } from '../models/PutObjectRequest';
import type { PutObjectResponse } from '../models/PutObjectResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class StorageService {
    /**
     * List Objects
     * List all objects stored in the S3 bucket
     * @returns ObjectListResponse List of objects retrieved successfully
     * @throws ApiError
     */
    public static listObjects(): CancelablePromise<ObjectListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/objects',
            errors: {
                500: `Internal server error`,
            },
        });
    }
    /**
     * Create Object
     * Create a new object in S3. The object key is auto-generated from a djb2 hash of the body content.
     * @param requestBody
     * @returns CreateObjectResponse Object created successfully
     * @throws ApiError
     */
    public static createObject(
        requestBody: CreateObjectRequest,
    ): CancelablePromise<CreateObjectResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/objects',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request - invalid JSON content`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Get Object
     * Retrieve an object from S3 by key
     * @param key Object key (URL-encoded)
     * @returns ObjectResponse Object retrieved successfully
     * @throws ApiError
     */
    public static getObject(
        key: string,
    ): CancelablePromise<ObjectResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/objects/{key}',
            path: {
                'key': key,
            },
            errors: {
                404: `Object not found`,
                500: `Internal server error`,
            },
        });
    }
    /**
     * Update Object
     * Update an existing object in S3. Only text/plain content is supported. The key must already exist in the bucket.
     * @param key Object key (URL-encoded). Must already exist in the bucket.
     * @param requestBody
     * @returns PutObjectResponse Object updated successfully
     * @throws ApiError
     */
    public static putObject(
        key: string,
        requestBody: PutObjectRequest,
    ): CancelablePromise<PutObjectResponse> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/objects/{key}',
            path: {
                'key': key,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                404: `Object key does not exist`,
                500: `Internal server error`,
            },
        });
    }
}
