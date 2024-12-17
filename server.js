const express = require("express");
const puppeteer = require("puppeteer");
const ytdl = require("ytdl-core");
const app = express();
const port = 3000;

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.get("/", (req, res) => {
  res.render("index", { titles: [], query: "" }); 
});

app.get("/search", async (req, res) => {
  const queryup = req.query.q || "nodejs+tutorial"; // Default query
  const query = encodeURI(queryup);

  try {
    // Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(`https://www.youtube.com/results?search_query=${query}`, {
      waitUntil: "domcontentloaded",
    });

    // Wait for the page to load the video thumbnails
    await page.waitForSelector("div#contents");

    // Extract the titles and links of the videos
    const titles = await page.evaluate(() => {
      return Array.from(
        document.querySelectorAll("ytd-video-renderer a#video-title")
      ).map((el) => ({
        title: el.getAttribute("title"),
        link: "https://www.youtube.com" + el.getAttribute("href"),
      }));
    });

    // Close the browser
    await browser.close();

    // Render the search results using EJS
    res.render("index", { titles, query: queryup });

  } catch (error) {
    console.error("Error while scraping YouTube:", error);
    res.status(500).send("An error occurred while scraping YouTube.");
  }
});

// New route for video download
app.get("/download", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl || !ytdl.validateURL(videoUrl)) {
    return res.status(400).send("Invalid or missing video URL.");
  }

  try {
    // Set the response type for video download
    res.header("Content-Disposition", "attachment; filename=video.mp4");
    res.header("Content-Type", "video/mp4");

    // Stream the video using ytdl-core
    ytdl(videoUrl, { format: "mp4" }).pipe(res);
  } catch (error) {
    console.error("Error while downloading video:", error);
    res.status(500).send("An error occurred while downloading the video.");
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});