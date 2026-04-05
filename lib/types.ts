export interface Stop {
  name: string;
  city: string;
  description: string;
  tip: string;
  duration: string;
  lat: number;
  lng: number;
  category: 'nature' | 'food' | 'culture' | 'adventure' | 'scenic';
}

export interface TripData {
  routeName: string;
  tagline: string;
  totalMiles: number;
  stops: Stop[];
}

export interface TripPreferences {
  travelGroup: string;
  kidsAges?: string[];
  stopTypes: string[];
  numberOfStops: string;
  stopDuration: string;
}
