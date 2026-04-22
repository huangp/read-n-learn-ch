/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ArticleFields } from './ArticleFields';
export type GenerateArticleResponse = (ArticleFields & {
    /**
     * Generated Chinese article (100-500 characters)
     */
    article?: string;
    /**
     * The OpenRouter model used to generate the article
     */
    modelUsed?: string;
});

