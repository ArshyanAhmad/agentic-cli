import express from "express";
const app = express();
import "dotenv/config";

const PORT = process.env.PORT || 3005;

app.get("/health", (req, res) => {
   res.send("Running");
});

app.listen(PORT, () => {
   console.log("Server is listening on port at:", PORT);
});
