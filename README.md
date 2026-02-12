# 前灵镜 - 记忆存放空间

来自古剑奇谭三云无月的前灵境，一个存放记忆的神秘空间。

## 功能特性

- 深邃神秘的虚空背景，雾气缭绕
- 星光点点的记忆碎片
- 支持记忆的存入、查看、编辑、消散
- 多种情感分类
- 响应式设计，支持移动端

## 快速开始

### 本地开发

```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 访问 http://localhost:3000
```

### 服务器部署

#### Linux/macOS

```bash
# 安装Node.js (如果未安装)
# 使用nvm
nvm install node
nvm use node

# 安装依赖
npm install --production

# 使用PM2守护进程运行
npm install -g pm2
pm2 start server.js --name "qianlingjing"
pm2 startup
pm2 save

# 或者使用systemd
# 创建 /etc/systemd/system/qianlingjing.service
# 然后 systemctl enable qianlingjing && systemctl start qianlingjing
```

#### Windows

```bash
# 安装依赖
npm install

# 使用PM2
npm install -g pm2
pm2 start server.js --name "qianlingjing"
pm2 save

# 或者使用NSSM
nssm install qianlingjing "node" "server.js的完整路径"
nssm set qianlingjing AppDirectory "项目目录"
nssm set qianlingjing DisplayName "前灵镜-记忆存放"
nssm start qianlingjing
```

#### Docker部署

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# 构建和运行
docker build -t qianlingjing .
docker run -d -p 3000:3000 --name qianlingjing qianlingjing
```

## 环境变量

| 变量 | 说明 | 默认值 |
|-----|-----|-------|
| PORT | 服务器端口 | 3000 |

## 项目结构

```
前灵镜/
├── server.js          # 服务器入口
├── package.json       # 项目配置
├── memories.db        # SQLite数据库（运行后自动创建）
└── public/
    ├── index.html     # 主页面
    ├── css/
    │   └── style.css   # 样式文件
    └── js/
        └── app.js      # 前端逻辑
```

## API接口

| 方法 | 路径 | 说明 |
|-----|-----|-----|
| GET | /api/memories | 获取所有记忆 |
| GET | /api/memories/:id | 获取单个记忆 |
| POST | /api/memories | 创建新记忆 |
| PUT | /api/memories/:id | 更新记忆 |
| DELETE | /api/memories/:id | 消散记忆 |

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite (better-sqlite3)
- **前端**: 原生JavaScript + Canvas动画
- **样式**: CSS3 (动画、渐变、毛玻璃效果)

## 背景动画说明

项目使用Canvas实现以下动态效果：
- 深邃的紫色渐变夜空
- 缓慢飘动的雾气
- 闪烁的星光
- 漂浮的记忆碎片粒子

## 许可证

MIT
