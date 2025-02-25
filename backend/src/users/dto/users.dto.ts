export type User = {
  id: number;
  username: string;
  password: string;
};

export type JWTPayload = {
  sub: string;
  username: string;
};
