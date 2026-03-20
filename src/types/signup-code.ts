export type SignupCodeRecord = {
  id: string;
  code: string;
  description: string;
  isActive: boolean;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
};
