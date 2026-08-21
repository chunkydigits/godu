export interface AdminUser {
  id: string;
  displayName: string;
  createdUtc: string;
  isAdmin: boolean;
  adminFromConfig: boolean;
  isInternal: boolean;
  internalFromConfig: boolean;
}

export interface UpdateAdminUserRequest {
  isAdmin?: boolean;
  isInternal?: boolean;
}
