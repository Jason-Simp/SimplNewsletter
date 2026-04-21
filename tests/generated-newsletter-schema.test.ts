import test from "node:test";
import assert from "node:assert/strict";

import { validateGeneratedNewsletterPackage } from "../src/lib/generated-newsletter-schema";

test("recovers missing top-level title and intro from returned sections", () => {
  const result = validateGeneratedNewsletterPackage({
    sections: [
      {
        sectionType: "hero",
        title: "Hero",
        content: {
          headline: "School Closed Tuesday for Special Election Day",
          body: "Peach Valley Elementary will close next Tuesday while the building serves as a polling place."
        }
      },
      {
        sectionType: "top_story",
        title: "Top story",
        content: {
          headline: "Campus Closure for Voting",
          summary: "Families should plan ahead for the one-day closure and regular schedule resumption."
        }
      }
    ]
  });

  assert.equal(result.title, "School Closed Tuesday for Special Election Day");
  assert.equal(
    result.intro,
    "Peach Valley Elementary will close next Tuesday while the building serves as a polling place."
  );
  assert.equal(result.sections?.length, 2);
});

test("still rejects generic placeholder titles even when sections exist", () => {
  assert.throws(
    () =>
      validateGeneratedNewsletterPackage({
        title: "School newsletter",
        intro: "This issue covers family updates and reminders.",
        sections: [
          {
            sectionType: "hero",
            title: "Hero",
            content: {
              headline: "School newsletter",
              body: "This issue covers family updates and reminders."
            }
          },
          {
            sectionType: "top_story",
            title: "Top story",
            content: {
              headline: "Campus Reminder",
              summary: "Families should watch for more details next week."
            }
          }
        ]
      }),
    /Newsletter title is still too generic/
  );
});
