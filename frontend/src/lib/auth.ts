import { api } from './api';
import type { LoginResponse, User } from './types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function signup(
  email: string,
  password: string,
  fullName: string
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/signup', {
    email,
    password,
    fullName,
  });
  return data;
}

export interface AcceptInvitePayload {
  token: string;
  fullName: string;
  password: string;
}

export async function acceptInvite(
  payload: AcceptInvitePayload
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/accept-invite', payload);
  return data;
}

export async function me(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

export function saveSession(token: string, user: User) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function loadSession(): { token: string | null; user: User | null } {
  if (typeof window === 'undefined') return { token: null, user: null };
  try {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    return { token, user: raw ? (JSON.parse(raw) as User) : null };
  } catch {
    return { token: null, user: null };
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
