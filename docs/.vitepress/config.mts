import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "XFBrowser",
  description: "Where simple browsing shines!",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: '主页', link: '/' },
      { text: '下载', link: '/download' },
      { text: '贡献', link: '/contribute' },
      { text: '交流', link: 'https://xfbrowser.discourse.group' }
    ],

    sidebar: [
      {
        text: 'XFBrowser 文档',
        items: [
          { text: '下载', link: '/download' },
          { text: '贡献', link: '/contribute' },
          { text: '交流', link: 'https://xfbrowser.discourse.group' },
          { text: '更新日志', link: '/changelog' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ZhouyiStudio/XFBrowser-Desktop' },
      { icon: 'qq', link: 'https://qm.qq.com/cgi-bin/qm/qr?k=473450426' }
    ]
  }
})
