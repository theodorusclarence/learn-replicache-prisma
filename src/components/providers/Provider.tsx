import * as React from 'react';

import { useLoadReplicache } from '@/hooks/useReplicache';

export default function Provider({ children }: { children: React.ReactNode }) {
  useLoadReplicache();

  return <>{children}</>;
}
