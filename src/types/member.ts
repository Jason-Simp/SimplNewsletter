export type MemberMembership = {
  id: string;
  schoolId: string;
  schoolName: string;
  role: "company_admin" | "school_admin" | "editor";
  isActive: boolean;
};

export type MemberRecord = {
  id: string;
  schoolId: string;
  schoolName: string;
  email: string;
  fullName: string;
  role: "company_admin" | "school_admin" | "editor";
  isActive: boolean;
  memberships?: MemberMembership[];
};
