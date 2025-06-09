import { Meta } from "./meta";

// Interface for City
export interface City {
  id: number;
  name: string;
}

export interface CityResponse {
  data: City;
  meta: Meta;
}
