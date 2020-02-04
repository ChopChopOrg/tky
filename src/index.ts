import ky, { Options, ResponsePromise } from "ky";
import { UnionToIntersection } from "utility-types";

export type Json =
  | undefined /* it's not present in JSON, but we add it for serialization */
  | string
  | number
  | boolean
  | null
  | { [property: string]: Json }
  | Json[];

/**
 * Search parameters to include in the request URL.
 * Accepts any value supported by URLSearchParams() and
 * a dictionary with nullable values which we filter out.
 */
export type SearchParams =
  | Exclude<
      Options["searchParams"],
      Record<string, string | number | boolean> | string
    >
  | Record<string, string | number | boolean | undefined | null>;

/**
 * All HTTP methods that `ky` supports.
 *
 * These are method names on the object created by `ky.create`.
 */
export type RequestMethod = "get" | "post" | "put" | "delete" | "patch";

/**
 * These are possible value types for request parameters.
 */
export type GenericRequestParams = Partial<
  Record<string, string | number | boolean | undefined>
>;

/**
 * Helper for limiting what's available in the regular `ky` `Options` type,
 * based on what request we'll be making, and typing the available
 * parameters of the request.
 *
 * If we are making GET request, only search parameters will be available,
 * (and typed). Similarly, when making any other request the body of
 * the request will be typed.
 *
 * @example
 * type SampleGet = LimitedKyOptions<'get', { search: string }>;
 *
 * // This is legal:
 * const Options: SampleGet = {
 *   searchParams: {
 *     search: 'foo'
 *   }
 * }
 *
 * // But these are not:
 * const Options: SampleGet = {
 *   searchParams: {
 *     // Not present in Params
 *     page: 5
 *   }
 *
 *   // GET request does not have a body.
 *   json: {
 *     userId: 1
 *   }
 * }
 */
export type LimitedKyOptions<
  O extends { searchParams?: SearchParams; json?: Json }
> = (Omit<Options, "searchParams" | "json"> & O) | undefined;

/**
 * Removes all methods from instance created with `createKy` method.
 *
 * Ensures that we are not able to call any endpoints that are not
 * explicitly defined.
 */
export interface ClearMethods  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  extends Omit<ReturnType<typeof tky>, RequestMethod> {}

export interface TypedResponsePromise<T>
  extends Omit<ResponsePromise, "json" | "then"> {
  json(): Promise<T>;
  then<TResult1, TResult2 = never>(
    onfulfilled?:
      | ((
          value: Omit<Response, "json"> & {
            json(): Promise<T>;
          }
        ) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: any) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): Promise<TResult1 | TResult2>;
}

/**
 * Adds endpoint to and object created by `createKy`..
 *
 * Combined with `ClearMethods` generates types for all API endpoints,
 * providing us with hints of names of endpoints, and attaching correct types
 * of responses to each endpoint.
 *
 * @example
 * type MyApi = ClearMethods &
 *     AddEndpoint<'get', 'users', {}, User[]> &
 *     AddEndpoint<'get', 'users/:id', { id: number }, User>;
 *
 * const Api: MyApi = ky.create({ ... });
 */
export type AddEndpoint<
  Method extends RequestMethod,
  Endpoint extends string,
  EndpointParams extends Record<string, string | number>,
  RequestParams extends { searchParams?: SearchParams; json?: Json },
  ResponsePayload
> = Record<
  Method,
  (
    url: Endpoint,
    endpointParams?: EndpointParams,
    options?: LimitedKyOptions<RequestParams>
  ) => TypedResponsePromise<ResponsePayload>
>;

/**
 * In a given endpoint with parameters (like React Router route) this function
 * replaces the parameters with values from `params`.
 *
 * @example
 * replaceEndpointParams(
 *   '/users/:id',
 *   { id: 12 }
 * ) === '/users/12'
 */
export const replaceEndpointParams = (
  endpoint: string,
  params: Record<string, string | number>
): string => {
  return endpoint.replace(/:\w+/g, v =>
    params[v.slice(1)] ? params[v.slice(1)].toString() : v
  );
};

export interface EndpointSpec {
  params?: Record<string, number | string>;
  searchParams?: GenericRequestParams;
  json?: Json;
  result?: any;
}

export type EndpointsSpec = Record<
  string,
  { [P in RequestMethod]?: EndpointSpec }
>;

export type TypedKyInstance<
  EndpointsDict extends EndpointsSpec
> = UnionToIntersection<
  {
    [E in keyof EndpointsDict]: E extends string
      ? {
          [M in keyof EndpointsDict[E]]: M extends RequestMethod
            ? EndpointsDict[E][M] extends {
                params?: infer EP;
                searchParams?: infer SP;
                json?: infer B;
                result?: infer Payload;
              }
              ? AddEndpoint<
                  M,
                  E,
                  EP extends Record<string, string | number> ? EP : {},
                  (SP extends SearchParams ? { searchParams: SP } : {}) &
                    (B extends Json ? { json: B } : {}),
                  Payload
                >
              : never
            : never;
        }[keyof EndpointsDict[E]]
      : never;
  }[keyof EndpointsDict]
>;
export interface KyInstance extends Omit<typeof ky, "stop"> {}

/**
 * Creates a wrapper for `ky` that behaves in the same way as `ky`,
 * but can handle routes with parameters (like `/user/:id`).
 *
 * This is because `ky` accepts `string | Input | Request` as URL,
 * which means we cannot add types for parametrized routes, because
 * Typescript does not support regex types (since `:id` would be
 * a dynamic value).
 *
 * @example
 * type Dog = {
 *     name: string;
 *     breed: 'big-dog' | 'small-dog';
 * };
 * const dogsApi = tky<{
 *     dogs: {
 *         get: {
 *             searchParams: {
 *                 limit: number;
 *             };
 *             result: Dog[];
 *         };
 *         post: {
 *             json: Dog;
 *             result: {
 *                 id: number;
 *             };
 *         };
 *     };
 *     'dog/:id': {
 *          get: {
 *              params: { id: number };
 *          }
 *     }
 * }>({ prefixUrl: 'https://example.com/dogs' });
 *
 * const breed = await dogsApi
 *     .get('dogs', {}, { searchParams: { limit: 20 } })
 *     .then(res => res.json())
 *     .then(dogs => dogs[0].breed);
 *
 * // We get hints for the endpoint and the parameters.
 * const data = await dogsApi.get('dog/:id', { id: 12 }).json();
 *
 */

export const tky = <T extends EndpointsSpec>(
  defaultOptions: Options,
  create: (options: Options) => KyInstance = ky.create
): TypedKyInstance<T> => {
  const kyInstance = create(defaultOptions);

  const callKyMethod = (
    method: RequestMethod,
    endpoint: string,
    endpointParams: Record<string, string | number> = {},
    options?: Options
  ) => {
    let { searchParams } = options || {};

    // We accept searchParams with nullable values.
    // ky would just stringify them and we expect
    // you don't want to send "?q=undefined".
    if (
      typeof searchParams === "object" &&
      !(searchParams instanceof URLSearchParams) &&
      !Array.isArray(searchParams)
    ) {
      const newSearchParams: typeof searchParams = {};
      for (const [key, value] of Object.entries(searchParams)) {
        if (value) {
          newSearchParams[key] = value;
        }
      }
    }

    return kyInstance[method](
      replaceEndpointParams(endpoint, endpointParams),
      options && { ...options, searchParams }
    );
  };

  const get = (
    endpoint: string,
    endpointParams?: Record<string, string | number>,
    options?: Options
  ) => {
    return callKyMethod("get", endpoint, endpointParams, options);
  };

  const post = (
    endpoint: string,
    endpointParams?: Record<string, string | number>,
    options?: Options | undefined
  ) => {
    return callKyMethod("post", endpoint, endpointParams, options);
  };

  const put = (
    endpoint: string,
    endpointParams?: Record<string, string | number>,
    options?: Options | undefined
  ) => {
    return callKyMethod("put", endpoint, endpointParams, options);
  };

  // `delete` is not a legal variable name.
  const deleteMethod = (
    endpoint: string,
    endpointParams?: Record<string, string | number>,
    options?: Options | undefined
  ) => {
    return callKyMethod("delete", endpoint, endpointParams, options);
  };

  const patch = (
    endpoint: string,
    endpointParams?: Record<string, string | number>,
    options?: Options | undefined
  ) => {
    return callKyMethod("patch", endpoint, endpointParams, options);
  };

  return {
    get,
    post,
    put,
    delete: deleteMethod,
    patch,
    kyInstance,
  } as TypedKyInstance<T>;
};
