WEFT storefront compatibility fix

This archive contains the project files with defensive product normalization,
safe garment color selection, and useful browser-console error logging.

IMPORTANT:
- Keep your existing .env file private and do not replace it with .env.example.
- Do not run `npm run seed`; it deletes and recreates catalogue products.
- Extract this archive to a NEW folder first.
- To update your existing project, copy these two files from the extracted folder:
    weft-mongo/public/app.js
    weft-mongo/public/garments.js
  into the matching locations in your existing project, replacing those two files only.
- Keep your existing server.js, src folder, package files, and .env unchanged.
- Restart the local server after copying. If port 3000 is already running, use the existing running server or stop the old one before starting another.
- Refresh http://localhost:3000 with Ctrl+Shift+R.
- If it still fails, open F12 > Console. The updated app logs `WEFT INIT ERROR` or `WEFT PRODUCTS LOAD ERROR` with the actual error.
