export interface HotelSuggestion {
  name: string;
  city: string;
  address?: string;
  priceRange: '$' | '$$' | '$$$';
  bookingPhoto?: string;
  bookingUrl?: string;
  // Foursquare enrichment (optional)
  fsqRating?: number;
  fsqPhoto?: string;
  fsqWebsite?: string;
  fsqPrice?: number;
  // Coordinates — from Foursquare geocodes (used to update map when hotel is selected)
  lat?: number;
  lng?: number;
}

export interface PlannerAnswersSnapshot {
  travelGroup: string;
  kidsAges: string[];
  distancePreference: string;
  interests: string[];
  hotelPreference: string;
  hotelGuests: string;
  hotelCheckin: string;
  hotelNights: string;
  numberOfEnrouteStops: string;
  numberOfStops: string;
}

export interface Stop {
  name: string;
  city: string;
  description: string;
  tip: string;
  duration: string;
  lat: number;
  lng: number;
  category: 'nature' | 'food' | 'culture' | 'adventure' | 'scenic';
  stopType?: 'en-route' | 'destination';
  // Foursquare enrichment (optional — present when a match is found)
  fsqRating?: number;
  fsqReviewCount?: number;
  fsqHours?: string;
  fsqWebsite?: string;
  fsqPrice?: number;
  fsqPhoto?: string;
}

export interface TripData {
  routeName: string;
  tagline: string;
  totalMiles: number;
  stops: Stop[];
  hotels?: HotelSuggestion[];
  completed?: boolean;
  destinationDescription?: string;
  funFacts?: string[];
  tripChecklist?: string[];
  selectedHotelName?: string;
  selectedHotelAddress?: string;
  plannerAnswers?: PlannerAnswersSnapshot;
}

export interface TripPreferences {
  travelGroup: string;
  kidsAges?: string[];
  stopTypes: string[];
  numberOfEnrouteStops: string;
  numberOfStops: string;
  stopDuration: string;
  hotelPreference?: string;
  hotelGuests?: string;
  hotelCheckin?: string;
  hotelNights?: string;
}

export interface Destination {
  name: string;
  region: string;
  estimatedMiles?: number;
  matchScore: number;
  description: string;
  whyMatch: string;
  whyDrive: string;
  photoUrl?: string;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}
