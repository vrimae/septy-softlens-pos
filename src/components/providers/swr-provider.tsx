'use client';
import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        refreshWhenOffline: false,
        refreshWhenHidden: false,
        dedupingInterval: 10000,
        keepPreviousData: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
