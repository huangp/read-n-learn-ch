/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ArticleFields } from './ArticleFields';
export type CreateObjectRequest = (ArticleFields & {
    /**
     * Article content
     */
    body?: string;
    /**
     * Article tags
     */
    tags?: Array<string>;
});

