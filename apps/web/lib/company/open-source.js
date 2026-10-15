// Facts the Open Source page is built from.
//
// Everything here was established on 2026-10-12 by asking GitHub about the
// repository and by reading what is actually on its published branch -- not by
// reading this working tree and assuming the two match. They do not, and that
// difference is the single most important fact on the page: a visitor who
// clones the repository today gets the published snapshot, under the licence
// the published snapshot carries.
//
// Publishing "Apache-2.0" because this working tree says Apache-2.0 would be a
// false licensing statement about the code someone can actually download. So
// the page states both, and PUBLISHED below is the one it describes as
// available.

export const OPEN_SOURCE_VERIFIED_ON = "2026-10-12";

// The repository.
//
// Verified with the GitHub API: public, issues enabled, default branch main.
// The name is capitalised "Whealth" there, which is also how the URL resolves;
// the project renamed itself to WHealthOS after the repository was created and
// the repository has not been renamed with it.
export const REPOSITORY = {
  owner: "prajwalkamble",
  name: "Whealth",
  url: "https://github.com/prajwalkamble/Whealth",
  issuesUrl: "https://github.com/prajwalkamble/Whealth/issues",
  newIssueUrl: "https://github.com/prajwalkamble/Whealth/issues/new",
  defaultBranch: "main",
  visibility: "public",
  issuesEnabled: true,
  what: "The whole application: the Next.js web app, the Prisma schema and migrations, the row-level security policies, the background jobs and the test suites.",
  evidence: "GitHub API, 2026-10-12",
};

// The state of the published branch, as opposed to the state of development.
//
// This is a working-tree-versus-origin fact, so it will go stale the moment
// the operator pushes. It is written as data rather than prose for exactly
// that reason: when the push happens, set `current` to true and the page stops
// describing the gap.
//
// No activity metrics anywhere on the page -- no stars, forks, contributors or
// downloads. The counts are all zero or one, and a decorative dashboard of
// zeroes says less than one honest sentence about the project being early.
export const PUBLISHED = {
  current: false,
  lastPush: "20 September 2026",
  commitsBehind: 28,
  // What the published branch carries, checked file by file against it.
  license: { spdx: "MIT", name: "MIT License", file: "LICENSE" },
  // Files that exist on the published branch and can therefore be linked.
  files: [
    { label: "README", path: "README.md", url: "https://github.com/prajwalkamble/Whealth/blob/main/README.md" },
    { label: "LICENSE", path: "LICENSE", url: "https://github.com/prajwalkamble/Whealth/blob/main/LICENSE" },
  ],
  evidence: "git ls-tree origin/main, after fetching on 2026-10-12",
};

// What is in this source tree but not yet published.
//
// Each of these is a file a page like this would normally link to. None of
// them is linked, because the link would 404 for a reader today. They are
// listed so a developer knows what is coming and so the operator can see what
// the next push is carrying.
export const NOT_YET_PUBLISHED = {
  license: { spdx: "Apache-2.0", name: "Apache License 2.0" },
  documents: [
    { label: "NOTICE", what: "Copyright, third-party attribution and the trademark position" },
    { label: "CONTRIBUTING.md", what: "Setup, the checks a change has to pass, and the conventions this codebase holds to" },
    { label: "SECURITY.md", what: "How to report a vulnerability, and what the project cares most about protecting" },
    { label: "CODE_OF_CONDUCT.md", what: "Expected conduct in issues and pull requests" },
    { label: "legal/", what: "Licence structure, contributor terms, trademark terms and third-party licences" },
  ],
  evidence: "present in the development tree, absent from origin/main on 2026-10-12",
};

// Why any of this is open at all.
//
// Taken from the project's own documentation rather than written for this
// page: README.md's status note, SECURITY.md's statement of what matters, and
// CONTRIBUTING.md's conventions. Nothing here claims a community, a roadmap
// vote or a governance model, because none exists.
export const PHILOSOPHY = [
  "A product that holds your financial records should be something you can read the source of. If the page says a total is arithmetic over your own rows, the arithmetic is there to check.",
  "The repository is the whole application, not a demo carved out of it. The same code runs the hosted service.",
  "It is early, and the code shows that. Reading it is the fastest way to know what WHealthOS actually does today, as opposed to what a marketing page could claim.",
];

// The boundary between the source and the service.
//
// Confirmed, not assumed: a copyright licence covers code. It does not hand
// over the production database, the credentials in the deployment, the hosted
// service's obligations to the people using it, or the right to use the name.
// Both MIT and Apache-2.0 are copyright licences and neither grants trademark
// rights, so this holds whichever of the two a reader is looking at.
export const SERVICE_BOUNDARY = [
  {
    title: "The source is licensed",
    body: "You can read it, run it, change it and build on it, on the terms of the licence file in the repository you downloaded.",
  },
  {
    title: "The hosted service is a service",
    body: "whealthos.com runs this code, operated by the project, under its own Terms of Service and Privacy Policy. Running your own copy does not put you under those, and does not give you anything from ours -- no database, no keys, no accounts.",
  },
  {
    title: "The name and the logo are not in the licence",
    body: "Neither licence grants trademark rights. You are welcome to build on the code; call the result something of your own.",
  },
];
