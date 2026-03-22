// pages/api/mechanics/nearby.ts
import { NextApiRequest, NextApiResponse } from 'next';

// Mock mechanic data (replace with your database)
const mechanics = [
  { id: '1', name: 'Joe\'s Garage', latitude: 40.7128, longitude: -74.0060 },
  { id: '2', name: 'Auto Repair Shop', latitude: 40.7300, longitude: -73.9950 },
  // ...
];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8; // miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { lat, lng, radius = 10 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing lat or lng' });
  }

  const userLat = parseFloat(lat as string);
  const userLng = parseFloat(lng as string);

  const nearby = mechanics
    .map((m) => ({
      ...m,
      distance: haversineDistance(userLat, userLng, m.latitude, m.longitude),
    }))
    .filter((m) => m.distance <= parseFloat(radius as string))
    .sort((a, b) => a.distance - b.distance);

  res.status(200).json(nearby);
}

