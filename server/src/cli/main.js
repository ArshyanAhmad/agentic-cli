#!/usr/bin/env node

import "dotenv/config";
import chalk from "chalk";
import figlet from "figlet";

import { Command } from "commander";
import { login } from "./commands/auth/login.js";

async function main() {
   // Display  banner
   console.log(
      chalk.cyan(
         figlet.textSync("Helios Cli", {
            font: "Standard",
            horizontalLayout: "default",
         }),
      ),
   );

   console.log(chalk.gray("A cli based AI Tool \n"));

   const program = new Command("Helios");

   program
      .version("0.0.1")
      .description("Helios CLI - A CLI based AI Tool")
      .addCommand(login);

   program.action(() => {
      program.help();
   });

   program.parse();
}

main().catch((err) => {
   console.log(chalk.red("Error running Helios CLI"), err);
   process.exit(1);
});
