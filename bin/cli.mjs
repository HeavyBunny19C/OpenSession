#!/usr/bin/env node

import { initConfig } from "../src/config.mjs";

const config = initConfig();

// Dynamic import to ensure config is set before server loads
const { startServer } = await import("../src/server.mjs");
startServer(config);
