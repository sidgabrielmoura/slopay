"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { IGatewayService } from "@/services/contracts";
import type { User, AccountRegistrationStatus } from "@/types/domain";
import { demoRepository } from "@/services/demo-repository";
import { sessionService } from "@/services/session.service";
import { useQueryClient } from "@tanstack/react-query";

interface DemoContextType {
  service: IGatewayService;
  activeScenario: string;
  isReadOnly: boolean;
  currentUser: User | null;
  accountStatus: AccountRegistrationStatus;
  switchScenario: (scenarioName: string) => Promise<void>;
  resetScenario: () => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [activeScenario, setActiveScenario] = useState("NORMAL");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accountStatus, setAccountStatus] = useState<AccountRegistrationStatus>("APPROVED");
  const queryClient = useQueryClient();

  const refreshSession = async () => {
    const session = sessionService.getSession();
    if (session) {
      setAccountStatus(session.accountStatus);
    } else {
      const status = await demoRepository.getRegistrationStatus();
      setAccountStatus(status);
    }
    const user = await demoRepository.getCurrentUser();
    setCurrentUser(user);
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const switchScenario = async (scenarioName: string) => {
    await demoRepository.switchScenario(scenarioName);
    const user = await demoRepository.getCurrentUser();
    setCurrentUser(user);
    setActiveScenario(scenarioName);
    const status = await demoRepository.getRegistrationStatus();
    setAccountStatus(status);
    // Invalida e reseta todo o cache do TanStack Query para atualizar a UI imediatamente
    await queryClient.resetQueries();
    await queryClient.invalidateQueries();
  };

  const resetScenario = async () => {
    await demoRepository.resetScenario();
    const user = await demoRepository.getCurrentUser();
    setCurrentUser(user);
    setActiveScenario("NORMAL");
    setAccountStatus("APPROVED");
    await queryClient.resetQueries();
    await queryClient.invalidateQueries();
  };

  const logout = () => {
    sessionService.clearSession();
    demoRepository.switchScenario("UNAUTHENTICATED");
    setActiveScenario("UNAUTHENTICATED");
    setAccountStatus("NOT_STARTED");
    setCurrentUser(null);
    queryClient.clear();
  };

  const isReadOnly = activeScenario === "READONLY";

  return (
    <DemoContext.Provider
      value={{
        service: demoRepository,
        activeScenario,
        isReadOnly,
        currentUser,
        accountStatus,
        switchScenario,
        resetScenario,
        logout,
        refreshSession,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}

export function useGatewayService() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error(
      "useGatewayService deve ser utilizado dentro de um DemoProvider"
    );
  }
  return context.service;
}

export const useSloPayService = useGatewayService;

export function useDemoScenario() {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error(
      "useDemoScenario deve ser utilizado dentro de um DemoProvider"
    );
  }
  return {
    activeScenario: context.activeScenario,
    isReadOnly: context.isReadOnly,
    currentUser: context.currentUser,
    accountStatus: context.accountStatus,
    switchScenario: context.switchScenario,
    resetScenario: context.resetScenario,
    logout: context.logout,
    refreshSession: context.refreshSession,
  };
}
