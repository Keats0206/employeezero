import { Arcade } from "@arcadeai/arcadejs";

// Single Arcade client. The SDK reads ARCADE_API_KEY from the environment by
// default; we pass it explicitly so a missing key fails loudly at call time.
let client: Arcade | null = null;

export function getArcade(): Arcade {
  if (!client) {
    const apiKey = process.env.ARCADE_API_KEY;
    if (!apiKey) throw new Error("ARCADE_API_KEY is not set");
    client = new Arcade({ apiKey });
  }
  return client;
}

// The consumer-facing catalog of connectable apps. `provider` is Arcade's
// OAuth provider id; `scopes` are what the crew needs to act on the user's
// behalf. Keep this list small and obvious.
export type ArcadeProvider = {
  id: string;        // Arcade provider id, e.g. "google"
  name: string;      // Display name
  description: string;
  scopes: string[];
};

export const ARCADE_PROVIDERS: ArcadeProvider[] = [
  {
    id: "google",
    name: "Gmail",
    description: "Send outreach and follow-up emails.",
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
  },
  {
    id: "x",
    name: "X (Twitter)",
    description: "Post content and replies.",
    scopes: ["tweet.read", "tweet.write", "users.read"],
  },
  {
    id: "reddit",
    name: "Reddit",
    description: "Post to subreddits to find your audience.",
    scopes: ["submit", "read", "identity"],
  },
];

export function findProvider(id: string): ArcadeProvider | undefined {
  return ARCADE_PROVIDERS.find((p) => p.id === id);
}

// The Arcade user_id for the signed-in user. NextAuth lowercases emails, which
// can mismatch the Arcade account casing during dev. ARCADE_DEV_USER_ID lets us
// force an exact value while testing on the "Arcade.dev users only" verifier.
export function arcadeUserId(email: string): string {
  return process.env.ARCADE_DEV_USER_ID || email;
}
