export function getSchoolArchivePath(schoolId: string) {
  return `/schools/${schoolId}`;
}

export function getSchoolFeedPath(schoolId: string) {
  return `/schools/${schoolId}/feed`;
}

export function getNewsletterWebPath(schoolId: string, newsletterId: string) {
  return `/schools/${schoolId}/newsletters/${newsletterId}`;
}

export function getNewsletterPdfPath(schoolId: string, newsletterId: string, autoPrint = false) {
  const path = `/schools/${schoolId}/newsletters/${newsletterId}/pdf`;
  return autoPrint ? `${path}?print=1` : path;
}

export function toAbsoluteUrl(path: string, origin: string) {
  return `${origin.replace(/\/$/, "")}${path}`;
}
