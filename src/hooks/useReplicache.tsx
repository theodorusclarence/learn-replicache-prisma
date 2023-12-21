import { nanoid } from 'nanoid';
import pusherJs from 'pusher-js';
import * as React from 'react';
import { Replicache } from 'replicache';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { clientMutators } from '@/lib/client/mutators/index.mutator';
import { useSpaceStore } from '@/hooks/useSpace';

import { M } from '@/models/mutator/index.model';

type State = {
  rep: Replicache<M<'client'>> | null;
};

type Actions = {
  setRep: (rep: Replicache<M<'client'>>) => void;
};

const useReplicacheStore = create<State & Actions>()(
  immer((set) => ({
    rep: null,
    setRep: (rep) => set({ rep }),
  }))
);

export const useReplicache = () => {
  return useReplicacheStore((state) => state.rep);
};

export const useLoadReplicache = () => {
  const spaceId = useSpaceStore((state) => state.spaceId);
  const setRep = useReplicacheStore((state) => state.setRep);

  React.useEffect(() => {
    const iid = nanoid();

    const r = new Replicache({
      name: 'chat-user-id',
      licenseKey: process.env.NEXT_PUBLIC_REPLICACHE_KEY as string,
      pushURL: `/api/v3/push?spaceId=${spaceId}&instance=${iid}`,
      pullURL: `/api/v3/pull?spaceId=${spaceId}&instance=${iid}`,
      mutators: clientMutators,
    });
    setRep(r);

    if (
      process.env.NEXT_PUBLIC_PUSHER_KEY &&
      process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    ) {
      // Listen for pokes, and pull whenever we get one.
      pusherJs.logToConsole = true;
      const pusher = new pusherJs(
        process.env.NEXT_PUBLIC_PUSHER_KEY as string,
        {
          cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER as string,
        }
      );
      const channel = pusher.subscribe('default');
      channel.bind('poke', () => {
        void r.pull();
      });
    }

    return () => {
      void r.close();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spaceId]);
};
