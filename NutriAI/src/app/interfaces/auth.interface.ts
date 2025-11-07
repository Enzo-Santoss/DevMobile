export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface LoginState {
  loading: boolean;
  error: string | null;
}