'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Fuel, Gauge, Calendar, Trash2, Edit3, ShieldCheck } from 'lucide-react';
// FIX: Pointing to the specific vehicle type we verified
import type { Vehicle } from '@/app/types/vehicle';

interface VehicleCardPremiumProps {
  vehicle: Vehicle; // Removed optional '?' to ensure the map function has data
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=600';

export default function VehicleCardPremium({
  vehicle,
  onClick,
  onEdit,
  onDelete,
}: VehicleCardPremiumProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Fallback for missing vehicle to prevent "Cannot read property of undefined"
  if (!vehicle) return null;

  // Use values from our type or sensible defaults
  const healthScore = vehicle.health_score ?? 85; // Defaulting to 85 if not in DB yet
  
  const getHealthStatus = () => {
    if (healthScore >= 70) return { color: 'text-emerald-400', bg: 'bg-emerald-500/20', bar: 'bg-emerald-500', label: 'Healthy' };
    if (healthScore >= 40) return { color: 'text-amber-400', bg: 'bg-amber-500/20', bar: 'bg-amber-500', label: 'Warning' };
    return { color: 'text-rose-400', bg: 'bg-rose-500/20', bar: 'bg-rose-500', label: 'Critical' };
  };

  const status = getHealthStatus();
  const imageUrl = !imgError && vehicle.image_url ? vehicle.image_url : FALLBACK_IMAGE;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={() => setIsExpanded(!isExpanded)}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 backdrop-blur-xl transition-all hover:border-slate-700 hover:shadow-2xl hover:shadow-emerald-500/10 cursor-pointer"
    >
      {/* --- Header Image --- */}
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={imageUrl}
          alt={`${vehicle.make} ${vehicle.model}`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
          onError={() => setImgError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
        
        {/* Health Floating Badge */}
        <div className={`absolute left-4 top-4 flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold backdrop-blur-md ${status.bg} ${status.color} border border-white/10`}>
          <ShieldCheck size={14} />
          {healthScore}%
        </div>

        {/* Quick Action Overlay */}
        <div className="absolute right-4 top-4 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
           {onEdit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="rounded-full bg-slate-900/80 p-2 text-slate-300 hover:bg-emerald-500 hover:text-white transition-colors"
            >
              <Edit3 size={16} />
            </button>
           )}
        </div>
      </div>

      {/* --- Content --- */}
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-white">
              {vehicle.make} <span className="text-slate-400 font-medium">{vehicle.model}</span>
            </h3>
            <p className="font-mono text-sm font-bold tracking-widest text-emerald-500 uppercase">
              {vehicle.license_plate}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
             <p>Status</p>
             <p className={`font-bold ${status.color}`}>{status.label}</p>
          </div>
        </div>

        {/* --- Specs Grid --- */}
        <div className="grid grid-cols-3 gap-4 border-t border-slate-800/50 pt-4">
          <div className="flex flex-col items-center gap-1">
            <Calendar size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-300">{vehicle.year || 'N/A'}</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Gauge size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-300">
              {vehicle.mileage ? vehicle.mileage.toLocaleString() : '0'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Fuel size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-300 truncate w-full text-center">
              {vehicle.fuel_type || 'Gas'}
            </span>
          </div>
        </div>

        {/* --- Health Bar --- */}
        <div className="mt-6">
          <div className="mb-1.5 flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span>Overall Health</span>
            <span className={status.color}>{healthScore}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${healthScore}%` }}
              className={`h-full rounded-full ${status.bar}`}
            />
          </div>
        </div>

        {/* --- Expanded Actions --- */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 flex gap-2 border-t border-slate-800 pt-4"
            >
              <button 
                onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                className="flex-1 rounded-xl bg-emerald-600 py-2 text-sm font-bold text-white hover:bg-emerald-500 transition-colors"
              >
                View History
              </button>
              {onDelete && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="rounded-xl bg-rose-500/10 px-4 py-2 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}