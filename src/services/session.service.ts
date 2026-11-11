"use client";

import type { AccountRegistrationStatus } from "@/types/domain";

export interface DemoSessionData {
  userId: string;
  name: string;
  email: string;
  accountStatus: AccountRegistrationStatus;
  submittedAt?: string;
  companyName?: string;
  isAdmin?: boolean;
  adminRole?: string;
}

const storageKey = "slopay_demo_context";

class DemoSessionService {
  getSession(): DemoSessionData | null {
    try {
      const value = window.sessionStorage.getItem(storageKey);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  setSession(data: DemoSessionData): void {
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(data));
    } catch {
      // Storage may be disabled by the browser.
    }
  }

  updateStatus(accountStatus: AccountRegistrationStatus): void {
    const current = this.getSession();
    if (current) this.setSession({ ...current, accountStatus });
  }

  clearSession(): void {
    try {
      window.sessionStorage.removeItem(storageKey);
    } catch {
      // Storage may be disabled by the browser.
    }
  }

  hasActiveSession(): boolean {
    return this.getSession() !== null;
  }
}

export const sessionService = new DemoSessionService();
