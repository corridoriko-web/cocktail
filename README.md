# 鸡尾酒配方搜索网站

## 一键部署到 Vercel（免费）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/你的用户名/cocktail)

### 部署步骤

1. 点击上方按钮（或访问 https://vercel.com）
2. 使用 GitHub 账号登录
3. 导入此项目
4. 部署时会提示创建 KV 数据库，点击创建即可
5. 部署完成后获得公开网址

### 访问
- **前台**：`https://你的域名.vercel.app/` - 公开访问
- **后台**：`https://你的域名.vercel.app/#/admin` - 密码：`Jump123456`

---

## 功能

- 前台：搜索、浏览鸡尾酒配方
- 后台：添加、编辑、删除配方，批量替换文字

---

## 手动部署

```bash
# 安装依赖
npm install

# 构建
npm run build

# 部署到 Vercel
npx vercel
```