import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/client";
import { logger } from "better-auth";

import chalk from "chalk";
import { Command } from "commander";
import path from "path";
import os from "os";
import yoctoSpinner from "yocto-spinner";
import open from "open";
import * as zod from "zod/v4";
import "dotenv/config";

import { prisma } from "../../../lib/db.js";

import fs from "fs/promises";

const URL = "http://localhost:3005";
const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
export const CONFIG_DIR = path.join(os.homedir(), ".better-auth");
export const TOKEN_FILE = path.join(CONFIG_DIR, "token.json");

// Token Management Functions

export async function getStoredToken() {
   try {
      const data = await fs.readFile(TOKEN_FILE, "utf-8");
      const token = JSON.parse(data);
      console.log("TOken in get ", token);

      return token;
   } catch (error) {
      return null;
   }
}

export async function storeToken() {
   try {
      await fs.mkdir(CONFIG_DIR, { recursive: true });
      const token = await getStoredToken();

      console.log("TOken", token);

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

export async function loginAction(opts) {
   const options = zod.object({
      serverUrl: zod.string().optional(),
      clientId: zod.string().optional(),
   });

   const serverUrl = options.serverUrl || URL;
   const clientId = options.clientId || CLIENT_ID;

   intro(chalk.bold("🔐 Auth CLI Login "));

   // TODO :change with this token management
   const existingToken = await getStoredToken();
   const expired = await isTokenExpired();

   if (existingToken && !expired) {
      const shouldReAuth = await confirm({
         message: "You are already logged in. Do you want to login Again?",
         initialValue: false,
      });

      if (isCancel(shouldReAuth) || !shouldReAuth) {
         cancel("Login cancelled.");
         process.exit(0);
      }
   }

   const authClient = createAuthClient({
      baseURL: serverUrl,
      plugins: [deviceAuthorizationClient],
   });

   const spinner = yoctoSpinner({ text: "Starting login process..." });
   spinner.start();

   try {
      const { data, error } = await authClient.device.code({
         client_id: clientId,
         scope: "openid profile eamil",
      });

      spinner.stop();

      if (error || !data) {
         logger.error(
            `Failed to request device authorization: ${error.error_description}`,
         );

         process.exit(1);
      }

      const {
         device_code,
         user_code,
         verification_uri,
         verification_uri_complete,
         expires_in,
         interval,
      } = data;
      console.log(chalk.cyan("Device Authorization Required"));

      console.log(
         `Please visit: ${chalk.underline.blue(verification_uri || verification_uri_complete)}`,
      );

      console.log(`Enter code: ${chalk.bold.green(user_code)}`);

      const shouldOpen = await confirm({
         message: "Open the verification URL in your browser?",
         initialValue: true,
      });

      if (!isCancel(shouldOpen) && shouldOpen) {
         const urlToOpen = verification_uri_complete || verification_uri;
         await open(urlToOpen);
      }

      console.log(
         chalk.gray(
            `Waiting for authorization (expires in ${Math.floor(expires_in / 60)} minutes)...`,
         ),
      );

      const token = await polForToken(
         authClient,
         device_code,
         clientId,
         interval,
      );

      if (token) {
         const saved = await storeToken();

         if (!saved) {
            console.log(
               chalk.yellow(
                  "⚠️  Warning: could not save authentication token.",
               ),
            );

            console.log(
               chalk.yellow(" You may need to log in again next time."),
            );
         }

         // TODO: Fetch user info and store in DB
         // const user = await prisma.user.findFirst

         outro(chalk.green("✅ Login successful!"));
         console.log(chalk.gray("\n Token saved to: ", TOKEN_FILE));

         console.log(
            chalk.gray(
               " You can now use the CLI commands without logging in again.\n",
            ),
         );
      }
   } catch (error) {
      spinner.stop();
      console.error(chalk.red("Login failed:", error.message));
      process.exit(1);
   }
}

async function polForToken(
   authClient,
   deviceCode,
   clientId,
   initialIntervalValue,
) {
   let pollingInterval = initialIntervalValue;
   const spinner = yoctoSpinner({
      text: "Waiting for user authorization...",
      color: "cyan",
   });

   let dots = 0;
   return new Promise((resolve, reject) => {
      const poll = async () => {
         dots = (dots + 1) % 4;
         spinner.text = chalk.gray(
            `Polling for authorization${".".repeat(dots)}${" ".repeat(3 - dots)}`,
         );

         if (!spinner.isSpinning) spinner.start();

         try {
            const { data, error } = await authClient.device.token({
               grant_type: "urn:ietf:params:oauth:grant-type:device_code",
               device_code: deviceCode,
               client_id: clientId,
               fetchOptions: {
                  headers: {
                     "user-agent": "My CLI",
                  },
               },
            });

            if (data?.access_token) {
               console.log(
                  chalk.bold.yellow(
                     "Your access token is: ",
                     data.access_token,
                  ),
               );

               spinner.stop("Authorization successful!");
               resolve(data.access_token);
               return;
            } else if (error) {
               switch (error.error) {
                  case "authorization_pending":
                     // Continue polling
                     break;
                  case "slow_down":
                     pollingInterval += 5;
                     break;
                  case "access_denied":
                     console.error("Access was denied by the user");
                     return;
                  case "expired_token":
                     console.error(
                        "The device code has expired. Please try again.",
                     );
                     return;
                  default:
                     spinner.stop();
                     logger.error(`Error: ${error.error_description}`);
                     process.exit(1);
               }
            }
         } catch (error) {
            spinner.stop();
            logger.error(`Network error: ${error.message}`);
            process.exit(1);
         }

         setTimeout(poll, pollingInterval * 1000);
      };

      setTimeout(poll, pollingInterval * 1000);
   });
}

async function logoutAction() {
   intro(chalk.bold("👋 Logout"));

   const token = await getStoredToken();
}

// Commander Setup

export const login = new Command("login")
   .description("Login to the Better Auth")
   .option("--server-url <url>", "The Better Auth server URL", URL)
   .option("--client-id <id>", "The OAuth Client ID", CLIENT_ID)
   .action(loginAction);
