import VehicleMap from "../components/vehicle-map";

const TrackingPage = () => {
    return (
        <div className="h-screen w-full">
            <VehicleMap longitude={0} latitude={0} />
        </div>
    );
}

export default TrackingPage;
