import { useQuery, useMutation, gql, QueryHookOptions, MutationHookOptions, DocumentNode } from "@apollo/client";

export function useGraphQLQuery(query: DocumentNode, options: QueryHookOptions = {}) {
  const result = useQuery(query, options);

  return {
    data: result.data,
    loading: result.loading,
    error: result.error,
    refetch: result.refetch,
  };
}

export function useGraphQLMutation(mutation: DocumentNode, options: MutationHookOptions = {}) {
  const [mutateFunction, result] = useMutation(mutation, options);

  const mutate = async (variables?: any) => {
    try {
      const response = await mutateFunction({ variables });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  return {
    mutate,
    data: result.data,
    loading: result.loading,
    error: result.error,
  };
}
