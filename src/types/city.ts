import type { Meta } from "./meta.ts";

// Interface for City
export interface City {
  id: number;
  name: string;
}

export interface CityResponse {
  data: City;
  meta: Meta;
}

export interface AllCitiesResponse {
  data: {
    cities: City[];
  };
  meta: {
    code: number;
    message: string;
  };
}