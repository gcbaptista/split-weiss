// Next.js ships a declaration for "*.module.css" but not for plain "*.css".
// TypeScript 6 (TS2882) requires side-effect imports to resolve to a declared
// module, so declare it here for `import "./globals.css"` in the root layout.
declare module "*.css";
