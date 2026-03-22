// components/vehicles/AddVehicleModal.tsx
'use client';

import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { createBrowserClient } from '@supabase/ssr'; // Use new package
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Validation schema
const vehicleSchema = z.object({
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z
    .number()
    .int()
    .min(1900, 'Year must be 1900 or later')
    .max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  license_plate: z.string().optional(),
  vin: z.string().optional(),
  color: z.string().optional(),
  mileage: z.number().min(0).optional(),
  fuel_type: z.enum(['gasoline', 'diesel', 'electric', 'hybrid']).optional(),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  userId: string;
}

export default function AddVehicleModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
}: AddVehicleModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Supabase client for browser usage
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      year: new Date().getFullYear(),
    },
  });

  const onSubmit = async (data: VehicleFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('vehicles').insert({
        user_id: userId,
        ...data,
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      reset();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error adding vehicle:', err);
      setError(err instanceof Error ? err.message : 'Failed to add vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between">
                  <Dialog.Title className="text-xl font-semibold">
                    Add New Vehicle
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {error && (
                  <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
                  {/* Form fields same as before */}
                  <div>
                    <label htmlFor="make" className="block text-sm font-medium text-gray-700">
                      Make *
                    </label>
                    <input
                      type="text"
                      id="make"
                      {...register('make')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.make && (
                      <p className="mt-1 text-xs text-red-600">{errors.make.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="model" className="block text-sm font-medium text-gray-700">
                      Model *
                    </label>
                    <input
                      type="text"
                      id="model"
                      {...register('model')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.model && (
                      <p className="mt-1 text-xs text-red-600">{errors.model.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                      Year *
                    </label>
                    <input
                      type="number"
                      id="year"
                      {...register('year', { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                    {errors.year && (
                      <p className="mt-1 text-xs text-red-600">{errors.year.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="license_plate" className="block text-sm font-medium text-gray-700">
                      License Plate
                    </label>
                    <input
                      type="text"
                      id="license_plate"
                      {...register('license_plate')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="vin" className="block text-sm font-medium text-gray-700">
                      VIN
                    </label>
                    <input
                      type="text"
                      id="vin"
                      {...register('vin')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                      Color
                    </label>
                    <input
                      type="text"
                      id="color"
                      {...register('color')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="mileage" className="block text-sm font-medium text-gray-700">
                      Mileage
                    </label>
                    <input
                      type="number"
                      id="mileage"
                      {...register('mileage', { valueAsNumber: true })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="fuel_type" className="block text-sm font-medium text-gray-700">
                      Fuel Type
                    </label>
                    <select
                      id="fuel_type"
                      {...register('fuel_type')}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select fuel type</option>
                      <option value="gasoline">Gasoline</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Adding...' : 'Add Vehicle'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}