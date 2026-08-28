const businessModules = [
  "admin-dashboard",
  "catalog",
  "identity-access",
  "menu-customization",
  "merchandising",
  "public-menu",
  "tenant-management",
];

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular-dependencies",
      severity: "error",
      from: { path: "^src/" },
      to: { circular: true },
    },
    {
      name: "domain-and-application-are-framework-free",
      severity: "error",
      from: { path: "^src/modules/[^/]+/(domain|application)/" },
      to: { path: "^(next|react|@prisma|fs$|node:fs|src/platform/(database|http|storage))" },
    },
    {
      name: "platform-does-not-import-business-modules",
      severity: "error",
      from: { path: "^src/platform/" },
      to: { path: "^src/modules/" },
    },
    {
      name: "app-does-not-import-module-internals",
      severity: "error",
      from: { path: "^src/app/" },
      to: { path: "^src/modules/[^/]+/(domain|application|infrastructure|presentation)/" },
    },
    ...businessModules.map((moduleName) => ({
      name: `${moduleName}-internals-stay-private`,
      severity: "error",
      from: { path: `^src/(?!modules/${moduleName}/)` },
      to: {
        path: `^src/modules/${moduleName}/(?!contracts\\.ts$|server\\.ts$|ui\\.ts$)`,
      },
    })),
    ...businessModules.map((moduleName) => ({
      name: `${moduleName}-uses-only-public-entries-of-other-modules`,
      severity: "error",
      from: { path: `^src/modules/${moduleName}/` },
      to: {
        path: `^src/modules/(?!${moduleName}/)[^/]+/(domain|application|infrastructure|presentation)/`,
      },
    })),
    ...businessModules.map((moduleName) => ({
      name: `${moduleName}-core-does-not-import-other-server-compositions`,
      severity: "error",
      from: { path: `^src/modules/${moduleName}/(domain|application|infrastructure)/` },
      to: { path: `^src/modules/(?!${moduleName}/)[^/]+/server\\.ts$` },
    })),
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: { exportsFields: ["exports"] },
    reporterOptions: { dot: { collapsePattern: "node_modules/[^/]+" } },
  },
};
