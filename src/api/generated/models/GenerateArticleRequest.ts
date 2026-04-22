/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type GenerateArticleRequest = {
    /**
     * Array of Chinese words the user already knows
     */
    known: Array<string>;
    /**
     * Array of Chinese words the user is currently learning (optional)
     */
    learning?: Array<string>;
    /**
     * Optional topic to guide the article content
     */
    topic?: string;
};

