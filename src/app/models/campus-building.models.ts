export interface GeoCoordinates {

    latitude: number;
    longitude: number;

}

export interface CampusBuilding{

    id: string;
    buildingNumber: number;
    name: string;
    address: string;
    uses: string[];
    coordinates: GeoCoordinates;
    aboveGroundFloors: number | null;
    basementFloors: number | null;


}