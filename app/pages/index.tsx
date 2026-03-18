// pages/index.tsx
import dynamic from 'next/dynamic';

// Dynamically import map to avoid SSR issues (Mapbox GL requires window)
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function HomePage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Find Nearby Mechanics</h1>
      <Map />
    </div>
  );
}