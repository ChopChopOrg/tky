/* eslint-disable sonarjs/no-duplicate-string */
import ky, { Input, Options } from "ky";
import { expecter } from "ts-snippet";

import { replaceEndpointParams, tky } from ".";

function makeKyMock() {
  const makeKyMethod = () =>
    jest.fn(() =>
      Object.assign(
        Promise.resolve({
          json() {
            return Promise.resolve();
          },
        }),
        {
          json() {
            return Promise.resolve();
          },
        }
      )
    );
  return {
    create() {
      return {
        get: makeKyMethod(),
        post: makeKyMethod(),
        put: makeKyMethod(),
        delete: makeKyMethod(),
        patch: makeKyMethod(),
      };
    },
  };
}

jest.mock("ky", makeKyMock);

// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require

describe("types - tky", () => {
  test("constructor accepts optional ky implementation", () => {
    // ky-universal is a real world use case
    const client = tky<{
      dogs: {
        get: {};
      };
    }>({}, ky.create);

    client.get("dogs");
  });

  test("constructor infers types", () => {
    const expectSnippet = expecter(
      snippet => /* ts */ `
                import { tky } from './src';

                type Dog = {
                    name: string;
                    breed: 'big-dog' | 'small-dog';
                };
                const dogsApi = tky<{
                    dogs: {
                        get: {
                            searchParams: {
                                limit: number;
                            };
                            result: Dog[];
                        };
                        post: {
                            json: Dog;
                            result: {
                                id: number;
                            };
                        };
                    };
                }>({ prefixUrl: 'https://example.com/dogs' });

                ${snippet}
            `
    );

    expectSnippet("").toSucceed();

    expectSnippet(/* ts */ `
            const breed = await dogsApi
                .get('dogs', {}, { searchParams: { limit: 20 } })
                .then(res => res.json())
                .then(dogs => dogs[0].breed);
            );
        `).toInfer("breed", '"big-dog" | "small-dog"');

    expectSnippet(/* ts */ `
            const id = await dogsApi
                .post('dogs', {}, { json: { name: 'Rex', breed: 'small-dog' } })
                .json()
                .then(({ id }) => id);
        `).toInfer("id", "number");
  });

  test("AuthAPI scenario works", async () => {
    const exchangeToken = jest.fn((url: Input, _options: Options) => {
      expect(url).toBe("auth/exchange_token");
      return {
        json: jest.fn(() =>
          Promise.resolve({
            data: { expire: "", token: "encoded-user-token" },
          })
        ),
      };
    });

    type AuthExchangeTokenResponse =
      | {
          message: "success";
          data: {
            expire: string;
            token: string;
          };
        }
      | { error: unknown };

    const AuthAPI = tky<{
      "auth/exchange_token": {
        get: { result: AuthExchangeTokenResponse };
      };
    }>({ prefixUrl: "https://example.com" }, (() => {
      return { get: exchangeToken };
    }) as any);

    const result = await AuthAPI.get(
      "auth/exchange_token",
      {},
      {
        headers: { Authorization: "Bearer 110X303D000121211" },
      }
    )
      .json()
      .then(res => {
        return "data" in res
          ? { type: "success", token: res.data.token }
          : { type: "error", message: res.error };
      });

    expect(exchangeToken).toBeCalledTimes(1);
    expect(result.token).toBe("encoded-user-token");
  });

  test("GET", () => {
    expecter(
      () => /* ts */ `
            import { tky } from './src';

            const testGet = tky<{
                'user/:id': {
                    get: {
                        params: { id: number };
                        result: { name: string };
                    };
                };
            }>({});

            const username = testGet
                .get('user/:id', { id: 12 })
                .json()
                .then(user => user.name);
        `
    )("").toInfer("username", "Promise<string>");
  });

  test("GET with params", () => {
    type UsersApiSpec = {
      "user/:id": {
        get: {
          params: { id: number };
          searchParams: { foo: string };
        };
      };
    };

    const testGet = tky<UsersApiSpec>({});
    testGet.get(
      "user/:id",
      { id: 2 },
      {
        searchParams: {
          foo: "bar",
        },
      }
    );
  });

  test("GET with empty params, call with options", () => {
    const testGet = tky<{
      "user/:id": {
        get: {
          params: { id: number };
        };
      };
    }>({});

    testGet.get(
      "user/:id",
      { id: 12 },
      {
        headers: {
          foo: "bar",
        },
      }
    );
  });

  test("POST", () => {
    const testPost = tky<{
      "user/:id": {
        post: {
          params: { id: number };
          result: { user: string };
        };
      };
    }>({});
    testPost.post("user/:id", { id: 12 });
  });

  test("POST with body", () => {
    expecter(
      snippet => /* ts */ `
                import { tky, ClearMethods, AddEndpoint } from './src';

                type TestPostApi = ClearMethods &
                AddEndpoint<
                    'post',
                    'user/:id',
                    { id: number },
                    { json: { foo: string } },
                    { user: string }
                >

                const testPost: TestPostApi = tky<{
                    'user/:id': {
                        post: {
                            params: { id: number };
                            json: { foo: string };
                            result: { user: string };
                        };
                    };
                }>({});

                ${snippet}
                `
    )(
      /* ts */ `
            testPost
                .post(
                    'user/:id',
                    { id: 12 },
                    {
                        json: {
                            foo: 'bar',
                        },
                    }
                )
                .then(res => res.json())
                .then(data => data.user.endsWith('.com'));
        `
    ).toSucceed();
  });

  test("POST with empty params, call with options", () => {
    const testPost = tky<{
      "user/:id": {
        post: {
          params: { id: number };
          result: { user: string };
        };
      };
    }>({});
    testPost.post(
      "user/:id",
      { id: 12 },
      {
        headers: {
          foo: "bar",
        },
      }
    );
  });

  test("PUT", () => {
    const client = tky<{
      "user/:id": {
        post: {
          params: { id: number };
          result: { user: string };
        };
      };
    }>({});
    client.post("user/:id", { id: 12 });
  });

  test("delete", () => {
    const client = tky<{
      "user/:id": {
        delete: {
          params: { id: number };
          result: { user: string };
        };
      };
    }>({});
    client.delete("user/:id", { id: 12 });
  });

  test("PATCH", () => {
    const client = tky<{
      "user/:id": {
        patch: {
          params: { id: number };
          result: { user: string };
        };
      };
    }>({});
    client.patch("user/:id", { id: 12 });
  });
});

describe("replaceEndpointParams", () => {
  it("should replace the parameter in the URL", () => {
    expect(
      replaceEndpointParams("user/:id", {
        id: 12,
      })
    ).toBe("user/12");
  });

  it("should replace multiple parameters in the url", () => {
    expect(
      replaceEndpointParams("/user/:userid/comment/:commentid", {
        userid: 12,
        commentid: 42,
      })
    ).toBe("/user/12/comment/42");
  });

  it("should work when one parameter is a substring of another", () => {
    expect(
      replaceEndpointParams("/user/:id/comment/:idofcomment", {
        id: 12,
        idofcomment: 42,
      })
    ).toEqual("/user/12/comment/42");
  });
});
