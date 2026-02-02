#!/usr/bin/env node

import "dotenv/config";
import chalk from "chalk";
import figlet from "figlet";

import { Command } from "commander";

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
      .description("Helios CLI - A command line tool for AI interactions");

   program.action(() => {
      program.help();
   });

   program.parse();
}

main().catch((err) => {
   console.log(chalk.red("Error running Helios CLI"), err);
   process.exit(1);
});
