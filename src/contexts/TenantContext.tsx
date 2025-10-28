import { createContext, useContext, ReactNode } from 'react';

interface TenantContextType {
  tenantId: string | null;
  tenantName: string | null;
}

const TenantContext = createContext<TenantContextType | null>(null);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  tenantId: string | null;
  tenantName: string | null;
  children: ReactNode;
}

export const TenantProvider = ({ tenantId, tenantName, children }: TenantProviderProps) => {
  return (
    <TenantContext.Provider value={{ tenantId, tenantName }}>
      {children}
    </TenantContext.Provider>
  );
};
