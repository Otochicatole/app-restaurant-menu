export type SessionClaims = {
  adminId: string;
  email: string;
  jti: string;
};

export type IssuedSession = {
  token: string;
  claims: SessionClaims;
  expiresAt: Date;
};
