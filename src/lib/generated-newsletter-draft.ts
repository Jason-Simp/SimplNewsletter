import type { ContentGenerateResponse } from "@/types/integration";
import type { UploadedAsset } from "@/types/media";
import type { NewsletterDocument } from "@/types/newsletter";

type GeneratedSection = NonNullable<ContentGenerateResponse["sections"]>[number];
type PlannedStoryNote = {
  notes: string;
  imageName: string;
};

export function applyGeneratedDraftToDocument(
  document: NewsletterDocument,
  generated: ContentGenerateResponse,
  quickNotes: string,
  uploadedAssets: UploadedAsset[]
) {
  const generatedSectionTypes = new Set(generated.sections?.map((item) => item.sectionType) ?? []);
  const fallbackTitle = getGeneratedTitle(generated, quickNotes);
  const fallbackIntro = getGeneratedIntro(generated, quickNotes);
  const imageAssignments = selectImageAssignments(generated, uploadedAssets, quickNotes);

  return {
    ...document,
    title: fallbackTitle,
    intro: fallbackIntro,
    sections: document.sections
      .map((section) => {
        const nextSection = generated.sections?.find((item) => item.sectionType === section.type);

        if (section.type === "hero") {
          const heroContent = (nextSection?.content ?? {}) as Record<string, unknown>;
          const nextHeroHeadline =
            typeof heroContent.headline === "string" && heroContent.headline.trim()
              ? heroContent.headline.trim()
              : nextSection?.title && nextSection.title.trim().toLowerCase() !== "hero"
                ? nextSection.title.trim()
                : fallbackTitle;
          const nextHeroBody =
            typeof heroContent.body === "string" && heroContent.body.trim()
              ? heroContent.body
              : typeof heroContent.summary === "string" && heroContent.summary.trim()
                ? heroContent.summary
                : fallbackIntro;

          return {
            ...section,
            enabled: true,
            content: {
              ...section.content,
              eyebrow:
                typeof heroContent.eyebrow === "string" && heroContent.eyebrow.trim()
                  ? heroContent.eyebrow
                  : document.organization.name,
              headline: nextHeroHeadline,
              body: nextHeroBody,
              heroImage:
                typeof heroContent.heroImage === "string"
                  ? heroContent.heroImage
                  : imageAssignments.heroImage || (section.content as { heroImage?: string }).heroImage,
              galleryImages:
                imageAssignments.galleryImages.length > 0
                  ? imageAssignments.galleryImages
                  : Array.isArray((section.content as { galleryImages?: string[] }).galleryImages)
                    ? (section.content as { galleryImages: string[] }).galleryImages
                    : [],
              stats: Array.isArray(heroContent.stats) ? heroContent.stats : []
            }
          };
        }

        if (section.type === "top_story" && !nextSection) {
          return {
            ...section,
            enabled: true,
            content: {
              ...section.content,
              headline: fallbackTitle,
              summary:
                typeof generated.raw === "string" && generated.raw.trim()
                  ? generated.raw.trim()
                  : fallbackIntro,
              url: "#",
              image: imageAssignments.topStoryImage || (section.content as { image?: string }).image
            }
          };
        }

        if (!nextSection) {
          return section;
        }

        return {
          ...section,
          title: nextSection.title || section.title,
          enabled: true,
          content: {
            ...section.content,
            ...nextSection.content,
            ...(section.type === "top_story" && imageAssignments.topStoryImage
              ? { image: imageAssignments.topStoryImage }
              : {}),
            ...(section.type === "news_grid" &&
            Array.isArray((nextSection.content as { items?: Array<Record<string, unknown>> }).items)
              ? {
                  items: ((nextSection.content as { items?: Array<Record<string, unknown>> }).items ?? []).map(
                    (item, index) => ({
                      ...item,
                      image:
                        typeof item.image === "string" && item.image
                          ? item.image
                          : imageAssignments.newsItemImages[index] || ""
                    })
                  )
                }
              : {}),
            ...(section.type === "arts_events" &&
            Array.isArray((nextSection.content as { items?: Array<Record<string, unknown>> }).items)
              ? {
                  items: ((nextSection.content as { items?: Array<Record<string, unknown>> }).items ?? []).map(
                    (item, index) => ({
                      ...item,
                      image:
                        typeof item.image === "string" && item.image
                          ? item.image
                          : imageAssignments.eventItemImages[index] || ""
                    })
                  )
                }
              : {}),
            ...(section.type === "student_spotlight" && imageAssignments.spotlightImage
              ? { image: imageAssignments.spotlightImage }
              : {})
          }
        };
      })
      .map((section) => {
        if (["hero", "footer"].includes(section.type)) {
          return section;
        }

        return {
          ...section,
          enabled: generatedSectionTypes.has(section.type)
        };
      })
  };
}

function getGeneratedTitle(generated: ContentGenerateResponse, quickNotes: string) {
  const title = generated.title?.trim();

  if (title && title.toLowerCase() !== "generated newsletter draft") {
    return title;
  }

  const fallbackSource = getPrimaryStorySource(quickNotes);
  const firstSentence = fallbackSource
    .split(/[.!?]/)
    .map((part) => part.trim())
    .find(Boolean);

  if (!firstSentence) {
    return "School newsletter";
  }

  return firstSentence.length > 90 ? `${firstSentence.slice(0, 87).trim()}...` : firstSentence;
}

function getGeneratedIntro(generated: ContentGenerateResponse, quickNotes: string) {
  const intro = generated.intro?.trim();

  if (intro && intro.toLowerCase() !== "generated newsletter draft") {
    return intro;
  }

  if (typeof generated.raw === "string" && generated.raw.trim()) {
    return generated.raw.trim();
  }

  return getPrimaryStorySource(quickNotes).trim();
}

export function selectImageAssignments(
  generated: ContentGenerateResponse,
  assets: UploadedAsset[],
  noteSource = ""
) {
  const imageAssets = assets.filter((asset) => asset.type.startsWith("image/") && asset.url);
  const usedNames = new Set<string>();
  const plannedStories = extractStructuredStoryPlans(noteSource);
  const noteCandidates = plannedStories.length
    ? plannedStories.map((story) => story.notes)
    : extractOrderedStoryNotes(noteSource);

  const hero = generated.sections?.find((section) => section.sectionType === "hero");
  const topStory = generated.sections?.find((section) => section.sectionType === "top_story");
  const newsGrid = generated.sections?.find((section) => section.sectionType === "news_grid");
  const spotlight = generated.sections?.find((section) => section.sectionType === "student_spotlight");
  const events = generated.sections?.find((section) => section.sectionType === "arts_events");
  const orderedAssignments = assignOrderedDirectiveImages({
    assets: imageAssets,
    usedNames,
    topStory,
    newsGridItems: Array.isArray(newsGrid?.content?.items) ? newsGrid.content.items : [],
    spotlight,
    eventItems: Array.isArray(events?.content?.items) ? events.content.items : []
  });

  const topStoryImage =
    choosePlannedImageForText(
      [
        topStory?.title,
        typeof topStory?.content?.headline === "string" ? topStory.content.headline : "",
        typeof topStory?.content?.summary === "string" ? topStory.content.summary : ""
      ],
      plannedStories,
      imageAssets,
      usedNames
    ) ||
    orderedAssignments.topStoryImage ||
    chooseImageForText(
    [
      topStory?.title,
      typeof topStory?.content?.headline === "string" ? topStory.content.headline : "",
      typeof topStory?.content?.summary === "string" ? topStory.content.summary : ""
    ],
    imageAssets,
    usedNames,
    3,
    "top_story",
    getBestNoteContext(
      [
        topStory?.title,
        typeof topStory?.content?.headline === "string" ? topStory.content.headline : "",
        typeof topStory?.content?.summary === "string" ? topStory.content.summary : ""
      ],
      noteCandidates
    )
  );

  const spotlightImage =
    choosePlannedImageForText(
      [
        spotlight?.title,
        typeof spotlight?.content?.name === "string" ? spotlight.content.name : "",
        typeof spotlight?.content?.summary === "string" ? spotlight.content.summary : ""
      ],
      plannedStories,
      imageAssets,
      usedNames
    ) ||
    orderedAssignments.spotlightImage ||
    chooseImageForText(
    [
      spotlight?.title,
      typeof spotlight?.content?.name === "string" ? spotlight.content.name : "",
      typeof spotlight?.content?.summary === "string" ? spotlight.content.summary : ""
    ],
    imageAssets,
    usedNames,
    3,
    "student_spotlight",
    getBestNoteContext(
      [
        spotlight?.title,
        typeof spotlight?.content?.name === "string" ? spotlight.content.name : "",
        typeof spotlight?.content?.summary === "string" ? spotlight.content.summary : ""
      ],
      noteCandidates
    )
  );

  const newsItemImages = Array.isArray(newsGrid?.content?.items)
    ? newsGrid.content.items.map((item, index) =>
        choosePlannedImageForText(
          [
            typeof item?.headline === "string" ? item.headline : "",
            typeof item?.summary === "string" ? item.summary : "",
            typeof item?.tag === "string" ? item.tag : ""
          ],
          plannedStories,
          imageAssets,
          usedNames
        ) ||
        orderedAssignments.newsItemImages[index] ||
        chooseImageForText(
          [
            typeof item?.headline === "string" ? item.headline : "",
            typeof item?.summary === "string" ? item.summary : "",
            typeof item?.tag === "string" ? item.tag : ""
          ],
          imageAssets,
          usedNames,
          3,
          "news_grid",
          getBestNoteContext(
            [
              typeof item?.headline === "string" ? item.headline : "",
              typeof item?.summary === "string" ? item.summary : "",
              typeof item?.tag === "string" ? item.tag : ""
            ],
            noteCandidates
          )
        )
      )
    : [];

  const eventItemImages = Array.isArray(events?.content?.items)
    ? events.content.items.map((item, index) =>
        choosePlannedImageForText(
          [
            typeof item?.title === "string" ? item.title : "",
            typeof item?.summary === "string" ? item.summary : "",
            typeof item?.date === "string" ? item.date : ""
          ],
          plannedStories,
          imageAssets,
          usedNames
        ) ||
        orderedAssignments.eventItemImages[index] ||
        chooseImageForText(
          [
            typeof item?.title === "string" ? item.title : "",
            typeof item?.summary === "string" ? item.summary : "",
            typeof item?.date === "string" ? item.date : ""
          ],
          imageAssets,
          usedNames,
          3,
          "arts_events",
          getBestNoteContext(
            [
              typeof item?.title === "string" ? item.title : "",
              typeof item?.summary === "string" ? item.summary : "",
              typeof item?.date === "string" ? item.date : ""
            ],
            noteCandidates
          )
        )
      )
    : [];

  const heroImage = chooseImageForText(
    [
      generated.title,
      hero?.title,
      typeof hero?.content?.headline === "string" ? hero.content.headline : "",
      typeof hero?.content?.body === "string" ? hero.content.body : ""
    ],
    imageAssets,
    usedNames,
    6,
    "hero",
    getBestNoteContext(
      [
        generated.title,
        hero?.title,
        typeof hero?.content?.headline === "string" ? hero.content.headline : "",
        typeof hero?.content?.body === "string" ? hero.content.body : ""
      ],
      noteCandidates
    )
  );

  const galleryImages = imageAssets
    .filter((asset) => !usedNames.has(asset.name) && asset.url)
    .map((asset) => asset.url as string);

  return {
    heroImage,
    topStoryImage,
    spotlightImage,
    newsItemImages,
    eventItemImages,
    galleryImages
  };
}

function choosePlannedImageForText(
  textParts: Array<string | undefined>,
  plannedStories: PlannedStoryNote[],
  assets: UploadedAsset[],
  usedNames: Set<string>
) {
  if (!plannedStories.length) {
    return "";
  }

  const textTokens = tokenizeForMatching(textParts.filter(Boolean).join(" "));

  if (!textTokens.length) {
    return "";
  }

  let bestMatch: UploadedAsset | null = null;
  let bestScore = 0;

  for (const story of plannedStories) {
    if (!story.imageName.trim()) {
      continue;
    }

    const asset = findAssetByName(story.imageName, assets);

    if (!asset || usedNames.has(asset.name)) {
      continue;
    }

    const candidateTokens = tokenizeForMatching(story.notes);
    const overlap = candidateTokens.filter((token) => hasTokenMatch(token, textTokens)).length;
    const score = overlap * 10 + (containsOrderedTokenRun(candidateTokens, textTokens) ? 5 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestMatch = asset;
    }
  }

  if (!bestMatch || bestScore < 10) {
    return "";
  }

  usedNames.add(bestMatch.name);
  return bestMatch.url ?? "";
}

function assignOrderedDirectiveImages({
  assets,
  usedNames,
  topStory,
  newsGridItems,
  spotlight,
  eventItems
}: {
  assets: UploadedAsset[];
  usedNames: Set<string>;
  topStory: GeneratedSection | undefined;
  newsGridItems: Array<Record<string, unknown>>;
  spotlight: GeneratedSection | undefined;
  eventItems: Array<Record<string, unknown>>;
}) {
  let topStoryImage = "";
  let spotlightImage = "";
  const newsItemImages = newsGridItems.map(() => "");
  const eventItemImages = eventItems.map(() => "");

  const orderedTargets: Array<
    | { kind: "top_story" }
    | { kind: "news_grid"; index: number }
    | { kind: "student_spotlight" }
    | { kind: "arts_events"; index: number }
  > = [];

  if (topStory) {
    orderedTargets.push({ kind: "top_story" });
  }

  newsGridItems.forEach((_, index) => {
    orderedTargets.push({ kind: "news_grid", index });
  });

  if (spotlight) {
    orderedTargets.push({ kind: "student_spotlight" });
  }

  eventItems.forEach((_, index) => {
    orderedTargets.push({ kind: "arts_events", index });
  });

  for (const asset of assets) {
    const directive = parseAssetDirective(asset.name);

    if (!directive.storyIndex || !asset.url) {
      continue;
    }

    const target = orderedTargets[directive.storyIndex - 1];

    if (!target || usedNames.has(asset.name)) {
      continue;
    }

    if (target.kind === "top_story") {
      usedNames.add(asset.name);
      topStoryImage = asset.url;
      continue;
    }

    if (target.kind === "student_spotlight") {
      usedNames.add(asset.name);
      spotlightImage = asset.url;
      continue;
    }

    if (target.kind === "news_grid") {
      newsItemImages[target.index] = asset.url;
      usedNames.add(asset.name);
      continue;
    }

    if (target.kind === "arts_events") {
      eventItemImages[target.index] = asset.url;
      usedNames.add(asset.name);
    }
  }

  return {
    topStoryImage,
    spotlightImage,
    newsItemImages,
    eventItemImages
  };
}

function chooseImageForText(
  textParts: Array<string | undefined>,
  assets: UploadedAsset[],
  usedNames: Set<string>,
  minimumScore = 2,
  targetSlot?: "hero" | "top_story" | "student_spotlight" | "news_grid" | "arts_events",
  noteContext = ""
) {
  const availableAssets = assets.filter((asset) => !usedNames.has(asset.name) && asset.url);

  if (!availableAssets.length) {
    return "";
  }

  const combinedText = [...textParts.filter(Boolean), noteContext].filter(Boolean).join(" ");
  const tokens = tokenizeForMatching(combinedText);
  const directedAssets = availableAssets
    .map((asset) => ({
      asset,
      strength: getDirectedMatchStrength(asset, tokens, combinedText, targetSlot)
    }))
    .filter((candidate) => candidate.strength > 0)
    .sort((left, right) => right.strength - left.strength);

  if (directedAssets.length > 0) {
    const bestMatch = directedAssets[0].asset;
    usedNames.add(bestMatch.name);
    return bestMatch.url ?? "";
  }

  const deterministicAssets = availableAssets
    .map((asset) => ({
      asset,
      strength: getDeterministicMatchStrength(asset, tokens, combinedText)
    }))
    .filter((candidate) => candidate.strength > 0)
    .sort((left, right) => right.strength - left.strength);

  if (deterministicAssets.length > 0) {
    const bestMatch = deterministicAssets[0].asset;
    usedNames.add(bestMatch.name);
    return bestMatch.url ?? "";
  }

  const scoredAssets = availableAssets
    .map((asset) => ({
      asset,
      score: scoreAssetAgainstTokens(asset, tokens, combinedText)
    }))
    .sort((left, right) => right.score - left.score);

  const bestCandidate = scoredAssets[0];

  if (!bestCandidate || bestCandidate.score < minimumScore) {
    return "";
  }

  const bestMatch = bestCandidate.asset;
  usedNames.add(bestMatch.name);
  return bestMatch.url ?? "";
}

function getDirectedMatchStrength(
  asset: UploadedAsset,
  tokens: string[],
  sourceText: string,
  targetSlot?: "hero" | "top_story" | "student_spotlight" | "news_grid" | "arts_events"
) {
  if (!targetSlot) {
    return 0;
  }

  const directive = parseAssetDirective(asset.name);

  if (!directive.slot || directive.slot !== targetSlot) {
    return 0;
  }

  if (!directive.keywords.length) {
    return 200;
  }

  const sourceTokens = tokenizeForMatching(sourceText);
  const overlapCount = directive.keywords.filter((keyword) => hasTokenMatch(keyword, sourceTokens)).length;

  if (overlapCount === directive.keywords.length) {
    return 220 + overlapCount;
  }

  if (overlapCount >= 2 || overlapCount / directive.keywords.length >= 0.67) {
    return 210 + overlapCount;
  }

  return 0;
}

function getDeterministicMatchStrength(asset: UploadedAsset, tokens: string[], sourceText: string) {
  const normalizedSource = normalizeForMatching(sourceText);
  const sourceTokens = tokenizeForMatching(sourceText);
  const assetTokens = tokenizeForMatching(asset.name);

  if (!assetTokens.length || !sourceTokens.length) {
    return 0;
  }

  const overlapCount = assetTokens.filter((assetToken) => hasTokenMatch(assetToken, sourceTokens)).length;
  const coverage = overlapCount / assetTokens.length;
  const assetPhrase = assetTokens.join(" ");

  if (assetPhrase && normalizedSource.includes(assetPhrase)) {
    return 100 + overlapCount;
  }

  if (assetTokens.length >= 2 && containsOrderedTokenRun(assetTokens, sourceTokens) && overlapCount >= 2) {
    return 90 + overlapCount;
  }

  if (coverage >= 1 && assetTokens.length >= 2) {
    return 85 + overlapCount;
  }

  if (coverage >= 0.67 && overlapCount >= 2) {
    return 80 + overlapCount;
  }

  if (assetTokens.length === 1 && overlapCount === 1 && assetTokens[0].length >= 5) {
    return 70;
  }

  return 0;
}

function scoreAssetAgainstTokens(asset: UploadedAsset, tokens: string[], sourceText: string) {
  const normalizedName = normalizeForMatching(asset.name);
  const assetTokens = tokenizeForMatching(asset.name);
  const normalizedSource = normalizeForMatching(sourceText);
  let score = 0;

  if (!tokens.length) {
    return assetTokens.length ? 0.5 : 0;
  }

  for (const token of tokens) {
    if (!token) {
      continue;
    }

    if (normalizedName.includes(token) || hasTokenMatch(token, assetTokens)) {
      score += 5;
      continue;
    }

    if (assetTokens.some((assetToken) => assetToken.startsWith(token) || token.startsWith(assetToken))) {
      score += 2;
      continue;
    }

    if (findTokenVariant(token, assetTokens)) {
      score += 1.5;
    }
  }

  if (assetTokens.length) {
    const combinedAssetPhrase = assetTokens.join(" ");
    if (normalizedSource.includes(combinedAssetPhrase)) {
      score += 10;
    }
  }

  const normalizedAssetPhrase = normalizedName.replace(/-/g, " ").trim();
  if (normalizedAssetPhrase && normalizedSource.includes(normalizedAssetPhrase)) {
    score += 8;
  }

  if (assetTokens.length >= 2 && containsOrderedTokenRun(assetTokens, tokens)) {
    score += 4;
  }

  if (/\b(photo|image|picture)\b/.test(normalizeForMatching(sourceText))) {
    score += 0.5;
  }

  return score;
}

function hasTokenMatch(token: string, otherTokens: string[]) {
  return otherTokens.some((otherToken) => {
    if (otherToken === token) {
      return true;
    }

    if (otherToken.includes(token) || token.includes(otherToken)) {
      return true;
    }

    return findTokenVariant(token, [otherToken]);
  });
}

function containsOrderedTokenRun(assetTokens: string[], sourceTokens: string[]) {
  if (assetTokens.length < 2 || sourceTokens.length < 2) {
    return false;
  }

  for (let index = 0; index < assetTokens.length - 1; index += 1) {
    const first = assetTokens[index];
    const second = assetTokens[index + 1];
    const firstIndex = sourceTokens.findIndex((token) => token === first || token.includes(first) || first.includes(token));
    if (firstIndex === -1) {
      continue;
    }
    const secondIndex = sourceTokens.slice(firstIndex + 1).findIndex((token) => token === second || token.includes(second) || second.includes(token));
    if (secondIndex !== -1) {
      return true;
    }
  }

  return false;
}

function tokenizeForMatching(value: string) {
  return normalizeForMatching(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => simplifyToken(token))
    .filter((token) => token.length > 2)
    .filter((token) => !COMMON_MATCH_WORDS.has(token));
}

function normalizeForMatching(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[_–—-]+/g, " ")
    .replace(/\.(png|jpe?g|gif|webp|svg)$/g, "");
}

function getPrimaryStorySource(noteSource: string) {
  const structuredStories = extractStructuredStoryPlans(noteSource);

  if (structuredStories.length > 0) {
    return structuredStories[0]?.notes ?? "";
  }

  return noteSource
    .replace(/^Overall guidance:\s*/i, "")
    .replace(/Story\s+[A-Z]:\s*/gi, "")
    .replace(/Notes:\s*/gi, "")
    .replace(/Image:\s*.+$/gim, "")
    .trim();
}

function extractStructuredStoryPlans(noteSource: string) {
  const trimmedSource = noteSource.trim();

  if (!trimmedSource) {
    return [] as PlannedStoryNote[];
  }

  const matches = [...trimmedSource.matchAll(/Story\s+[A-Z]:\s*\nNotes:\s*([\s\S]*?)(?:\nImage:\s*(.+))?(?=\n\nStory\s+[A-Z]:|\n\nOverall guidance:|$)/gi)];

  return matches
    .map((match) => ({
      notes: (match[1] ?? "").trim(),
      imageName: (match[2] ?? "").trim()
    }))
    .filter((story) => story.notes.length > 0);
}

function findAssetByName(name: string, assets: UploadedAsset[]) {
  const normalizedTarget = normalizeForMatching(name);

  return (
    assets.find((asset) => normalizeForMatching(asset.name) === normalizedTarget) ??
    assets.find((asset) => asset.name.trim().toLowerCase() === name.trim().toLowerCase()) ??
    null
  );
}

function extractOrderedStoryNotes(noteSource: string) {
  return noteSource
    .split(/\n+/)
    .flatMap((line) =>
      line
        .split(/\b(?:then we have|second story is|third story is|fourth story is|top story is)\b/i)
        .map((part) => part.trim())
    )
    .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
    .filter((line) => line.length >= 12);
}

function getBestNoteContext(textParts: Array<string | undefined>, noteCandidates: string[]) {
  if (!noteCandidates.length) {
    return "";
  }

  const textTokens = tokenizeForMatching(textParts.filter(Boolean).join(" "));

  if (!textTokens.length) {
    return noteCandidates[0] ?? "";
  }

  let bestCandidate = "";
  let bestScore = 0;

  for (const candidate of noteCandidates) {
    const candidateTokens = tokenizeForMatching(candidate);
    const overlap = candidateTokens.filter((token) => hasTokenMatch(token, textTokens)).length;
    const score = overlap * 10 + (containsOrderedTokenRun(candidateTokens, textTokens) ? 5 : 0);

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function simplifyToken(token: string) {
  if (token.endsWith("ies") && token.length > 4) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.endsWith("es") && token.length > 4) {
    return token.slice(0, -2);
  }

  if (token.endsWith("s") && token.length > 3) {
    return token.slice(0, -1);
  }

  return token;
}

function findTokenVariant(token: string, assetTokens: string[]) {
  const variants = new Set([
    token,
    simplifyToken(token),
    token.replace(/-/g, ""),
    token.replace(/fruit/g, "cafeteria"),
    token.replace(/cafeteria/g, "fruit"),
    token.replace(/lunch/g, "cafeteria"),
    token.replace(/food/g, "fruit")
  ]);

  return assetTokens.some((assetToken) =>
    [...variants].some(
      (variant) => variant && (assetToken.includes(variant) || variant.includes(assetToken))
    )
  );
}

function parseAssetDirective(name: string): {
  slot: "hero" | "top_story" | "student_spotlight" | "news_grid" | "arts_events" | null;
  keywords: string[];
  storyIndex: number | null;
} {
  const directiveSource = name
    .toLowerCase()
    .replace(/\.(png|jpe?g|gif|webp|svg)$/g, "")
    .trim();
  const orderedMatch = directiveSource.match(/^(?:story|item|card|s)[-_ ]?(\d+)(?:__|--|:)(.+)$/);

  if (orderedMatch) {
    return {
      slot: null,
      keywords: tokenizeForMatching(orderedMatch[2]),
      storyIndex: Number.parseInt(orderedMatch[1] ?? "", 10) || null
    };
  }

  const letterMatch = directiveSource.match(/^(?:story[-_ ]?)?([a-z])(?:__|--|:)(.+)$/);

  if (letterMatch) {
    return {
      slot: null,
      keywords: tokenizeForMatching(letterMatch[2]),
      storyIndex: storyLetterToIndex(letterMatch[1] ?? "")
    };
  }

  const directiveMatch = directiveSource.match(/^([a-z0-9-_ ]+?)(?:__|--|:)(.+)$/);

  if (!directiveMatch) {
    return { slot: null, keywords: [], storyIndex: null };
  }

  const rawSlot = directiveMatch[1].replace(/[_ ]+/g, "-");
  const remainder = directiveMatch[2];
  const slot =
    rawSlot === "hero" || rawSlot === "lead" || rawSlot === "banner"
      ? "hero"
      : rawSlot === "top" || rawSlot === "top-story" || rawSlot === "topstory"
        ? "top_story"
        : rawSlot === "spotlight" || rawSlot === "student-spotlight"
          ? "student_spotlight"
          : rawSlot === "news" || rawSlot === "story" || rawSlot === "article"
            ? "news_grid"
            : rawSlot === "event" || rawSlot === "events" || rawSlot === "arts-events"
              ? "arts_events"
              : null;

  return {
    slot,
    keywords: tokenizeForMatching(remainder),
    storyIndex: null
  };
}

function storyLetterToIndex(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!/^[a-z]$/.test(normalized)) {
    return null;
  }

  return normalized.charCodeAt(0) - 96;
}

const COMMON_MATCH_WORDS = new Set([
  "school",
  "newsletter",
  "about",
  "with",
  "from",
  "that",
  "this",
  "have",
  "will",
  "your",
  "their",
  "they",
  "into",
  "next",
  "week"
]);
