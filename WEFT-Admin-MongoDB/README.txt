WEFT ADMIN + MONGODB ATLAS — WINDOWS SETUP

A) SET UP MONGODB ATLAS
1. Go to https://www.mongodb.com/atlas/database and create a free account.
2. Create a free database deployment/cluster.
3. In Atlas, open Database Access and create a database user + password.
   This is NOT necessarily your MongoDB website login.
4. In Atlas, open Network Access and add your current IP address.
   For a temporary local classroom demo, Atlas may offer 0.0.0.0/0; this allows
   connections from any IP and is less secure. Prefer adding your current IP.
5. Open your deployment and click Connect > Drivers.
6. Choose Node.js and copy the connection string.
7. Replace the placeholder in the connection string with your database user's
   username/password, and use database name weft_admin.

B) START THE PROJECT
1. Extract this ZIP.
2. Open the extracted WEFT-Admin-MongoDB folder.
3. Click the folder address bar, type CMD, and press Enter.
4. Run:
   npm install
   copy .env.example .env
   notepad .env
5. In .env, set:
   ADMIN_PASSWORD=your-own-password
   SESSION_SECRET=a-long-random-secret
   MONGODB_URI=your-full-Atlas-connection-string
   Keep the MONGODB_URI on one line. Save and close Notepad.
6. Run:
   npm start
7. Open http://localhost:3000
8. Sign in with username admin and the password you put in .env.

DATABASE
Database name: weft_admin
Collection: products
Collection: orders (sample orders are inserted if none exist)

NOTES
- Products are stored in MongoDB Atlas.
- Orders are demo/sample records. This project does not include customer checkout,
  payments, or order creation.
- This is a local demo, not production-ready. Before public deployment, use HTTPS,
  a production session store, CSRF protection, rate limiting, robust validation,
  secure cookie settings, and a proper admin user system.
- Never share or commit your .env file or database credentials.


REDESIGNED VERSION:
This package includes the missing public/styles.css file. It uses a responsive dark charcoal + acid-lime WEFT-inspired admin design. Replace your old project folder with this extracted version, then run npm install and npm start. Keep your .env file and credentials safe; if you already configured .env in the old folder, copy its values into the new folder's .env.


PRODUCT CARD UPDATE:
Product cards now use varied category-based image choices when the image field is blank or still contains the original generic placeholder. The product grid has aligned card heights, image ratios and action buttons. To use your own exact designs, edit each product and paste its own image URL in Product Image URL, then save.


MISSING PRODUCT IMAGE FIX:
Cards with an empty image URL or a broken custom image URL now automatically try a category-based Unsplash fallback before showing the WEFT placeholder. For exact brand photos, edit the product and use a direct, publicly accessible image URL.


ORDER CUSTOMER DISPLAY FIX:
The Orders table now formats customer details safely when the customer field is an object. It shows the customer's name/full name, or falls back to email/phone/username, rather than displaying [object Object]. Existing order records are not changed.


VISUAL PRODUCT + DEMO CUSTOMER UPDATE:
Demo orders display varied sample customer names instead of repeating one placeholder name. Real orders continue to show the actual customer details. Product images now rotate through more category-specific image choices and automatically retry alternate images if one fails to load. Remote image loading still requires an internet connection.
