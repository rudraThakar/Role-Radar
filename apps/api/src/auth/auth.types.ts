export interface AuthUser {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}
