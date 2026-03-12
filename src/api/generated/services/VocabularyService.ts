/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { LookupRequest } from '../models/LookupRequest';
import type { LookupResponse } from '../models/LookupResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class VocabularyService {
    /**
     * Lookup Chinese Vocabulary
     * Lookup a Chinese word or character and get its definition, pinyin, stroke order, and examples
     * @param requestBody
     * @returns LookupResponse Vocabulary lookup successful
     * @throws ApiError
     */
    public static lookupVocabulary(
        requestBody: LookupRequest,
    ): CancelablePromise<LookupResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/lookup',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request - missing vocabulary field`,
                500: `Internal server error`,
            },
        });
    }
}
