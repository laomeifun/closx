# 发布指南

本文档提供了如何将 CLOSX 发布到 GitHub Packages 的详细说明。

## 准备工作

1. 确保您拥有 GitHub 账号并且是 `laomeifun/closx` 仓库的管理员或拥有发布权限。

2. 创建 GitHub 个人访问令牌 (Personal Access Token, PAT)：
   - 访问 GitHub 设置 -> 开发者设置 -> 个人访问令牌 -> 生成新令牌
   - 选择 "Fine-grained tokens" 或 "Classic tokens"
   - 确保令牌具有以下权限：
     - `repo` (所有仓库权限)
     - `write:packages` (写入包权限)
     - `delete:packages` (删除包权限，可选)
   - 生成并保存令牌，您只能看到一次

3. 配置 npm 以使用 GitHub Packages：
   ```bash
   # 创建或编辑 ~/.npmrc 文件
   echo "@laomeifun:registry=https://npm.pkg.github.com" > ~/.npmrc
   echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" >> ~/.npmrc
   ```
   将 `YOUR_GITHUB_TOKEN` 替换为您刚刚创建的个人访问令牌。

## 发布流程

1. 确保您的代码已经提交并推送到 GitHub 仓库。

2. 确保 package.json 中的版本号已更新（如果需要）。

3. 构建项目并发布：
   ```bash
   npm run publish:github
   ```
   
   这个命令会执行以下操作：
   - 运行 `build:bundle` 脚本构建项目
   - 将包发布到 GitHub Packages

4. 发布成功后，您可以在 GitHub 仓库页面的 "Packages" 选项卡中看到已发布的包。

## 版本管理

如果需要手动更新版本号，可以使用以下命令：

```bash
# 补丁版本更新 (1.0.0 -> 1.0.1)
npm version patch

# 次要版本更新 (1.0.0 -> 1.1.0)
npm version minor

# 主要版本更新 (1.0.0 -> 2.0.0)
npm version major
```

然后执行发布命令：

```bash
npm run publish:github
```

## 故障排除

如果发布过程中遇到问题，请检查以下几点：

1. 确认您的 GitHub 个人访问令牌是否有效且具有正确的权限。
2. 确认 package.json 中的 "name" 字段格式正确（应为 `@laomeifun/closx`）。
3. 确认 package.json 中的 "publishConfig" 设置正确：
   ```json
   "publishConfig": {
     "registry": "https://npm.pkg.github.com",
     "access": "public"
   }
   ```
4. 确认您已登录到与 GitHub 账号关联的 npm 账号：
   ```bash
   npm login --registry=https://npm.pkg.github.com
   ```
   使用您的 GitHub 用户名作为用户名，个人访问令牌作为密码，您的电子邮件地址作为电子邮件。

## 安装已发布的包

安装说明可以在 README.md 文件中找到。用户需要配置他们的 npm 客户端以从 GitHub Packages 安装包。
