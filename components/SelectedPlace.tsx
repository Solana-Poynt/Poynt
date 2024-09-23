import { ShapeSource, SymbolLayer, Images } from '@rnmapbox/maps';
import { feature, point, featureCollection } from '@turf/helpers';
import { useRef } from 'react';
import { Camera } from '@rnmapbox/maps';

interface Place {
  id: string;
  name: string;
  coordinates: [number, number] | number[];
  distance?: number;
}

interface SelectedPlaceMarkerProps {
  selectedPlace: Place | null;
  onPlaceSelect: (place: Place) => void;
}

const SelectedPlace: React.FC<SelectedPlaceMarkerProps> = ({ selectedPlace, onPlaceSelect }) => {
  const cameraRef = useRef<Camera>(null);

  if (!selectedPlace) return null;

  const placePoint = point(selectedPlace.coordinates, {
    id: selectedPlace.id,
    name: selectedPlace.name,
  });

  const onMarkerPress = () => {
    onPlaceSelect(selectedPlace);

    // Move camera to the selected place
    cameraRef.current?.setCamera({
      centerCoordinate: selectedPlace.coordinates,
      zoomLevel: 15,
      animationDuration: 3000,
    });
  };
  return (
    <>
      <Camera
        ref={cameraRef}
        zoomLevel={15}
        followZoomLevel={15}
        centerCoordinate={selectedPlace.coordinates}
        animationMode="flyTo"
        animationDuration={3000}
      />
      <ShapeSource
        id="selected-place"
        shape={featureCollection([placePoint])}
        onPress={onMarkerPress}>
        <SymbolLayer
          id="selectedPlaceMarker"
          style={{
            iconImage: 'pin',
            iconSize: 0.22,
            iconAllowOverlap: false,
            iconAnchor: 'bottom',
          }}
        />
        <Images images={{ pin: require('../assets/pin.png') }} />
      </ShapeSource>
    </>
  );
};

export default SelectedPlace;
