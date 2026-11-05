import type { components, paths } from './openapi'

/**
 * Types generated from the canonical DFY-BE OpenAPI document.
 * Use these at API boundaries; do not reimplement business rules in clients.
 */
export type ApiPaths = paths
export type ApiSchemas = components
export type BackendTask = components['schemas']['TaskDto']
export type BackendTaskPage = components['schemas']['TaskDtoPaginatedResponse']
export type BackendTaskPageResponse = components['schemas']['TaskDtoPaginatedResponseApiResponse']
export type BackendAuthResponse = components['schemas']['AuthResponse']
export type BackendClaimTaskRequest = components['schemas']['ClaimTaskRequest']
export type BackendCreateTaskRequest = components['schemas']['CreateTaskRequest']
export type BackendUpdateTaskRequest = components['schemas']['UpdateTaskRequest']
export type BackendBooleanResponse = components['schemas']['BooleanApiResponse']
export type BackendUser = components['schemas']['UserDto']
