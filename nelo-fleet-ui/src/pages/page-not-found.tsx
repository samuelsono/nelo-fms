import { Card } from "primereact/card";
import { useUserStore } from "../store/userStore";

const PageNotFound = () => {
  return (
    <div className="container mx-auto p-4">

      <Card title="404" className="p-2">
            <p className="text-xl">Not found</p>
            <p className="m-0">
                The page you are looking for does not exist.
            </p>
      </Card>

     
         
    </div>
  );
};

export default PageNotFound;