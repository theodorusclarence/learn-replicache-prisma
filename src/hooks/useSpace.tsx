import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type State = {
  spaceId: string | null;
};

type Actions = {
  setSpaceId: (spaceId: string) => void;
};

export const useSpaceStore = create<State & Actions>()(
  devtools(
    immer((set) => ({
      spaceId: 'dummy-space-id-01',
      setSpaceId: (spaceId) => set({ spaceId }),
    })),
    {
      enabled: process.env.NODE_ENV === 'development',
      name: 'space-store',
    }
  )
);

export const useSpace = () => {
  return useSpaceStore((state) => state.spaceId);
};
