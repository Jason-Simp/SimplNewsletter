import test from "node:test";
import assert from "node:assert/strict";

import { isPublicAddress } from "../src/lib/outbound-url";
import { safeExternalUrl } from "../src/lib/safe-url";
import { isTrustedMutationOrigin } from "../src/lib/request-security";

test("blocks private and reserved callback addresses", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "169.254.169.254", "172.16.0.1", "192.168.1.1", "::1", "fd00::1"]) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress("1.1.1.1"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});

test("external render URLs must use HTTPS", () => {
  assert.equal(safeExternalUrl("javascript:alert(1)"), "");
  assert.equal(safeExternalUrl("http://example.com"), "");
  assert.equal(safeExternalUrl("https://example.com/path"), "https://example.com/path");
});

test("same-site mutations survive a trusted TLS-terminating proxy", () => {
  assert.equal(
    isTrustedMutationOrigin(
      "https://simplnewsletter.onrender.com",
      "http://localhost:10000",
      "simplnewsletter.onrender.com",
      "localhost:10000",
      "https"
    ),
    true
  );
  assert.equal(
    isTrustedMutationOrigin(
      "https://attacker.invalid",
      "http://localhost:10000",
      "simplnewsletter.onrender.com",
      "localhost:10000",
      "https"
    ),
    false
  );
});
