import AnImportThatRefusesToGuess from "./an-import-that-refuses-to-guess";
import EveryServerActionIsAPublicEndpoint from "./every-server-action-is-a-public-endpoint";

// Slug to article body.
//
// Static imports rather than a dynamic path: a slug cannot reach a file that
// is not named here, and the build fails on a typo rather than producing a
// route that renders nothing.
//
// Only published posts appear. A draft in lib/blog/posts.js has no entry here
// and no component -- there is nothing to render it with even by accident,
// which is a stronger guarantee than a status check on its own.
export const ARTICLES = {
  "an-import-that-refuses-to-guess": AnImportThatRefusesToGuess,
  "every-server-action-is-a-public-endpoint": EveryServerActionIsAPublicEndpoint,
};

export const articleFor = (slug) => ARTICLES[slug] ?? null;
