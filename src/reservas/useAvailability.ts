/**
 * useAvailability.ts — Quinta de Argos
 * ---------------------------------------------------------
 * Lee del backend el estado de cada noche (libre, ocupada, sin
 * tarifa o dentro de las 72 h) y ofrece helpers puros para
 * validar llegadas/salidas en el calendario.
 *
 * Todo lo que se calcula aquí es solo para PINTAR la interfaz.
 * El backend vuelve a validar y calcula el precio real al pagar.
 */

import { useCallback, useEffect, useState } from 'react';
import { addDaysISO } from './BookingDates';

const API_BASE = import.meta.env.VITE_API_URL || '';

// Reutilizamos la respuesta un minuto entre Reservas y Checkout.
const CACHE_MS = 60 * 1000;

export type DayStatus = 'libre' | 'ocupado' | 'sin_tarifa' | 'antelacion';

export interface DayAvailability {
  estado: DayStatus;
  precio?: number;
  minNoches?: number;
}

export interface Availability {
  hoy: string;
  primeraLlegada: string;
  ultimaNoche: string;
  dias: Record<string, DayAvailability>;
  reglas: { minHorasAntelacion: number; maxNoches: number; maxHuespedes: number };
  adicionales: { id: string; nombre: string; precio: number }[];
}

let cache: { data: Availability; at: number } | null = null;
let inflight: Promise<Availability> | null = null;

async function fetchAvailability(force = false): Promise<Availability> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  if (!force && inflight) return inflight;

  inflight = fetch(`${API_BASE}/api/reservas/disponibilidad`)
    .then(async (res) => {
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.dias) {
        throw new Error(body?.mensaje || 'No hemos podido consultar la disponibilidad.');
      }
      cache = { data: body as Availability, at: Date.now() };
      return cache.data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function useAvailability() {
  const [data, setData] = useState<Availability | null>(cache?.data ?? null);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState('');

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError('');
    try {
      setData(await fetchAvailability(force));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No hemos podido consultar la disponibilidad.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const reload = useCallback(() => load(true), [load]);

  return { data, loading, error, reload };
}

// ==========================================================
// Helpers puros (sin React) para el calendario y el resumen
// ==========================================================

export function canArrive(data: Availability | null, date: string): boolean {
  return data?.dias[date]?.estado === 'libre';
}

export function minNightsFor(data: Availability | null, checkin: string): number {
  return data?.dias[checkin]?.minNoches ?? 1;
}

export type DepartureCheck =
  | { ok: true }
  | { ok: false; reason: 'antes' | 'minimo' | 'maximo' | 'bloqueado' };

/**
 * ¿Se puede salir el día `departure` habiendo llegado `checkin`?
 * Todas las noches intermedias tienen que estar libres; el día de
 * salida en sí puede estar ocupado (esa noche ya no es tuya).
 */
export function checkDeparture(
  data: Availability | null,
  checkin: string,
  departure: string,
  maxNights: number
): DepartureCheck {
  if (!data || departure <= checkin) return { ok: false, reason: 'antes' };

  let nights = 0;
  for (let night = checkin; night < departure; night = addDaysISO(night, 1)) {
    if (data.dias[night]?.estado !== 'libre') return { ok: false, reason: 'bloqueado' };
    nights += 1;
    if (nights > maxNights) return { ok: false, reason: 'maximo' };
  }
  if (nights < minNightsFor(data, checkin)) return { ok: false, reason: 'minimo' };
  return { ok: true };
}

export interface StayEstimate {
  nights: number;
  subtotal: number;
  prices: number[];
}

/** Precio estimado de la estancia (solo para mostrar). null si alguna noche no está libre. */
export function estimateStay(
  data: Availability | null,
  checkin: string,
  checkout: string
): StayEstimate | null {
  if (!data || checkout <= checkin) return null;
  const prices: number[] = [];
  for (let night = checkin; night < checkout; night = addDaysISO(night, 1)) {
    const day = data.dias[night];
    if (day?.estado !== 'libre' || typeof day.precio !== 'number') return null;
    prices.push(day.precio);
  }
  return { nights: prices.length, subtotal: prices.reduce((s, p) => s + p, 0), prices };
}

/** Agrupa las noches por precio: [{ price: 197, count: 3 }, { price: 240, count: 1 }] */
export function groupNightsByPrice(prices: number[]): { price: number; count: number }[] {
  const groups = new Map<number, number>();
  prices.forEach((p) => groups.set(p, (groups.get(p) ?? 0) + 1));
  return [...groups.entries()].map(([price, count]) => ({ price, count }));
}