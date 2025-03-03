import { ApolloClient, InMemoryCache, createHttpLink } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";

const httpLink = createHttpLink({
  uri: `${process.env.NEXT_PUBLIC_API_BASE_URL}/graphql`,
  credentials: "include",
});

// this is a fallback in-case cookies are not working properly on the browser
const authLink = setContext((_, { headers }) => {
  const accessToken = sessionStorage.getItem("accessToken");
  return {
    headers: {
      ...headers,
      Authorization: accessToken ? `Bearer ${accessToken}` : "",
    },
  };
});

const apolloClient = new ApolloClient({
  link: authLink.concat(httpLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: "network-only",
      errorPolicy: "all",
    },
    query: {
      fetchPolicy: "network-only",
      errorPolicy: "all",
    },
  },
});

export default apolloClient;
