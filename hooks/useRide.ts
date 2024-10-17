import { useMemo } from 'react';

const useRide = (distanceInKm: any) => {
  const baseFare = 0.9; // 90 cents
  const baseDistance = 0.5; // 500 meters
  const additionalRatePerKm = 0.5; // 50 cents per additional km

  // ETA calculation constants
  const baseETA = 3; // 3 minutes for first 500m
  const additionalTimePerKm = 2; // 2 minutes per additional km

  const calculations = useMemo(() => {
    // Fare calculation
    const calculateFare = () => {
      if (distanceInKm <= baseDistance) {
        return baseFare;
      }
      const additionalDistance = distanceInKm - baseDistance;
      const additionalFare = additionalDistance * additionalRatePerKm;
      return baseFare + additionalFare;
    };

    // ETA calculation
    const calculateETA = () => {
      if (distanceInKm <= baseDistance) {
        return baseETA;
      }
      const additionalDistance = distanceInKm - baseDistance;
      const additionalTime = additionalDistance * additionalTimePerKm;
      return Math.round(baseETA + additionalTime);
    };

    const fare = calculateFare();
    const eta = calculateETA();

    return {
      distance: distanceInKm,
      fare: fare.toFixed(2),
      eta: eta,
      fareDetails: `$${fare.toFixed(2)} for ${distanceInKm.toFixed(2)} km`,
      etaDetails: `${eta} minutes for ${distanceInKm.toFixed(2)} km`,
    };
  }, [distanceInKm]);

  return calculations;
};

export default useRide;
