// Link back to the home picker with a post's settings filled in, used for
// "Edit and try again" and History's "Regenerate". The selfie is never carried
// over: selfies are deleted after use, so a with-face post asks for a new one.
export function editPostHref(opts: {
  platform?: string;
  format?: string;
  withFace?: boolean;
  brief?: string | null;
}): string {
  const params = new URLSearchParams();
  if (opts.platform) params.set("platform", opts.platform);
  if (opts.format) params.set("format", opts.format);
  if (opts.withFace !== undefined) params.set("withFace", String(opts.withFace));
  if (opts.brief) params.set("brief", opts.brief);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
