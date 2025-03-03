import { gql } from "@apollo/client";

export const LOGIN_MUTATION = gql`
  mutation Login($username: String!, $password: String!) {
    login(loginUserInput: { username: $username, password: $password }) {
      accessToken
      user {
        id
        username
        role
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register($username: String!, $password: String!) {
    register(createUserInput: { username: $username, password: $password }) {
      accessToken
      user {
        id
        username
        role
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

export const PROFILE_QUERY = gql`
  query GetProfile {
    user {
      id
      username
      role
    }
  }
`;
