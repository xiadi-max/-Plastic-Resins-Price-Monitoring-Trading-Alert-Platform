import { FetchClient, Config } from 'coze-coding-dev-sdk';

const config = new Config();
const client = new FetchClient(config);

const url = 'https://coze-coding-project.tos.coze.site/create_attachment/2026-04-27/4355595683237527_5d9dc30c7bcc7b3150468d49b269574f_%E5%A1%91%E6%96%99%E7%BD%91%E7%AB%99.pdf?sign=4899367082-c885102eef-0-50e47c98312caa0ec7d048bd87a8fca70c7031893f59faaf059ba5ebb8382975';

async function main() {
  try {
    const response = await client.fetch(url);
    
    console.log('=== PDF 内容提取结果 ===');
    console.log(`状态: ${response.status_code === 0 ? '成功' : '失败'}`);
    console.log(`文件类型: ${response.filetype}`);
    console.log(`标题: ${response.title || '无标题'}`);
    console.log('\n=== 内容 ===\n');
    
    for (const item of response.content) {
      if (item.type === 'text') {
        console.log(item.text);
      } else if (item.type === 'image') {
        console.log(`[图片: ${item.image?.display_url || item.image?.image_url || '无URL'}]`);
      } else if (item.type === 'link') {
        console.log(`[链接: ${item.url}]`);
      }
    }
  } catch (error) {
    console.error('获取PDF内容失败:', error);
  }
}

main();
