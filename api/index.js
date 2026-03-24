const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

let kv = null;

const getKv = async () => {
  if (!kv) {
    try {
      const { kv: vercelKv } = require('@vercel/kv');
      kv = vercelKv;
    } catch (e) {
      console.error('KV error:', e);
    }
  }
  return kv;
};

const readData = async () => {
  try {
    const kvClient = await getKv();
    if (!kvClient) return [];
    const data = await kvClient.get('cocktails');
    return data || [];
  } catch (e) {
    console.error('Read error:', e);
    return [];
  }
};

const writeData = async (data) => {
  const kvClient = await getKv();
  if (!kvClient) throw new Error('数据库未连接');
  await kvClient.set('cocktails', data);
};

app.get('/api/cocktails', async (req, res) => {
  try {
    const { search, tag } = req.query;
    let cocktails = await readData();
    
    if (search) {
      const searchTerm = search.toLowerCase();
      cocktails = cocktails.filter(c => 
        c.name?.toLowerCase().includes(searchTerm) ||
        c.name_en?.toLowerCase().includes(searchTerm) ||
        c.ingredients?.toLowerCase().includes(searchTerm) ||
        c.tags?.toLowerCase().includes(searchTerm)
      );
    }
    
    if (tag) {
      cocktails = cocktails.filter(c => 
        c.tags && c.tags.split(',').map(t => t.trim()).includes(tag)
      );
    }
    
    res.json(cocktails);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tags', async (req, res) => {
  try {
    const cocktails = await readData();
    const tagMap = {};
    
    cocktails.forEach(c => {
      if (c.tags) {
        c.tags.split(',').map(t => t.trim()).forEach(tag => {
          if (tag) {
            tagMap[tag] = (tagMap[tag] || 0) + 1;
          }
        });
      }
    });
    
    const tags = Object.entries(tagMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    
    res.json(tags);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/cocktails/:id', async (req, res) => {
  try {
    const cocktails = await readData();
    const cocktail = cocktails.find(c => c.id === parseInt(req.params.id));
    
    if (!cocktail) {
      return res.status(404).json({ error: '未找到该鸡尾酒' });
    }
    
    res.json(cocktail);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/cocktails', async (req, res) => {
  try {
    const { name, name_en, ingredients, steps, description, image, tags, link } = req.body;
    
    if (!name || !ingredients || !steps) {
      return res.status(400).json({ error: '名称、配料和步骤为必填项' });
    }
    
    const cocktails = await readData();
    const maxId = cocktails.reduce((max, c) => Math.max(max, c.id || 0), 0);
    
    const newCocktail = {
      id: maxId + 1,
      name,
      name_en: name_en || '',
      ingredients,
      steps,
      description: description || '',
      image: image || '',
      tags: tags || '',
      link: link || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    cocktails.push(newCocktail);
    await writeData(cocktails);
    
    res.json({ id: newCocktail.id, message: '添加成功' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/cocktails/:id', async (req, res) => {
  try {
    const { name, name_en, ingredients, steps, description, image, tags, link } = req.body;
    const id = parseInt(req.params.id);
    
    const cocktails = await readData();
    const index = cocktails.findIndex(c => c.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: '未找到该鸡尾酒' });
    }
    
    cocktails[index] = {
      ...cocktails[index],
      name,
      name_en: name_en || '',
      ingredients,
      steps,
      description: description || '',
      image: image || '',
      tags: tags || '',
      link: link || '',
      updated_at: new Date().toISOString()
    };
    
    await writeData(cocktails);
    res.json({ message: '更新成功' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/cocktails/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const cocktails = await readData();
    const index = cocktails.findIndex(c => c.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: '未找到该鸡尾酒' });
    }
    
    cocktails.splice(index, 1);
    await writeData(cocktails);
    
    res.json({ message: '删除成功' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/replace', async (req, res) => {
  try {
    const { findText, replaceText } = req.body;
    
    if (!findText || replaceText === undefined) {
      return res.status(400).json({ error: '查找文本和替换文本为必填项' });
    }
    
    const cocktails = await readData();
    let updateCount = 0;
    
    const fields = ['name', 'name_en', 'ingredients', 'steps', 'description', 'tags'];
    
    cocktails.forEach(cocktail => {
      let updated = false;
      
      fields.forEach(field => {
        if (cocktail[field] && cocktail[field].includes(findText)) {
          cocktail[field] = cocktail[field].split(findText).join(replaceText);
          updated = true;
        }
      });
      
      if (updated) {
        cocktail.updated_at = new Date().toISOString();
        updateCount++;
      }
    });
    
    await writeData(cocktails);
    res.json({ message: `成功替换 ${updateCount} 条记录` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/init', async (req, res) => {
  try {
    const existing = await readData();
    if (existing.length > 0) {
      return res.json({ message: '数据已存在', count: existing.length });
    }
    
    const sampleData = [
      {
        id: 1,
        name: "莫吉托",
        name_en: "Mojito",
        ingredients: "白朗姆酒 60ml\n青柠汁 30ml\n糖浆 20ml\n苏打水 适量\n薄荷叶 8-10片\n碎冰 适量",
        steps: "1. 将薄荷叶放入杯中，轻轻捣压释放香味\n2. 加入青柠汁和糖浆\n3. 倒入朗姆酒\n4. 加入碎冰至杯口\n5. 注入苏打水并轻轻搅拌\n6. 用薄荷枝和青柠片装饰",
        description: "古巴经典鸡尾酒，清爽宜人，是夏日必备饮品。",
        image: "",
        tags: "清爽, 朗姆酒, 夏季, 经典",
        link: ""
      },
      {
        id: 2,
        name: "玛格丽塔",
        name_en: "Margarita",
        ingredients: "龙舌兰酒 50ml\n橙皮利口酒 20ml\n青柠汁 25ml\n盐 适量（杯口）\n冰块 适量",
        steps: "1. 用青柠片润湿杯口，蘸取盐粒\n2. 将龙舌兰酒、橙皮利口酒和青柠汁加入摇酒器\n3. 加入冰块，充分摇匀\n4. 滤入已备好盐边的酒杯中\n5. 用青柠角装饰",
        description: "墨西哥风味鸡尾酒，酸甜平衡，是派对必备。",
        image: "",
        tags: "酸甜, 龙舌兰, 经典, 派对",
        link: ""
      }
    ];
    
    await writeData(sampleData);
    res.json({ message: '初始化数据成功', count: sampleData.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = app;