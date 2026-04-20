import test from "node:test";
import assert from "node:assert/strict";

import {
  canDeleteForSchool,
  canManageMemberAtSchool,
  canPublishForSchool,
  isWithinSchoolScope
} from "../src/lib/authorization";
import type { MemberRecord } from "../src/types/member";

const companyAdmin: MemberRecord = {
  id: "member-company",
  schoolId: "school-a",
  schoolName: "School A",
  email: "company@example.com",
  fullName: "Company Admin",
  role: "company_admin",
  isActive: true
};

const schoolAdmin: MemberRecord = {
  id: "member-school-admin",
  schoolId: "school-a",
  schoolName: "School A",
  email: "admin@example.com",
  fullName: "School Admin",
  role: "school_admin",
  isActive: true
};

const editor: MemberRecord = {
  id: "member-editor",
  schoolId: "school-a",
  schoolName: "School A",
  email: "editor@example.com",
  fullName: "Editor",
  role: "editor",
  isActive: true
};

test("company admins keep cross-school scope", () => {
  assert.equal(isWithinSchoolScope(companyAdmin, "school-b"), true);
  assert.equal(canPublishForSchool(companyAdmin, "school-b"), true);
  assert.equal(canDeleteForSchool(companyAdmin, "school-b"), true);
  assert.equal(canManageMemberAtSchool(companyAdmin, "school-b"), true);
});

test("school admins stay limited to their own school", () => {
  assert.equal(isWithinSchoolScope(schoolAdmin, "school-a"), true);
  assert.equal(isWithinSchoolScope(schoolAdmin, "school-b"), false);
  assert.equal(canPublishForSchool(schoolAdmin, "school-a"), true);
  assert.equal(canPublishForSchool(schoolAdmin, "school-b"), false);
  assert.equal(canDeleteForSchool(schoolAdmin, "school-a"), true);
  assert.equal(canDeleteForSchool(schoolAdmin, "school-b"), false);
  assert.equal(canManageMemberAtSchool(schoolAdmin, "school-a"), true);
  assert.equal(canManageMemberAtSchool(schoolAdmin, "school-b"), false);
});

test("editors can draft but cannot publish, delete, or manage members", () => {
  assert.equal(isWithinSchoolScope(editor, "school-a"), true);
  assert.equal(canPublishForSchool(editor, "school-a"), false);
  assert.equal(canDeleteForSchool(editor, "school-a"), false);
  assert.equal(canManageMemberAtSchool(editor, "school-a"), false);
});

test("blank school ids never grant access accidentally", () => {
  assert.equal(isWithinSchoolScope(companyAdmin, ""), false);
  assert.equal(canPublishForSchool(companyAdmin, ""), false);
  assert.equal(canDeleteForSchool(schoolAdmin, ""), false);
  assert.equal(canManageMemberAtSchool(editor, ""), false);
});
