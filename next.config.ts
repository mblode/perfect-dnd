import type { NextConfig } from "next";

const basePath = "/perfect-dnd";

const nextConfig: NextConfig = {
  assetPrefix: basePath,
  basePath,
  reactCompiler: true,
  redirects() {
    return Promise.resolve([
      {
        basePath: false,
        destination: "https://blode.co/perfect-dnd",
        has: [{ type: "host" as const, value: "perfect-dnd.blode.co" }],
        permanent: true,
        source: "/",
      },
      {
        basePath: false,
        destination: "https://blode.co/perfect-dnd/:path*",
        has: [{ type: "host" as const, value: "perfect-dnd.blode.co" }],
        permanent: true,
        source: "/:path*",
      },
    ]);
  },
};

export default nextConfig;
