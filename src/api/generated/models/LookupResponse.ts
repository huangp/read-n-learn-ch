/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExampleSentence } from './ExampleSentence';
export type LookupResponse = {
    /**
     * The input vocabulary
     */
    vocabulary?: string;
    /**
     * Pinyin romanization with tone marks
     */
    pinyin?: string;
    /**
     * English definition
     */
    definition?: string;
    /**
     * Detailed stroke order information
     */
    strokeOrder?: string;
    examples?: Array<ExampleSentence>;
    /**
     * Whether the result was retrieved from cache
     */
    cached?: boolean;
};

