import * as esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { chmod } from 'fs/promises';

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 构建配置选项
 * @type {esbuild.BuildOptions}
 */
const commonOptions = {
  entryPoints: ['src/cli/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  outdir: 'dist',
  minify: false,
};

/**
 * 构建ESM版本
 * @returns {Promise<void>}
 */
async function buildEsm() {
  await esbuild.build({
    ...commonOptions,
    format: 'esm',
    outExtension: { '.js': '.mjs' },
    plugins: [nodeExternalsPlugin()],
  });
  console.log('ESM 构建完成');
}

/**
 * 构建CJS版本
 * @returns {Promise<void>}
 */
async function buildCjs() {
  await esbuild.build({
    ...commonOptions,
    format: 'cjs',
    outExtension: { '.js': '.cjs' },
    plugins: [
      nodeExternalsPlugin({
        allowList: ['chalk', 'inquirer'], // 内联打包 chalk 和 inquirer
      }),
    ],
  });
  console.log('CJS 构建完成');
}

/**
 * 创建package.json配置文件
 * @returns {Promise<void>}
 */
async function createPackageExports() {
  // 确保dist目录存在
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
  }
  
  // 创建dist中的package.json
  const packageJson = {
    "type": "module",
    "main": "./index.cjs",
    "module": "./index.mjs",
    "exports": {
      ".": {
        "import": "./index.mjs",
        "require": "./index.cjs"
      }
    }
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'dist', 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  console.log('Package exports 创建完成');
}

/**
 * 设置bin/app.js的可执行权限
 * @returns {Promise<void>}
 */
async function setBinPermissions() {
  const binPath = path.join(__dirname, 'bin', 'app.js');
  try {
    await chmod(binPath, 0o755); // rwxr-xr-x
    console.log('已设置bin/app.js的可执行权限');
  } catch (error) {
    console.error('设置bin/app.js权限时出错:', error);
  }
}

/**
 * 主构建函数
 */
async function build() {
  try {
    // 确保dist目录存在并清空
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    fs.mkdirSync('dist');
    
    // 构建ESM和CJS版本
    await Promise.all([buildEsm(), buildCjs()]);
    
    // 创建package.json配置
    await createPackageExports();
    
    // 设置bin/app.js的可执行权限
    await setBinPermissions();
    
    console.log('所有构建任务完成！');
  } catch (error) {
    console.error('构建过程中出错:', error);
    process.exit(1);
  }
}

// 运行构建
build();
