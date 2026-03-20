export type MemberRecord = {
  id: string;
  schoolId: string;
  schoolName: string;
  email: string;
  fullName: string;
  role: "school_admin" | "editor";
  isActive: boolean;
};
