/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { GenerateArticleRequest } from '../models/GenerateArticleRequest';
import type { GenerateArticleResponse } from '../models/GenerateArticleResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class ArticleGenerationService {
    /**
     * Generate Chinese Article
     * Generate a personalized Chinese reading article using known and learning vocabulary. Optionally specify a topic. Article length is 100-500 Chinese characters.
     * @param requestBody
     * @returns GenerateArticleResponse Article generated successfully
     * @throws ApiError
     */
    public static generateArticle(
        requestBody: GenerateArticleRequest,
    ): CancelablePromise<GenerateArticleResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/generate-article',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request - missing or invalid known vocabulary`,
                500: `Internal server error`,
            },
        });
    }
}
