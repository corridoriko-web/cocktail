const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

let redis = null;
let localData = [];

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const { Redis } = require('@upstash/redis');
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

const readData = async () => {
  try {
    if (redis) {
      const data = await redis.get('cocktails');
      return data || [];
    }
    return localData;
  } catch (e) {
    console.error('Read error:', e);
    return localData;
  }
};

const writeData = async (data) => {
  if (redis) {
    await redis.set('cocktails', data);
  } else {
    localData = data;
  }
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
      },
      {
        id: 3,
        name: "长岛冰茶",
        name_en: "Long Island Iced Tea",
        ingredients: "伏特加 15ml\n白朗姆酒 15ml\n金酒 15ml\n龙舌兰酒 15ml\n橙皮利口酒 15ml\n柠檬汁 25ml\n糖浆 10ml\n可乐 适量\n冰块 适量",
        steps: "1. 将所有酒类倒入摇酒器\n2. 加入柠檬汁和糖浆\n3. 加入冰块摇匀\n4. 倒入装满冰块的高杯\n5. 注入可乐至八分满\n6. 轻轻搅拌，用柠檬片装饰",
        description: "经典长饮，酒精度较高但口感顺滑，需适量饮用。",
        image: "",
        tags: "烈酒, 经典, 派对, 夏季",
        link: ""
      },
      {
        id: 4,
        name: "威士忌酸",
        name_en: "Whiskey Sour",
        ingredients: "波本威士忌 60ml\n柠檬汁 25ml\n糖浆 20ml\n蛋白 1个\n安哥斯图拉苦精 2滴\n冰块 适量",
        steps: "1. 将威士忌、柠檬汁、糖浆和蛋白加入摇酒器\n2. 不加冰干摇15秒乳化蛋白\n3. 加入冰块，再摇15秒\n4. 双重过滤倒入冰镇酒杯\n5. 滴上苦精装饰",
        description: "经典酸味鸡尾酒，蛋白带来丝滑口感。",
        image: "",
        tags: "酸甜, 威士忌, 经典",
        link: ""
      },
      {
        id: 5,
        name: "马天尼",
        name_en: "Martini",
        ingredients: "金酒 60ml\n干味美思酒 10ml\n柠檬皮 1片\n橄榄 1-2颗\n冰块 适量",
        steps: "1. 将金酒和味美思倒入调酒杯\n2. 加入大量冰块\n3. 用吧勺搅拌30秒\n4. 滤入冰镇马天尼杯\n5. 用柠檬皮扭出香油，投入杯中\n6. 可选：用橄榄装饰",
        description: "鸡尾酒之王，优雅简约，调制手法决定风味。",
        image: "",
        tags: "经典, 金酒, 烈酒",
        link: ""
      },
      {
        id: 6,
        name: "莫斯科骡子",
        name_en: "Moscow Mule",
        ingredients: "伏特加 50ml\n青柠汁 15ml\n姜味啤酒 120ml\n青柠角 1个\n冰块 适量",
        steps: "1. 在铜杯中装满冰块\n2. 倒入伏特加\n3. 挤入青柠汁，将青柠角投入杯中\n4. 注入姜味啤酒\n5. 轻轻搅拌\n6. 用青柠角装饰",
        description: "清爽辛辣，传统上使用铜杯盛装。",
        image: "",
        tags: "清爽, 伏特加, 夏季",
        link: ""
      },
      {
        id: 7,
        name: "龙舌兰日出",
        name_en: "Tequila Sunrise",
        ingredients: "龙舌兰酒 45ml\n橙汁 90ml\n红石榴糖浆 15ml\n橙片 1片\n冰块 适量",
        steps: "1. 在高杯中装满冰块\n2. 倒入龙舌兰酒\n3. 注入橙汁，轻轻搅拌\n4. 沿杯壁缓缓倒入红石榴糖浆\n5. 使其沉底形成渐变效果\n6. 用橙片装饰",
        description: "视觉效果惊艳的鸡尾酒，如日出般美丽。",
        image: "",
        tags: "果味, 龙舌兰, 夏季, 派对",
        link: ""
      },
      {
        id: 8,
        name: "尼格罗尼",
        name_en: "Negroni",
        ingredients: "金酒 30ml\n金巴利 30ml\n甜味美思 30ml\n橙皮 1片\n冰块 适量",
        steps: "1. 在古典杯中装满冰块\n2. 倒入金酒、金巴利和甜味美思\n3. 用吧勺搅拌30秒\n4. 用橙皮扭出香油，投入杯中",
        description: "意大利经典，苦甜平衡，适合慢慢品味。",
        image: "",
        tags: "苦甜, 经典, 金酒, 意式",
        link: ""
      },
      {
        id: 9,
        name: "新加坡司令",
        name_en: "Singapore Sling",
        ingredients: "金酒 30ml\n樱桃利口酒 15ml\n君度 10ml\n班尼迪克汀 10ml\n菠萝汁 60ml\n柠檬汁 15ml\n红石榴糖浆 10ml\n安哥斯图拉苦精 1滴\n苏打水 适量\n冰块 适量",
        steps: "1. 将所有材料（除苏打水）加入摇酒器\n2. 加入冰块充分摇匀\n3. 滤入装满冰块的高杯\n4. 注入苏打水\n5. 用菠萝片和樱桃装饰",
        description: "新加坡莱佛士酒店的招牌鸡尾酒，果香浓郁。",
        image: "",
        tags: "果味, 金酒, 经典, 夏季",
        link: ""
      },
      {
        id: 10,
        name: "曼哈顿",
        name_en: "Manhattan",
        ingredients: "黑麦威士忌 60ml\n甜味美思 30ml\n安哥斯图拉苦精 2滴\n樱桃 1颗\n冰块 适量",
        steps: "1. 将威士忌、味美思和苦精倒入调酒杯\n2. 加入冰块搅拌30秒\n3. 滤入冰镇的鸡尾酒杯\n4. 用樱桃装饰",
        description: "经典威士忌鸡尾酒，优雅而醇厚。",
        image: "",
        tags: "经典, 威士忌, 烈酒",
        link: ""
      },
      {
        id: 11,
        name: "金汤力",
        name_en: "Gin Tonic",
        ingredients: "金酒 45ml\n汤力水 120ml\n青柠角 1个\n冰块 适量",
        steps: "1. 在高杯中装满冰块\n2. 倒入金酒\n3. 注入汤力水\n4. 轻轻搅拌\n5. 挤入青柠汁，将青柠角投入杯中",
        description: "简单经典，清爽解渴，是最受欢迎的长饮之一。",
        image: "",
        tags: "清爽, 金酒, 夏季, 简单",
        link: ""
      },
      {
        id: 12,
        name: "古典鸡尾酒",
        name_en: "Old Fashioned",
        ingredients: "波本威士忌 60ml\n方糖 1块\n安哥斯图拉苦精 2-3滴\n苏打水 少许\n橙皮 1片\n冰块 适量",
        steps: "1. 将方糖放入古典杯\n2. 滴上苦精和少许苏打水\n3. 用吧勺捣碎方糖\n4. 加入大冰块\n5. 倒入威士忌\n6. 用橙皮扭出香油，投入杯中装饰",
        description: "最古老的鸡尾酒之一，简单而经典。",
        image: "",
        tags: "经典, 威士忌, 烈酒",
        link: ""
      },
      {
        id: 13,
        name: "代基里",
        name_en: "Daiquiri",
        ingredients: "白朗姆酒 60ml\n青柠汁 25ml\n糖浆 20ml\n冰块 适量",
        steps: "1. 将所有材料加入摇酒器\n2. 加入冰块充分摇匀\n3. 双重过滤倒入冰镇鸡尾酒杯\n4. 可用青柠片装饰",
        description: "海明威的最爱，简单纯粹的朗姆鸡尾酒。",
        image: "",
        tags: "清爽, 朗姆酒, 经典, 酸甜",
        link: ""
      },
      {
        id: 14,
        name: "大都会",
        name_en: "Cosmopolitan",
        ingredients: "伏特加 45ml\n君度 15ml\n青柠汁 15ml\n蔓越莓汁 30ml\n冰块 适量",
        steps: "1. 将所有材料加入摇酒器\n2. 加入冰块充分摇匀\n3. 双重过滤倒入冰镇马天尼杯\n4. 用橙皮或青柠片装饰",
        description: "时尚经典，粉红迷人，深受女性喜爱。",
        image: "",
        tags: "果味, 伏特加, 派对, 酸甜",
        link: ""
      },
      {
        id: 15,
        name: "蓝色夏威夷",
        name_en: "Blue Hawaii",
        ingredients: "白朗姆酒 30ml\n蓝橙力娇酒 15ml\n椰奶 30ml\n菠萝汁 60ml\n冰块 适量\n菠萝片 1片",
        steps: "1. 将所有材料加入摇酒器\n2. 加入冰块充分摇匀\n3. 倒入装满碎冰的飓风杯\n4. 用菠萝片和樱桃装饰\n5. 插入吸管享用",
        description: "热带风情，蓝色迷人，夏日的完美选择。",
        image: "",
        tags: "果味, 朗姆酒, 夏季, 派对",
        link: ""
      },
      {
        id: 16,
        name: "白色俄罗斯",
        name_en: "White Russian",
        ingredients: "伏特加 45ml\n咖啡利口酒 30ml\n淡奶油 30ml\n冰块 适量",
        steps: "1. 在古典杯中装满冰块\n2. 倒入伏特加和咖啡利口酒\n3. 缓缓倒入淡奶油\n4. 可选择搅拌或保持分层效果",
        description: "浓郁香甜，咖啡与奶香的完美融合。",
        image: "",
        tags: "甜, 伏特加, 咖啡",
        link: ""
      },
      {
        id: 17,
        name: "亚历山大",
        name_en: "Brandy Alexander",
        ingredients: "白兰地 30ml\n可可利口酒 30ml\n淡奶油 30ml\n肉豆蔻粉 少许\n冰块 适量",
        steps: "1. 将白兰地、可可利口酒和淡奶油加入摇酒器\n2. 加入冰块充分摇匀\n3. 双重过滤倒入冰镇鸡尾酒杯\n4. 撒上肉豆蔻粉装饰",
        description: "经典甜味鸡尾酒，丝滑浓郁。",
        image: "",
        tags: "甜, 白兰地, 经典",
        link: ""
      },
      {
        id: 18,
        name: "皮斯科酸",
        name_en: "Pisco Sour",
        ingredients: "皮斯科酒 60ml\n青柠汁 30ml\n糖浆 20ml\n蛋白 1个\n安哥斯图拉苦精 3滴\n冰块 适量",
        steps: "1. 将皮斯科、青柠汁、糖浆和蛋白加入摇酒器\n2. 不加冰干摇15秒\n3. 加入冰块再摇15秒\n4. 双重过滤倒入酒杯\n5. 滴上苦精，用牙签画出花纹",
        description: "秘鲁和智利的国饮，泡沫细腻。",
        image: "",
        tags: "酸甜, 经典, 南美",
        link: ""
      },
      {
        id: 19,
        name: "薄荷朱利酒",
        name_en: "Mint Julep",
        ingredients: "波本威士忌 60ml\n薄荷叶 8-10片\n糖浆 15ml\n碎冰 适量\n薄荷枝 1支",
        steps: "1. 将薄荷叶和糖浆放入杯底\n2. 轻轻捣压释放薄荷香气\n3. 加入波本威士忌\n4. 填满碎冰\n5. 用勺子搅拌使杯壁结霜\n6. 用薄荷枝装饰",
        description: "美国南方经典，肯塔基德比的官方饮品。",
        image: "",
        tags: "清爽, 威士忌, 夏季, 经典",
        link: ""
      },
      {
        id: 20,
        name: "迈泰",
        name_en: "Mai Tai",
        ingredients: "白朗姆酒 30ml\n黑朗姆酒 30ml\n橙皮利口酒 15ml\n杏仁糖浆 15ml\n青柠汁 30ml\n青柠角 1个\n冰块 适量",
        steps: "1. 将所有材料加入摇酒器\n2. 加入冰块充分摇匀\n3. 倒入装满碎冰的古典杯\n4. 用青柠角和薄荷装饰",
        description: "波利尼西亚风情，热带度假必备。",
        image: "",
        tags: "果味, 朗姆酒, 夏季, 派对",
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

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}