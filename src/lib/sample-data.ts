import { schoolAmplifiedBrand } from "@/lib/brand";
import { defaultDistributionOptions, mediaConstraints } from "@/lib/product-config";
import type { NewsletterDocument } from "@/types/newsletter";
import { defaultSchoolTheme } from "@/lib/brand";

const visibleEverywhere = {
  web: true,
  email: true,
  pdf: true,
  html: true,
  blog: true
};

export const sampleNewsletter: NewsletterDocument = {
  id: "spring-april-2025",
  title: "Spring Momentum",
  issueDate: "April 2025",
  audience: "District Families and Staff",
  intro:
    "A guided district newsletter builder that turns stories, links, photos, and dates into a polished publication for web, email, PDF, and blog distribution.",
  principalName: "Dr. Elena Morris",
  subjectLine: "Spring Momentum from Riverside High",
  previewText: "Student stories, event highlights, district dates, and ways families can stay connected.",
  organization: {
    name: "Riverside High School",
    tagline: "Curiosity, Character, Community",
    websiteUrl: "https://schoolamplified.example.com/riverside",
    contactEmail: "hello@schoolamplified.example.com",
    phone: "(555) 010-2400",
    address: "15 River Walk Drive, Marietta, GA 30060",
    logoUrl: schoolAmplifiedBrand.logoUrl,
    colors: {
      ...defaultSchoolTheme
    }
  },
  workspace: {
    schoolId: "demo-school-1",
    publishMode: "instant",
    archiveDays: 30,
    usersManagedBySchool: true,
    generationProvider: "elevenlabs",
    knowledgeProvider: "supabase",
    syncProvider: "elevenlabs",
    assistantReference: "",
    integrationEndpoint: "",
    encryptedKnowledgeRef: "enc_proj_riverside_demo_001",
    mediaConstraints,
    roles: ["school_admin", "editor"]
  },
  distributionOptions: defaultDistributionOptions,
  sections: [
    {
      id: "hero",
      type: "hero",
      title: "Hero",
      enabled: true,
      sortOrder: 1,
      visibility: visibleEverywhere,
      content: {
        eyebrow: "The Wire Demo",
        headline: "A better school newsletter workflow",
        body:
          "This sample front end uses the provided HTML section model while shifting the visual language toward a more editorial, premium layout inspired by the uploaded newsletter template.",
        stats: [
          { label: "Minutes to draft", value: "12" },
          { label: "Output channels", value: "5" },
          { label: "Reusable sections", value: "15" }
        ],
        heroImage:
          "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1400&q=80"
      }
    },
    {
      id: "principal",
      type: "principal_message",
      title: "Principal Message",
      enabled: true,
      sortOrder: 2,
      visibility: visibleEverywhere,
      content: {
        quote:
          "Families should never have to hunt across five tools to understand what is happening at school. One intake flow should create one clear story everywhere.",
        author: "Dr. Elena Morris"
      }
    },
    {
      id: "top-story",
      type: "top_story",
      title: "Top Story",
      enabled: true,
      sortOrder: 3,
      visibility: visibleEverywhere,
      content: {
        headline: "District-wide publishing, not one-off layout work",
        summary:
          "The builder stores structured content first, then renders separate experiences for web, email, PDF, and HTML export. That keeps every channel cleaner and easier to maintain.",
        url: "#",
        image:
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
      }
    },
    {
      id: "campus-news",
      type: "news_grid",
      title: "Campus News",
      enabled: true,
      sortOrder: 4,
      visibility: visibleEverywhere,
      content: {
        items: [
          {
            id: "n1",
            headline: "Structured forms replace blank-page anxiety",
            summary:
              "Writers complete guided prompts instead of designing a newsletter from scratch.",
            url: "#",
            tag: "Workflow"
          },
          {
            id: "n2",
            headline: "Templates stay premium and district-safe",
            summary:
              "Schools can personalize branding without breaking layout quality or compliance basics.",
            url: "#",
            tag: "Brand"
          },
          {
            id: "n3",
            headline: "Distribution becomes part of the product",
            summary:
              "Email, hosted pages, PDFs, and HTML export are all generated from the same source draft.",
            url: "#",
            tag: "Distribution"
          },
          {
            id: "n4",
            headline: "Vector search stays optional",
            summary:
              "Retrieval helps reuse content from archived issues but never becomes a rendering dependency.",
            url: "#",
            tag: "AI"
          }
        ]
      }
    },
    {
      id: "split",
      type: "academics",
      title: "Academics and Athletics",
      enabled: true,
      sortOrder: 5,
      visibility: visibleEverywhere,
      content: {
        academics: {
          headline: "Academics updates",
          summary:
            "Use this card for curriculum milestones, testing reminders, honors, or department updates.",
          meta: "Testing week: April 22-26"
        },
        athletics: {
          headline: "Athletics updates",
          summary:
            "Use this card for schedules, match recaps, sign-up deadlines, or student-athlete recognition.",
          meta: "Spring showcase: May 3"
        }
      }
    },
    {
      id: "spotlight",
      type: "student_spotlight",
      title: "Student Spotlight",
      enabled: true,
      sortOrder: 6,
      visibility: visibleEverywhere,
      content: {
        name: "Maya Thompson",
        role: "Senior, Robotics Captain",
        summary:
          "Maya leads peer mentoring on competition nights and coordinates family-ready recaps for the engineering club.",
        image:
          "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=900&q=80"
      }
    },
    {
      id: "events",
      type: "arts_events",
      title: "Arts and Events",
      enabled: true,
      sortOrder: 7,
      visibility: visibleEverywhere,
      content: {
        items: [
          {
            id: "e1",
            date: "April 18",
            title: "Spring Arts Preview",
            summary: "Student performances, gallery displays, and family open house.",
            url: "#"
          },
          {
            id: "e2",
            date: "April 24",
            title: "Community Showcase",
            summary: "A campus-wide event blending clubs, athletics, and academic demos.",
            url: "#"
          }
        ]
      }
    },
    {
      id: "clubs",
      type: "clubs_and_organizations",
      title: "Clubs",
      enabled: true,
      sortOrder: 8,
      visibility: visibleEverywhere,
      content: {
        items: [
          "Debate team applications close Friday.",
          "National Art Honor Society hosts an open studio next week.",
          "Peer tutoring requests are now open for final exam prep.",
          "Student council is collecting family event volunteers."
        ]
      }
    },
    {
      id: "calendar",
      type: "calendar_snapshot",
      title: "Calendar Snapshot",
      enabled: true,
      sortOrder: 9,
      visibility: visibleEverywhere,
      content: {
        items: [
          { date: "Apr 12", detail: "Parent advisory council meeting at 6:00 PM." },
          { date: "Apr 18", detail: "Spring Arts Preview and family gallery walk." },
          { date: "Apr 22", detail: "State assessment window begins." },
          { date: "May 03", detail: "Athletics showcase and community tailgate." }
        ]
      }
    },
    {
      id: "cta",
      type: "cta_band",
      title: "Calls to Action",
      enabled: true,
      sortOrder: 10,
      visibility: visibleEverywhere,
      content: {
        volunteer: {
          headline: "Family volunteer sign-up",
          summary: "Create a lightweight CTA for event helpers, club nights, or fundraiser support.",
          url: "#"
        },
        support: {
          headline: "Support classroom projects",
          summary: "Feature a donation or sponsorship request without redesigning a separate campaign page.",
          url: "#"
        }
      }
    },
    {
      id: "quote",
      type: "quote_or_mission",
      title: "Mission",
      enabled: true,
      sortOrder: 11,
      visibility: visibleEverywhere,
      content: {
        quote:
          "One input, many outputs, with enough editorial structure that the finished work still feels designed.",
        attribution: "The Wire by SchoolAmplified"
      }
    },
    {
      id: "quick-links",
      type: "quick_links",
      title: "Quick Links",
      enabled: true,
      sortOrder: 12,
      visibility: visibleEverywhere,
      content: {
        items: [
          { id: "q1", label: "School Calendar", url: "#" },
          { id: "q2", label: "Announcements", url: "#" },
          { id: "q3", label: "Lunch Menu", url: "#" },
          { id: "q4", label: "Athletics", url: "#" }
        ]
      }
    },
    {
      id: "footer",
      type: "footer",
      title: "Footer",
      enabled: true,
      sortOrder: 13,
      visibility: visibleEverywhere,
      content: {}
    }
  ]
};

export const buildSteps = [
  {
    id: "setup",
    title: "Issue setup",
    description: "Brand profile, issue date, audience, and newsletter framing."
  },
  {
    id: "content",
    title: "Story content",
    description: "Leadership note, stories, spotlight, and core school updates."
  },
  {
    id: "events",
    title: "Events and links",
    description: "Calendar, clubs, quick links, and CTA destinations."
  },
  {
    id: "media",
    title: "Media",
    description: "Logos, hero image, section imagery, and alt text handling."
  },
  {
    id: "review",
    title: "Review",
    description: "Channel previews, section toggles, and final editorial cleanup."
  },
  {
    id: "distribution",
    title: "Distribution",
    description: "Hosted page, email send, blog post, HTML export, and PDF."
  }
] as const;
