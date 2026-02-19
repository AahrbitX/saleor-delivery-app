import {
  createClient as urqlCreateClient,
  cacheExchange,
  fetchExchange,
  makeOperation,
} from "urql";

export const createClient = (url: string, getAuth: () => string | null) =>
  urqlCreateClient({
    url,
    exchanges: [
      cacheExchange,
      ({ forward }) =>
        (ops$) => {
          const { pipe, map } = require("wonka");
          return pipe(
            ops$,
            map((operation: any) => {
              const token = getAuth();
              if (!token) return operation;
              return makeOperation(operation.kind, operation, {
                ...operation.context,
                fetchOptions: {
                  ...((typeof operation.context.fetchOptions === "function"
                    ? operation.context.fetchOptions()
                    : operation.context.fetchOptions) || {}),
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              });
            }),
            forward
          );
        },
      fetchExchange,
    ],
  });