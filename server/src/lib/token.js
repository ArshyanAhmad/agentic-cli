import chalk from "chalk";
import { CONFIG_DIR, TOKEN_FILE } from "../cli/commands/auth/login.js";

export async function getStoredToken() {
   try {
      const data = await fs.readFile(TOKEN_FILE, "utf-8");
      const token = JSON.parse(data);
      return token;
   } catch (error) {
      return null;
   }
}

export async function storeToken() {
   try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });

      const tokenData = {
         accessToken: token.access_token,
         refreshToken: token.refresh_token,
         token_type: token.token_type || "Bearer",
         expiresIn: token.expires_in
            ? new Date(Date.now() + token.expires_in * 1000).toISOString()
            : null,
         created_at: new Date().toISOString(),
      };
      await fs.writeFile(
         TOKEN_FILE,
         JSON.stringify(tokenData, null, 2),
         "utf-8",
      );

      return true;
   } catch (error) {
      console.log(chalk.red("Failed to store token:", error.message));
      return false;
   }
}

export async function clearStoredToken() {
   try {
      await fs.unlink(TOKEN_FILE);
      return true;
   } catch (error) {
      return false;
   }
}

export async function isTokenExpired() {
   const token = await getStoredToken();

   if (!token || !token.expires_at) {
      return true;
   }
   const expiresAt = new Date(token.expires_at);
   const now = new Date();

   return expiresAt.getTime() - now.getTime() < 5 * 60 * 1000;
}

export async function requireAuth() {
   const token = await getStoredToken();

   if (!token) {
      console.log(chalk.red("❌ No stored token found. Please log in."));
      process.exit(1);
   }

   if (await isTokenExpired(token)) {
      console.log(
         chalk.yellow("⚠️  Stored token has expired. Please log in again."),
      );
      console.log(chalk.gray("    Run: your-cli login\n"));
      process.exit(1);
   }

   return token;
}
