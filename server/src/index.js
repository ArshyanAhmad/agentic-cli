import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();

app.use(
   cors({
      origin: "http://localhost:3000", // Replace with your frontend's origin
      methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
      credentials: true, // Allow credentials (cookies, authorization headers, etc.)
   }),
);

const PORT = process.env.PORT || 3005;
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

app.get("/api/me", async (req, res) => {
   const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
   });
   console.log("Headers", session);
   return res.json(session);
});

app.get("/health", (req, res) => {
   res.send("Running");
});

app.listen(PORT, () => {
   console.log("Server is listening on port at:", PORT);
});
