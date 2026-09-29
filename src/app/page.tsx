'use client';

import dynamic from 'next/dynamic';

// The factory is WebGL-only, so it is rendered on the client.
const RobotFactory = dynamic(() => import('@/components/robot-factory'), {
  ssr: false,
  loading: () => <div style={{ position: 'fixed', inset: 0, background: '#000' }} aria-label="Loading robot factory" />,
});

export default function Home() {
  return (
    <main>
      <RobotFactory />
    </main>
  );
}
