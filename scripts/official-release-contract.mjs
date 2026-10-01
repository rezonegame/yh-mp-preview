/** Offline metadata checks only; this does not establish source eligibility or approval. */
export function officialReleaseIssues(manifest, tag) {
  const issues = [];
  const numericVersion = /^\d+\.\d+\.\d+$/;
  if (!numericVersion.test(manifest.version ?? '')) issues.push('Official manifest.version must contain only three numeric components, without a prerelease suffix.');
  if (!tag || tag !== manifest.version) issues.push('Official release tag must exactly match manifest.version, without a v prefix.');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.id ?? '')) issues.push('Plugin ID must be lowercase and hyphen-separated.');
  for (const key of ['name', 'author']) {
    if (typeof manifest[key] !== 'string' || !manifest[key].trim()) issues.push(`Manifest ${key} is required.`);
  }
  if (!numericVersion.test(manifest.minAppVersion ?? '')) issues.push('minAppVersion must identify a numeric host version.');
  if (typeof manifest.isDesktopOnly !== 'boolean') issues.push('isDesktopOnly must be explicit.');
  const description = manifest.description;
  if (typeof description !== 'string' || !description.trim() || description.length > 250 || !description.endsWith('.')) {
    issues.push('Description must be nonempty, at most 250 characters, and end with a period.');
  }
  return issues;
}
