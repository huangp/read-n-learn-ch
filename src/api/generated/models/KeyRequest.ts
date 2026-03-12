/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type KeyRequest = {
    /**
     * Unique device identifier
     */
    deviceId: string;
    /**
     * iOS app bundle ID
     */
    bundleId: string;
    /**
     * App version
     */
    appVersion: string;
    /**
     * Apple App Attest (optional)
     */
    attestation?: string;
    /**
     * Challenge for App Attest (optional)
     */
    challenge?: string;
};

