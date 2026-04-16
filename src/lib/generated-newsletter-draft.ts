import type { ContentGenerateResponse } from "@/types/integration";
import type { UploadedAsset } from "@/types/media";
import type { NewsletterDocument } from "@/types/newsletter";

export function applyGeneratedDraftToDocument(
  document: NewsletterDocument,
  generated: ContentGenerateResponse,
  quickNotes: string,
  uploadedAssets: UploadedAsset[]
) {
  const generatedSectionTypes = new Set(generated.sections?.map((item) => item.sectionType) ?? []);
  const fallbackTitle = getGeneratedTitle(generated, quickNotes);
  const fallbackIntro = getGeneratedIntro(generated, quickNotes);
  const imageAssignments = selectImageAssignments(generated, uploadedAssets);

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

  const firstSentence = quickNotes
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

  return quickNotes.trim();
}

export function selectImageAssignments(generated: ContentGenerateResponse, assets: UploadedAsset[]) {
  const imageAssets = assets.filter((asset) => asset.type.startsWith("image/") && asset.url);
  const usedNames = new Set<string>();

  const hero = generated.sections?.find((section) => section.sectionType === "hero");
  const topStory = generated.sections?.find((section) => section.sectionType === "top_story");
  const newsGrid = generated.sections?.find((section) => section.sectionType === "news_grid");
  const spotlight = generated.sections?.find((section) => section.sectionType === "student_spotlight");
  const events = generated.sections?.find((section) => section.sectionType === "arts_events");

  const newsItemImages = Array.isArray(newsGrid?.content?.items)
    ? newsGrid.content.items.map((item) =>
        chooseImageForText(
          [
            typeof item?.headline === "string" ? item.headline : "",
            typeof item?.summary === "string" ? item.summary : "",
            typeof item?.tag === "string" ? item.tag : ""
          ],
          imageAssets,
          usedNames,
          3
        )
      )
    : [];

  const eventItemImages = Array.isArray(events?.content?.items)
    ? events.content.items.map((item) =>
        chooseImageForText(
          [
            typeof item?.title === "string" ? item.title : "",
            typeof item?.summary === "string" ? item.summary : "",
            typeof item?.date === "string" ? item.date : ""
          ],
          imageAssets,
          usedNames,
          3
        )
      )
    : [];

  const spotlightImage = chooseImageForText(
    [
      spotlight?.title,
      typeof spotlight?.content?.name === "string" ? spotlight.content.name : "",
      typeof spotlight?.content?.summary === "string" ? spotlight.content.summary : ""
    ],
    imageAssets,
    usedNames,
    3
  );

  const topStoryImage = chooseImageForText(
    [
      topStory?.title,
      typeof topStory?.content?.headline === "string" ? topStory.content.headline : "",
      typeof topStory?.content?.summary === "string" ? topStory.content.summary : ""
    ],
    imageAssets,
    usedNames,
    3
  );

  const heroImage = chooseImageForText(
    [
      generated.title,
      hero?.title,
      typeof hero?.content?.headline === "string" ? hero.content.headline : "",
      typeof hero?.content?.body === "string" ? hero.content.body : ""
    ],
    imageAssets,
    usedNames,
    4
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

function chooseImageForText(
  textParts: Array<string | undefined>,
  assets: UploadedAsset[],
  usedNames: Set<string>,
  minimumScore = 2
) {
  const availableAssets = assets.filter((asset) => !usedNames.has(asset.name) && asset.url);

  if (!availableAssets.length) {
    return "";
  }

  const combinedText = textParts.filter(Boolean).join(" ");
  const tokens = tokenizeForMatching(combinedText);
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
