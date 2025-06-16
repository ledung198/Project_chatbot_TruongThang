const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

// WooCommerce base config
const WC_URL = process.env.WC_URL;
const WC_KEY = process.env.WC_KEY;
const WC_SECRET = process.env.WC_SECRET;

const wooClient = axios.create({
  baseURL: `${WC_URL}/wp-json/wc/v3/`,
  auth: {
    username: WC_KEY,
    password: WC_SECRET
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;

  try {
    // 1️⃣ Gọi OpenAI
    const openaiResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: message }]
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        }
      }
    );
    const gptReply = openaiResponse.data.choices[0].message.content;

    // 2️⃣ Lấy sản phẩm từ WooCommerce
    const productsResponse = await wooClient.get('products', {
      params: {
        per_page: 5,
        orderby: 'date',
        order: 'desc'
      }
    });

    const products = productsResponse.data.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.images[0]?.src || '',
      link: p.permalink
    }));

    // 3️⃣ Trả về cả 2
    res.json({
      reply: gptReply,
      products: products
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.toString() });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
