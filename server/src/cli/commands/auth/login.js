import { cancel, confirm, intro, isCancel, outro } from "@clack/prompts";
import { deviceAuthorizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/client";
import { logger } from "better-auth";

import chalk from "chalk";
import { Command } from "commander";
import fs from "fs/promises";
import path from "path";
import os from "os";
import yoctoSpinner from "yocto-spinner";
