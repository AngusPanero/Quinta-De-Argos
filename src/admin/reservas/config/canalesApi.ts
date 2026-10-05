import axios from "axios";

const API = import.meta.env.VITE_API_URL;
const opts = { withCredentials: true };

export interface AirbnbMultiplier {
    factor: number | null;
    percent: number;
    limits: { min: number; max: number };
}

export interface AirbnbConfig {
    multiplier: AirbnbMultiplier;
    listing: { connected: boolean; airbnbListingId: string | null };
    discounts: {
        lastMinuteDays: number | null;
        lastMinutePercent: number | null;
        weekPercent: number | null;
        monthPercent: number | null;
    };
}

export interface MultiplierPreview {
    before: { factor: number | null; percent: number };
    after: { factor: number | null; percent: number };
    examples: { price: number; airbnb: number }[];
}

export async function fetchCanales(): Promise<{ airbnb: AirbnbConfig }> {
    const { data } = await axios.get(`${API}/api/admin/config/canales`, opts);
    return data;
}

export async function previewAirbnbMultiplier(percent: string): Promise<MultiplierPreview> {
    const { data } = await axios.post(`${API}/api/admin/config/canales/airbnb/preview`, { percent }, opts);
    return data;
}

export async function applyAirbnbMultiplier(percent: string, pin: string): Promise<{ airbnb: AirbnbConfig }> {
    const { data } = await axios.post(`${API}/api/admin/config/canales/airbnb`, { percent, pin }, opts);
    return data;
}