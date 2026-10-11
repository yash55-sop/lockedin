export const siteConfig = {
  name: "LockedIn",
  url:
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000",
  description:
    "Your personal workspace for tasks, study plans, goals, and custom productivity templates.",

  author: {
    name: "Hemant Rajput",
    url: "https://rajputhemant.me",
    email: "68769346+rajput-hemant@users.noreply.github.com",
    x: "@rajput_hemant01",
  },

  links: {
    github: "https://github.com/rajput-hemant/lipi",
    discord: "https://discord.gg/rajput-hemant#8269",
    x: "https://twitter.com/rajput_hemant01",
  },
};

export type SiteConfig = typeof siteConfig;
