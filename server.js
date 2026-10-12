
require("dotenv").config();

const express = require("express");
const path = require("path");
const Groq = require("groq-sdk");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

if (!process.env.GROQ_API_KEY) {
  console.error("Please add GROQ_API_KEY to your .env file");
  process.exit(1);
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

const products = [
  { id: 1, name: "Sheep Gift", category: "Meat", price: 180, image: "https://images.unsplash.com/photo-1484557985045-edf25e08da73?auto=format&fit=crop&w=700&q=80" },
  { id: 2, name: "Goat Gift", category: "Meat", price: 150, image: "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=700&q=80" },
  { id: 4, name: "Cow Gift", category: "Meat", price: 480, image: "https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&w=700&q=80" },
  { id: 5, name: "Chicken Package", category: "Food", price: 65, image: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=700&q=80" },
  { id: 6, name: "Eggs (30 Pieces)", category: "Food", price: 12, image: "https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=700&q=80" },
  { id: 7, name: "Fresh Food Basket", category: "Food", price: 35, image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=700&q=80" },
  { id: 8, name: "Red Rose Bouquet", category: "Flowers", price: 40, image: "https://images.unsplash.com/photo-1494972308805-463bc619d34e?auto=format&fit=crop&w=700&q=80" },
  { id: 9, name: "Mixed Flower Bouquet", category: "Flowers", price: 45, image: "https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=700&q=80" },
  { id: 10, name: "Birthday Cake", category: "Cakes & Bakery", price: 35, image: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=700&q=80" },
  { id: 11, name: "Biscuits Gift Box", category: "Cakes & Bakery", price: 15, image: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?auto=format&fit=crop&w=700&q=80" },
  { id: 12, name: "Wine Gift", category: "Gifts", price: 50, image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=700&q=80" },
  { id: 13, name: "Women's Perfume", category: "Perfume", price: 135, image: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=700&q=80" },
  { id: 14, name: "Men's Perfume", category: "Perfume", price: 150, image: "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=700&q=80" },
  { id: 15, name: "Surprise Gift Basket", category: "Gifts", price: 105, image: "https://images.unsplash.com/photo-1513201099705-a9746e1e201f?auto=format&fit=crop&w=700&q=80" },
  { id: 16, name: "Fresh Onions", category: "Vegetables", price: 5, image: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=700&q=80" },
  { id: 17, name: "Fresh Tomatoes", category: "Vegetables", price: 6, image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=700&q=80" }
];

// Add more products as needed.
// Replace any invalid image URL with a real image URL.

const promotions = [];

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    model: process.env.GROQ_MODEL || "openai/gpt-oss-20b"
  });
});

app.get("/api/products", (req, res) => {
  const search = String(req.query.search || "").toLowerCase().trim();
  const category = String(req.query.category || "").toLowerCase().trim();

  const filtered = products.filter(product => {
    const matchesSearch =
      !search ||
      product.name.toLowerCase().includes(search) ||
      product.category.toLowerCase().includes(search);

    const matchesCategory =
      !category ||
      category === "all" ||
      product.category.toLowerCase() === category;

    return matchesSearch && matchesCategory;
  });

  res.json({ success: true, count: filtered.length, products: filtered });
});

app.get("/api/promotions", (req, res) => {
  res.json({ success: true, promotions });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();

    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Please enter a message."
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        success: false,
        error: "Message is too long."
      });
    }

    const catalogue = products.map(p => ({
      name: p.name,
      category: p.category,
      priceUSD: p.price
    }));

    
const languageHint = /[\u1200-\u137F]/.test(message)
  ? "The customer is writing in Tigrinya. Reply in Eritrean Tigrinya."
  : "Reply in the language used by the customer.";

const systemPrompt = `
You are the friendly shopping assistant for Hiyab Surprise Deliver.
The business helps people send gifts and products to family and friends in Eritrea.

LANGUAGE:
${languageHint}

If the customer writes in Tigrinya:
- Reply in clear, simple, natural Eritrean Tigrinya.
- Do not use Amharic.
- Do not translate English word-for-word into unnatural Tigrinya.
- Use short sentences and familiar everyday words.
- Do not repeat the same sentence or question.
- If you cannot express something clearly in Tigrinya, use a shorter, simpler sentence.
- Do not produce long or confusing paragraphs.
- Use simple, everyday Eritrean Tigrinya.
- Prefer short, grammatically correct sentences.
- Do not invent Tigrinya words or produce confusing phrases.
- If unsure how to phrase something in Tigrinya, use a simple greeting and ask one clear question.
- For birthday gifts, ask: "እቲ ህያብ ንመን እዩ? ኬክ ወይ ካልእ ህያብ ትደልዩ?"
- Never repeat the same question.

If the customer writes in English, reply in English.

GREETING:
Tigrinya: "ሰላም፣ እንቃዕ ናብ Hiyab Surprise Deliver መጻእኩም። ❤️"
English: "Hello! Welcome to Hiyab Surprise Deliver. ❤️"

HOW TO HELP:
- Be friendly, polite, and helpful.
- Answer the customer's actual question.
- Help customers choose gifts for birthdays, weddings, engagements,
  baptisms, holidays, and other special occasions.
- Ask only one short follow-up question when needed.
- Recommend products only from the catalogue below.
- Include prices when useful, clearly identifying them as USD.
- Keep each reply short, normally 2 to 5 sentences.

PRODUCT CATALOGUE:
${JSON.stringify(catalogue)}

PRICES AND PROMOTIONS:
The listed prices are example USD prices and must be confirmed before ordering.
Recorded promotions: ${JSON.stringify(promotions)}

BUSINESS RULES:
- Never invent products, prices, discounts, stock, delivery dates, or payment confirmations.
- Never claim a discount exists unless it appears in the recorded promotions.
- If no promotion is recorded, explain that no promotion has been confirmed.
- If a requested product is not listed, say the business needs to confirm whether it is available.
- Do not claim an order has been placed or paid for.
- Do not repeat greetings unnecessarily in every reply.
`;



    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    res.json({
      success: true,
      reply: completion.choices[0]?.message?.content ||
        "Sorry, please try again."
    });
  } catch (error) {
    console.error("Groq chat error:", error.message);
    res.status(500).json({
      success: false,
      error: "The assistant is temporarily unavailable. Please try again."
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Hiyab Surprise Deliver: http://localhost:${PORT}`);
  console.log(`Products API: http://localhost:${PORT}/api/products`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
});
