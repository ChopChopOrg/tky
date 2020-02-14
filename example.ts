import { tky } from "./src";

type Dog = {
  name: string;
  breed: "pug" | "shiba inu" | "beagle";
};

const dogsApi = tky<{
  dogs: {
    get: {
      searchParams: { limit: number };
      result: Dog[];
    };
    post: {
      json: Dog;
      result: { id: number };
    };
  };
}>({ prefixUrl: "https://example.com/dogs" });

dogsApi
  .get("dogs", {}, { searchParams: { limit: 20 } })
  .json()
  .then(json => json.map(dog => dog.breed));

dogsApi
  .post("dogs", {}, { json: { breed: "beagle", name: "Rex" } })
  .json()
  .then(res => res.id);
