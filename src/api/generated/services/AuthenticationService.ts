/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { KeyRequest } from '../models/KeyRequest';
import type { KeyResponse } from '../models/KeyResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class AuthenticationService {
    /**
     * Get API Key
     * Request an API key for authenticating subsequent requests. Validates device and bundle ID.
     * @param requestBody
     * @returns KeyResponse API key generated successfully
     * @throws ApiError
     */
    public static getApiKey(
        requestBody: KeyRequest,
    ): CancelablePromise<KeyResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/key',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request - missing required fields`,
                403: `Forbidden - invalid bundle ID`,
                429: `Rate limit exceeded`,
                500: `Internal server error`,
            },
        });
    }
}
