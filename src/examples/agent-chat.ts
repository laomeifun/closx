import { shell } from '../mastra/agents/index';

/**
 * 示例：与 Weather Agent 进行对话
 * 
 * 这个示例展示了如何使用 Mastra 的 Agent 进行对话
 */
async function chatWithAgent() {
  console.log('开始与 Shell Agent 对话...\n');

  try {
    // 方法 1: 使用 generate 方法进行单次对话
    console.log('===== 单次对话示例 =====');
    const response = await shell.generate([
      { role: 'user', content: '当前环境信息' }
    ]);
    console.log('Agent 回复:', response.text);
    console.log('\n');

    // // 方法 2: 使用 stream 方法进行流式对话
    // console.log('===== 流式对话示例 =====');
    // const stream = await shell.stream([
    //   { role: 'user', content: '生成一个在当前目录下创建一个名为 test.txt 的空文件的命令' }
    // ]);

    // console.log('Agent 正在回复:');
    // let fullResponse = '';
    // for await (const chunk of stream.textStream) {
    //   process.stdout.write(chunk); // 实时打印每个文本块
    //   fullResponse += chunk;
    // }
    // console.log('\n\n完整回复已保存到变量中，长度:', fullResponse.length);

    // // 方法 3: 多轮对话示例
    // console.log('\n===== 多轮对话示例 =====');
    // // 创建资源ID和线程ID来维持对话上下文
    // const resourceId = 'shell-resource-' + Date.now();
    // const threadId = 'shell-conversation-' + Date.now();
    
    // // 第一轮对话
    // const conversation1 = await shell.stream(
    //   [{ role: 'user', content: '生成一个在当前目录下创建一个名为 test.txt 的空文件的命令' }],
    //   { resourceId, threadId }
    // );
    
    // console.log('用户: 生成一个在当前目录下创建一个名为 test.txt 的空文件的命令');
    // console.log('Agent 回复:');
    // for await (const chunk of conversation1.textStream) {
    //   process.stdout.write(chunk);
    // }
    
    // // 第二轮对话 (使用相同的 resourceId 和 threadId 来维持上下文)
    // console.log('\n\n用户: 生成一个在当前目录下创建一个名为 test.txt 的空文件的命令');
    // const conversation2 = await shell.stream(
    //   [{ role: 'user', content: '生成一个在当前目录下创建一个名为 test.txt 的空文件的命令' }],
    //   { resourceId, threadId }
    // );
    
    // console.log('Agent 回复:');
    // for await (const chunk of conversation2.textStream) {
    //   process.stdout.write(chunk);
    // }
    
    // console.log('\n\n对话示例完成');
    
  } catch (error) {
    console.error('对话过程中出现错误:', error);
  }
}

// 执行示例
chatWithAgent().catch(console.error);
