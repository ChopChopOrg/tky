# tky

![](./tky.gif)

## Example

```ts
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

const breeds = await dogsApi
  .get("dogs", {}, { searchParams: { limit: 20 } })
  .json()
  .then(json => json.map(dog => dog.breed));
```

## 🔌 Installation

```
npm install tky ky
```

## Alternatives

**But what if I don't trust my backend?**

In this scenario, you should definitely not use tky! \
Decode the data you receive. Few recommendations:

- [io-ts](https://github.com/gcanti/io-ts)
- [ts.data.json](https://github.com/joanllenas/ts.data.json)
- [runtypes](https://github.com/pelotom/runtypes)

You might also be interested in [typescript-is](https://github.com/woutervh-/typescript-is)

## API

## 🙌 Contributing

This project was bootstrapped with [TSDX](https://github.com/jaredpalmer/tsdx).

### Local Development

Below is a list of commands you will probably find useful.

#### `npm start` or `yarn start`

Runs the project in development/watch mode. Your project will be rebuilt upon changes. TSDX has a special logger for you convenience. Error messages are pretty printed and formatted for compatibility VS Code's Problems tab.

<img src="https://user-images.githubusercontent.com/4060187/52168303-574d3a00-26f6-11e9-9f3b-71dbec9ebfcb.gif" width="600" />

Your library will be rebuilt if you make edits.

#### `npm run build` or `yarn build`

Bundles the package to the `dist` folder.
The package is optimized and bundled with Rollup into multiple formats (CommonJS, UMD, and ES Module).

<img src="https://user-images.githubusercontent.com/4060187/52168322-a98e5b00-26f6-11e9-8cf6-222d716b75ef.gif" width="600" />

#### `npm test` or `yarn test`

Runs the test watcher (Jest) in an interactive mode.
By default, runs tests related to files changed since the last commit.
