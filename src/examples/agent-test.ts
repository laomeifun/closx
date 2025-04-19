import { shell } from '../mastra/agents/index';
import { chatWithAgent, multiTurnChat } from './utils/agent-utils';

/**
 * 简单的代理测试示例
 */
async function testAgent() {
  console.log('开始测试 Shell 代理...\n');

  try {
    // 单次对话测试
    console.log('===== 单次对话测试 =====');
    const singleResponse = await chatWithAgent(
      shell, 
      '显示当前目录下的所有文件', 
      { verbose: true }
    );  
    console.log('单次对话回复:', singleResponse.text);
    
    // // 流式输出测试
    // console.log('\n===== 流式输出测试 =====');
    // const streamResponse = await chatWithAgent(
    //   shell,
    //   '获取系统信息',
    //   { streamOutput: true, verbose: true }
    // );
    
    // // 多轮对话测试
    // console.log('\n===== 多轮对话测试 =====');
    // const messages = [
    //   '创建一个名为 test-dir 的目录',
    //   '在 test-dir 目录中创建一个名为 hello.txt 的文件，内容为 "Hello World"',
    //   '显示 hello.txt 的内容'
    // ];
    
    // const responses = await multiTurnChat(shell, messages, { verbose: true });
    
    console.log('\n测试完成！');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
testAgent().catch(console.error);
