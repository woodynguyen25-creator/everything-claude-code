import type { ReactNode } from 'react';

type Props = { children: ReactNode };

export default function SideBySide({ children }: Props) {
  return <div className="mx-12 grid grid-cols-1 gap-6 lg:grid-cols-2">{children}</div>;
}
